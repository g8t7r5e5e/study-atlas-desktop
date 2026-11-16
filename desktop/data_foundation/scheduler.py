"""Deterministic minute-based draft scheduling, validation and change previews.

Local-day free windows are already net of commitments/buffers. No timezone
conversion or account writes happen here. Greedy failure is never an
infeasibility proof. All generated assignments pass an independent validator.
"""
import hashlib
import json
from collections import defaultdict
from datetime import date
from .feasibility import check, day, minute

SCHEMA = 'study-atlas-draft-plan/v1'


def absolute(d, m):
    return date.fromisoformat(d).toordinal() * 1440 + m


def segment(key, start, end):
    ordinal, local = divmod(start, 1440)
    return {'task_id':key, 'date':date.fromordinal(ordinal).isoformat(),
            'start_minute':local, 'end_minute':local + end - start}


def interval(row):
    d=day(row['date']);start=minute(row['start_minute']);end=minute(row['end_minute'])
    if not 0<=start<end<=1440:raise ValueError('Invalid assignment interval')
    return absolute(d,start),absolute(d,end)


def normalized(rows):
    return sorted([dict(task_id=r['task_id'],date=r['date'],
                        start_minute=r['start_minute'],end_minute=r['end_minute']) for r in rows],
                  key=lambda r:(r['date'],r['start_minute'],r['end_minute'],r['task_id']))


def inputs(tasks, windows):
    """Shared structural validation only; placement validation is separate."""
    if not isinstance(tasks,list) or not isinstance(windows,list):raise ValueError('Tasks/windows must be lists')
    for t in tasks:
        minute(t['minutes'])
        if not t.get('completed',False) and t['minutes']==0:raise ValueError('Zero-work tasks must be marked completed')
        parents=t.get('prerequisites',[])
        if not isinstance(parents,list) or any(not isinstance(p,str) for p in parents) or len(parents)!=len(set(parents)):
            raise ValueError('Invalid prerequisites')
        if 'priority' in t and (type(t['priority']) is not int):raise ValueError('Priority must be an integer')
        if 'source_sequence' in t and type(t['source_sequence']) is not int:raise ValueError('Source sequence must be an integer')
    bounds=check(tasks,windows)
    return {t['id']:t for t in tasks},bounds


def validate(tasks,windows,assignments,*,locks=None,require_complete=True):
    """Independently verify durations, free windows, overlaps, order and locks.

    Completed work is separate history, not new capacity. Partial drafts may
    omit whole tasks; assigning a child without its unfinished parent is invalid.
    """
    known,_=inputs(tasks,windows);issues=[];grouped=defaultdict(list)
    slots=[(absolute(w['date'],w['start_minute']),absolute(w['date'],w['end_minute'])) for w in windows]
    placed=[]
    for row in assignments:
        start,end=interval(row);key=row['task_id']
        if key not in known:
            issues.append({'kind':'unknown_task','task_id':key});continue
        t=known[key]
        if t.get('completed',False):issues.append({'kind':'completed_task_rescheduled','task_id':key})
        if not any(s<=start<end<=e for s,e in slots):issues.append({'kind':'outside_free_window','task_id':key})
        if row['date']>t['deadline'] or row['date']<t.get('release_date','0001-01-01'):
            issues.append({'kind':'outside_task_dates','task_id':key})
        grouped[key].append((start,end));placed.append((start,end,key))
    placed.sort()
    latest=None
    for start,end,key in placed:
        if latest and start<latest[0]:issues.append({'kind':'overlapping_assignments','task_id':key,'other_task_id':latest[1]})
        if latest is None or end>latest[0]:latest=(end,key)
    for key,t in known.items():
        if t.get('completed',False):continue
        rows=grouped[key]
        if not rows:
            if require_complete:issues.append({'kind':'unscheduled_task','task_id':key})
            continue
        if t.get('needs_page_allocation'):issues.append({'kind':'unresolved_page_allocation','task_id':key})
        if sum(e-s for s,e in rows)!=t['minutes']:issues.append({'kind':'wrong_duration','task_id':key})
        if not t.get('splittable',False) and len(rows)!=1:issues.append({'kind':'unapproved_split','task_id':key})
        for parent in t.get('prerequisites',[]):
            if known[parent].get('completed',False):continue
            if not grouped[parent]:issues.append({'kind':'missing_prerequisite','task_id':key,'prerequisite':parent})
            elif max(e for s,e in grouped[parent])>min(s for s,e in rows):
                issues.append({'kind':'prerequisite_order','task_id':key,'prerequisite':parent})
    expected=defaultdict(list)
    for row in locks or []:expected[row['task_id']].append(row)
    for key,rows in expected.items():
        actual=[r for r in assignments if r['task_id']==key]
        if normalized(rows)!=normalized(actual):issues.append({'kind':'lock_changed','task_id':key})
    return {'valid':not issues,'issues':issues}


def subtract(free,start,end):
    """Reserve a single interval wholly contained in one free interval."""
    for i,(s,e) in enumerate(free):
        if s<=start<end<=e:
            free[i:i+1]=([(s,start)] if s<start else [])+([(end,e)] if end<e else [])
            return True
    return False


def propose(tasks,windows,*,locks=None,previous=None):
    """Create an unapplied draft. previous is a prior draft from this engine.

    Caller supplies only future free windows when replanning. Completed history
    is retained from previous without consuming future time. Locks must specify
    all remaining work of each locked task; partial locking is rejected.
    """
    known,bounds=inputs(tasks,windows)
    tasks=sorted(tasks,key=lambda t:t['id'])
    windows=sorted(windows,key=lambda w:(w['date'],w['start_minute'],w['end_minute']))
    locks=normalized(locks or [])
    if previous is not None:
        if previous.get('schema_version')!=SCHEMA:raise ValueError('Unsupported previous plan')
        if not isinstance(previous.get('plan_id'),str) or not previous['plan_id']:raise ValueError('Missing previous plan ID')
        for r in previous.get('assignments',[]):interval(r)
        for r in previous.get('completed_history',[]):interval(r)
        for r in previous.get('locks',[]):
            interval(r)
            if r['task_id'] not in known:raise ValueError('Previous lock refers to omitted task')
            if not known[r['task_id']].get('completed',False):locks.append(r)
        for r in previous.get('completed_history',[]):
            if r['task_id'] in known and not known[r['task_id']].get('completed',False):
                raise ValueError('Completed history cannot be reopened silently')
    # Inherited locks remain hard even when the new caller omits the locks field.
    locks=normalized([dict(zip(('task_id','date','start_minute','end_minute'),key)) for key in
                      {tuple(r[k] for k in ('task_id','date','start_minute','end_minute')) for r in locks}])
    prior=normalized(previous.get('assignments',[])) if previous else []
    # Retain the old planned intervals for explicitly completed tasks. These are
    # planned history, not measured actual study time. Never infer completion.
    history=normalized(previous.get('completed_history',[])) if previous else []
    history += [r for r in prior if r['task_id'] in known and known[r['task_id']].get('completed',False)]
    history=normalized([dict(zip(('task_id','date','start_minute','end_minute'),key)) for key in
                        {tuple(r[k] for k in ('task_id','date','start_minute','end_minute')) for r in history}])
    if any(r['task_id'] not in known for r in prior):raise ValueError('Previous plan contains omitted tasks; explicitly retain or mark them completed')
    active={k:t for k,t in known.items() if not t.get('completed',False)}
    lock_check=validate(tasks,windows,locks,require_complete=False)
    # A locked child may rely on an unlocked parent that will be allocated below.
    lock_errors=[i for i in lock_check['issues'] if i['kind']!='missing_prerequisite']
    if any(r['task_id'] not in active for r in locks):raise ValueError('Lock must refer to an unfinished task')
    all_issues=list(bounds['issues'])+lock_errors
    unresolved=[u for u in bounds['unresolved'] if u['task_id'] in active]
    grouped_locks=defaultdict(list)
    for r in locks:grouped_locks[r['task_id']].append(r)
    due=bounds['effective_deadlines']
    # Every ancestor of a locked task must finish before that lock starts.
    cutoff={k:absolute(due[k],1440) for k in active}
    def constrain(key,limit):
        todo=[(key,limit)];seen={}
        while todo:
            current,value=todo.pop()
            if current not in active or seen.get(current,float('inf'))<=value:continue
            seen[current]=value;cutoff[current]=min(cutoff[current],value)
            todo.extend((p,cutoff[current]) for p in known[current].get('prerequisites',[]))
    for key,rows in grouped_locks.items():
        for parent in known[key].get('prerequisites',[]):constrain(parent,min(interval(r)[0] for r in rows))

    def allocate(preserve):
        free=[(absolute(w['date'],w['start_minute']),absolute(w['date'],w['end_minute'])) for w in windows]
        original=list(free)
        assigned=list(locks);finish={k:max(interval(r)[1] for r in rows) for k,rows in grouped_locks.items()}
        for r in locks:
            if not subtract(free,*interval(r)):return [],list(active)
        pending=set(active)-finish.keys();failed=[];held={}
        # Soft-reserve usable old assignments before displaced work competes for
        # their slots. They can still be released if dependencies changed.
        if preserve:
            for key in sorted(pending):
                t=active[key];rows=[r for r in prior if r['task_id']==key];candidate=list(free)
                ready=absolute(t.get('release_date','0001-01-01'),0)
                if rows and (t.get('splittable',False) or len(rows)==1) and sum(interval(r)[1]-interval(r)[0] for r in rows)==t['minutes']:
                    if all(ready<=interval(r)[0]<interval(r)[1]<=cutoff[key] and subtract(candidate,*interval(r)) for r in rows):
                        held[key]=rows;free=candidate

        def release(rows):
            restored=sorted(free+[interval(r) for r in rows]);merged=[]
            for s,e in restored:
                if merged and merged[-1][1]==s and any(a<=merged[-1][0] and e<=b for a,b in original):
                    merged[-1]=(merged[-1][0],e)
                else:merged.append((s,e))
            return merged

        while pending:
            eligible=[k for k in pending if all(p not in active or p in finish for p in known[k].get('prerequisites',[]))]
            if not eligible:failed.extend(sorted(pending));break
            key=min(eligible,key=lambda k:(cutoff[k],-known[k].get('priority',0),known[k].get('source_sequence',0),k))
            t=active[key];pending.remove(key)
            free=release(held.pop(key,[]))
            ready=max([absolute(t.get('release_date','0001-01-01'),0)]+[finish[p] for p in t.get('prerequisites',[]) if p in finish])
            rows=[r for r in prior if r['task_id']==key] if preserve else []
            chosen=[];candidate=list(free)
            if rows and (t.get('splittable',False) or len(rows)==1) and sum(interval(r)[1]-interval(r)[0] for r in rows)==t['minutes']:
                if all(ready<=interval(r)[0]<interval(r)[1]<=cutoff[key] and subtract(candidate,*interval(r)) for r in rows):chosen=rows
            if not chosen:
                candidate=list(free);remaining=t['minutes']
                for s,e in free:
                    s=max(s,ready);e=min(e,cutoff[key])
                    if e<=s:continue
                    if not t.get('splittable',False) and e-s<remaining:continue
                    take=min(remaining,e-s);chosen.append(segment(key,s,s+take));remaining-=take
                    subtract(candidate,s,s+take)
                    if not remaining:break
                if remaining:chosen=[]
            if chosen:
                assigned.extend(chosen);free=candidate;finish[key]=max(interval(r)[1] for r in chosen)
            else:failed.append(key)
        return normalized(assigned),sorted(failed)

    assignments=[];unscheduled=sorted(active);validation={'valid':False,'issues':[]};mode='not_run'
    if not all_issues and not unresolved:
        assignments,unscheduled=allocate(True);mode='preserve_previous'
        if unscheduled and prior:
            fallback,failed=allocate(False)
            if sum(active[k]['minutes'] for k in failed)<sum(active[k]['minutes'] for k in unscheduled):
                assignments,unscheduled=fallback,failed;mode='deadline_fallback'
        validation=validate(tasks,windows,assignments,locks=locks,require_complete=not unscheduled)
    old=defaultdict(list);new=defaultdict(list)
    for r in prior:old[r['task_id']].append(r)
    for r in assignments:new[r['task_id']].append(r)
    changes=[]
    for key in sorted(active):
        before=normalized(old[key]);after=normalized(new[key])
        if before!=after:
            changes.append({'task_id':key,'before':before,'after':after,
                            'reason':'not_placed_by_heuristic' if not after else 'new_task' if not before else 'reallocated_to_satisfy_current_constraints' if mode=='deadline_fallback' else 'previous_assignment_unavailable_or_constraints_changed'})
    status='blocked_constraints' if all_issues else 'needs_page_allocation' if unresolved else 'validator_rejected' if not validation['valid'] else 'partial_draft' if unscheduled else 'complete_draft'
    payload={'tasks':tasks,'windows':windows,'locks':locks,'previous_plan_id':previous['plan_id'] if previous else None}
    fingerprint=hashlib.sha256(json.dumps(payload,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    result={'schema_version':SCHEMA,'algorithm_version':'capacity-list/v1','status':status,'assignments':assignments,'completed_history':history,
            'unscheduled_task_ids':unscheduled,'unscheduled_minutes':sum(active[k]['minutes'] for k in unscheduled),
            'locks':locks,'constraint_issues':all_issues,'unresolved':unresolved,'validation':validation,
            'changes':changes,'allocation_mode':mode,'input_fingerprint':fingerprint,
            'parent_plan_id':previous['plan_id'] if previous else None,'accepted':False,
            'schedule_feasibility_proven':status=='complete_draft',
            'policy':'Feasibility refers only to validated modeled durations and constraints. Draft is not applied. Heuristic failure is not proof of impossibility.'}
    result['plan_id']='plan:'+hashlib.sha256(json.dumps(result,sort_keys=True,separators=(',',':')).encode()).hexdigest()[:24]
    return result
