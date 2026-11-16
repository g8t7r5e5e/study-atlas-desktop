"""First Aid workload adapter and necessary feasibility checks, without allocation."""
import json
import math
from datetime import date
from .workload import number


def day(value):
    if not isinstance(value,str) or date.fromisoformat(value).isoformat()!=value:
        raise ValueError('Use ISO date YYYY-MM-DD')
    return value


def minute(value):
    number(value,'minute')
    if not float(value).is_integer():raise ValueError('Window minutes must be integers')
    return int(value)


def firstaid_tasks(db,topic_ids,*,deadline,progress=None,pace_multiplier=1):
    """Charge a topic estimate once; page references remain evidence, not subtasks.

    Partial completion is explicitly user-reported fraction of estimated work.
    Noncontiguous topics remain unresolved for strict page-by-page allocation.
    """
    day(deadline);number(pace_multiplier,'pace multiplier',0.01)
    progress=progress or {}; selected=list(dict.fromkeys(topic_ids))
    if not selected:raise ValueError('Select at least one First Aid topic')
    rows={r['source_key']:dict(r) for r in db.execute('''SELECT i.source_key,i.page_refs,w.fields_json,w.sequence
        FROM current_resource_items i JOIN firstaid_workbook_rows w
        ON w.item_id=i.id AND w.catalog_id=i.catalog_id WHERE i.resource_id='firstaid' ''')}
    if set(selected)-rows.keys():raise ValueError('Unknown current First Aid topic')
    if set(progress)-set(selected):raise ValueError('Progress refers to unselected topic')
    tasks=[]
    for key in sorted(selected,key=lambda k:rows[k]['sequence']):
        row=rows[key];fields=json.loads(row['fields_json']);pages=json.loads(row['page_refs'])
        fraction=progress.get(key,0);number(fraction,'completed fraction')
        if fraction>1:raise ValueError('Completed fraction exceeds one')
        baseline=number(fields['Estimated Study Time (min)'],'source estimate',0.01)
        tasks.append({'id':'firstaid:'+key,'topic_id':key,'title':fields['Main Topic'],
            'minutes':math.ceil(baseline*(1-fraction)*pace_multiplier),'deadline':deadline,
            'completed':fraction==1,'prerequisites':[], 'splittable':False,
            'source_baseline_minutes':baseline,'completed_fraction':fraction,
            'printed_pages':pages,'source_sequence':row['sequence'],
            'estimate_source':'user_verified_workbook','allocation_policy':'whole_topic_once',
            'needs_page_allocation':pages!=list(range(min(pages),max(pages)+1))})
    # Precedence on selected topics is only sound for disjoint page spans.
    for previous,current in zip(tasks,tasks[1:]):
        if max(previous['printed_pages'])<=min(current['printed_pages']):
            current['prerequisites'].append(previous['id'])
        else:current['needs_page_allocation']=True
    return tasks


def check(tasks,windows):
    """Return proved contradictions / necessary bounds; passing is not a proof.

    Windows are net free local-day intervals [start_minute,end_minute), after
    commitments and buffers. No cross-midnight interval; split it by date first.
    """
    slots=[];bydate={}
    for w in windows:
        d=day(w['date']);start=minute(w['start_minute']);end=minute(w['end_minute'])
        if not 0<=start<end<=1440:raise ValueError('Invalid daily window')
        slots.append((d,start,end));bydate.setdefault(d,[]).append((start,end))
    slots.sort()
    for entries in bydate.values():
        entries.sort()
        if any(a[1]>b[0] for a,b in zip(entries,entries[1:])):raise ValueError('Overlapping free windows')
    known={};issues=[];unresolved=[]
    for t in tasks:
        key=t['id']
        if not isinstance(key,str) or not key.strip() or key in known:raise ValueError('Invalid/duplicate task identity')
        known[key]=t
        day(t['deadline']);number(t['minutes'],'task minutes')
        if 'release_date' in t:day(t['release_date'])
        if type(t.get('splittable',False)) is not bool or type(t.get('completed',False)) is not bool:raise ValueError('Invalid boolean')
        if t.get('needs_page_allocation'):unresolved.append({'task_id':key,'reason':'explicit_page_workload_allocation_required'})
    visiting=set();done=set();order=[]
    def visit(key):
        if key in visiting:raise ValueError('Prerequisite cycle')
        if key in done:return
        visiting.add(key)
        for parent in known[key].get('prerequisites',[]):
            if parent not in known:raise ValueError('Unknown prerequisite')
            visit(parent)
        visiting.remove(key);done.add(key);order.append(key)
    for key in known:visit(key)
    active={k:t for k,t in known.items() if not t.get('completed',False)}
    # Propagate descendant deadlines backwards; prerequisites must finish in time.
    due={k:t['deadline'] for k,t in active.items()}
    for key in reversed(order):
        if key not in active:continue
        for parent in known[key].get('prerequisites',[]):
            if parent in active:due[parent]=min(due[parent],due[key])
    def eligible(t):
        return [(d,s,e) for d,s,e in slots if t.get('release_date','0001-01-01')<=d<=due[t['id']]]
    for key,t in active.items():
        candidates=eligible(t);capacity=sum(e-s for _,s,e in candidates)
        if capacity<t['minutes']:issues.append({'kind':'task_window_shortfall','task_id':key,'shortfall_minutes':t['minutes']-capacity})
        elif not t.get('splittable',False) and t['minutes']>max((e-s for _,s,e in candidates),default=0):
            issues.append({'kind':'no_contiguous_window','task_id':key,'required_minutes':t['minutes']})
    # Necessary cumulative demand bounds for every release/deadline interval.
    horizon=slots[0][0] if slots else '0001-01-01'
    starts=sorted({horizon}|{t.get('release_date',horizon) for t in active.values()})
    for start in starts:
        for end in sorted(set(due.values())):
            if end<start:continue
            demand=sum(t['minutes'] for k,t in active.items() if max(horizon,t.get('release_date',horizon))>=start and due[k]<=end)
            capacity=sum(e-s for d,s,e in slots if start<=d<=end)
            if demand>capacity:issues.append({'kind':'deadline_interval_shortfall','start':start,'deadline':end,'demand_minutes':demand,'capacity_minutes':capacity,'shortfall_minutes':demand-capacity})
    # Optimistic earliest finish along prerequisite paths, ignoring competition
    # from independent tasks. Failure proves a bound; success does not prove fit.
    finish={}
    for key in order:
        if key not in active:continue
        t=active[key];ready=max([date.fromisoformat(t.get('release_date',horizon)).toordinal()*1440]+[finish[p] for p in t.get('prerequisites',[]) if p in finish])
        remaining=t['minutes'];endtime=ready
        for d,s,e in eligible(t):
            base=date.fromisoformat(d).toordinal()*1440;start=max(base+s,ready)
            available=max(0,base+e-start)
            if t.get('splittable',False):
                take=min(remaining,available);remaining-=take;endtime=start+take
            elif available>=remaining:endtime=start+remaining;remaining=0
            if remaining==0:break
        if remaining:issues.append({'kind':'prerequisite_path_window_conflict','task_id':key})
        finish[key]=endtime if not remaining else date.fromisoformat(due[key]).toordinal()*1440+1440
    return {'schema_version':'study-atlas-feasibility/v1','status':'infeasible_bounds' if issues else 'needs_page_allocation' if unresolved else 'necessary_checks_passed',
            'issues':issues,'unresolved':unresolved,'effective_deadlines':due,
            'known_workload_minutes':sum(t['minutes'] for t in active.values()),
            'net_window_minutes':sum(e-s for _,s,e in slots),'schedule_feasibility_proven':False,
            'policy':'Necessary checks only; no schedule generated. Windows must already exclude commitments and buffers.'}
