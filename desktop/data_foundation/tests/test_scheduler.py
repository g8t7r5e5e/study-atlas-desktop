import copy
import unittest
from data_foundation.scheduler import propose,validate
from data_foundation.planner import run


def task(key,minutes=60,**kw):
    return dict(id=key,minutes=minutes,deadline='2026-11-20',**kw)


def window(day=17,start=540,end=660):
    return dict(date=f'2026-11-{day}',start_minute=start,end_minute=end)


def assignment(key,day=17,start=540,end=600):
    return dict(task_id=key,date=f'2026-11-{day}',start_minute=start,end_minute=end)


class SchedulerTests(unittest.TestCase):
    def test_deterministic_with_input_order_changes(self):
        tasks=[task('b'),task('a')];windows=[window(18),window()]
        plan=propose(tasks,windows)
        self.assertEqual(plan,propose(list(reversed(tasks)),list(reversed(windows))))
        self.assertEqual(plan['status'],'complete_draft');self.assertTrue(plan['schedule_feasibility_proven'])
        self.assertEqual(plan['assignments'][0]['task_id'],'a');self.assertFalse(plan['accepted'])

    def test_dependency_priority_and_deadlines(self):
        tasks=[task('a',priority=-1),task('b',prerequisites=['a'],priority=10),task('c')]
        tasks[1]['deadline']='2026-11-17'
        plan=propose(tasks,[window(),window(18)])
        self.assertEqual([r['task_id'] for r in plan['assignments']],['a','b','c'])
        self.assertTrue(validate(tasks,[window(),window(18)],plan['assignments'])['valid'])

    def test_locks_reserved_and_parent_finishes_before_lock(self):
        tasks=[task('a'),task('b',prerequisites=['a']),task('c')]
        locks=[assignment('b',start=600,end=660)]
        plan=propose(tasks,[window(),window(18)],locks=locks)
        self.assertEqual(plan['status'],'complete_draft')
        self.assertEqual(plan['assignments'][:2],[assignment('a'),*locks])

    def test_lock_cannot_move_or_overlap(self):
        tasks=[task('a'),task('b')]
        locks=[assignment('a'),assignment('b')]
        plan=propose(tasks,[window()],locks=locks)
        self.assertEqual(plan['status'],'blocked_constraints');self.assertFalse(plan['schedule_feasibility_proven'])
        self.assertEqual(plan['assignments'],[])

    def test_invalid_partial_lock_rejected(self):
        plan=propose([task('a')],[window()],locks=[assignment('a',end=570)])
        self.assertEqual(plan['status'],'blocked_constraints')
        self.assertIn('wrong_duration',[r['kind'] for r in plan['constraint_issues']])

    def test_explicit_splitting_and_no_implicit_split(self):
        windows=[window(end=600),window(start=660,end=720)]
        plan=propose([task('a',90,splittable=True)],windows)
        self.assertEqual(plan['status'],'complete_draft');self.assertEqual(len(plan['assignments']),2)
        self.assertEqual(sum(r['end_minute']-r['start_minute'] for r in plan['assignments']),90)
        self.assertEqual(propose([task('a',90)],windows)['status'],'blocked_constraints')

    def test_release_and_completed_history(self):
        tasks=[task('a'),task('b')]
        previous=propose(tasks,[window()]);tasks[0]['completed']=True;tasks[1]['release_date']='2026-11-19'
        plan=propose(tasks,[window(19)],previous=previous)
        self.assertEqual(plan['status'],'complete_draft');self.assertEqual(plan['completed_history'],[assignment('a')])
        self.assertEqual(plan['assignments'],[assignment('b',19)])
        again=propose(tasks,[window(19)],previous=plan)
        self.assertEqual(again['completed_history'],plan['completed_history'])

    def test_replan_preserves_available_previous_work(self):
        tasks=[task('a'),task('b')];previous=propose(tasks,[window()])
        plan=propose(tasks,[window(),window(18)],previous=previous)
        self.assertEqual(plan['assignments'],previous['assignments']);self.assertEqual(plan['changes'],[])
        self.assertEqual(plan['parent_plan_id'],previous['plan_id'])

    def test_missed_day_replans_only_affected_work(self):
        tasks=[task('a'),task('b')];previous=propose(tasks,[window(end=600),window(18,end=600)])
        plan=propose(tasks,[window(18),window(19)],previous=previous)
        self.assertEqual(plan['status'],'complete_draft')
        self.assertEqual([r for r in plan['assignments'] if r['task_id']=='b'],[assignment('b',18)])
        self.assertEqual([r['task_id'] for r in plan['changes']],['a'])

    def test_fallback_can_release_soft_previous_slots(self):
        tasks=[task('a',90),task('b',60)]
        previous=propose(tasks,[window(start=570,end=660),window(18,end=600)])
        new=[window(start=540,end=690)]
        # Keeping A at 09:30 leaves two 30-minute gaps; rebuilding fits both.
        plan=propose(tasks,new,previous=previous)
        self.assertEqual(plan['status'],'complete_draft');self.assertEqual(plan['allocation_mode'],'deadline_fallback')

    def test_greedy_failure_is_not_impossibility(self):
        # Greedy puts 40+40 on day 1, then 60 on day 2 and strands the last
        # 60-minute task. A valid alternative is 60+40 on each day.
        tasks=[task('a',40),task('b',40),task('c',60),task('d',60)]
        plan=propose(tasks,[window(end=640),window(18,end=640)])
        self.assertEqual(plan['status'],'partial_draft');self.assertFalse(plan['schedule_feasibility_proven'])
        self.assertEqual(plan['constraint_issues'],[]);self.assertTrue(plan['validation']['valid'])

    def test_unresolved_source_blocks_without_inventing_allocation(self):
        plan=propose([task('a',needs_page_allocation=True)],[window()])
        self.assertEqual(plan['status'],'needs_page_allocation');self.assertEqual(plan['assignments'],[])

    def test_independent_validator_rejects_tampering(self):
        tasks=[task('a'),task('b',prerequisites=['a'])];windows=[window()]
        for rows,kind in [([assignment('a'),assignment('b')],'overlapping_assignments'),
                          ([assignment('a',start=600,end=660),assignment('b')],'prerequisite_order'),
                          ([assignment('a',end=570)],'wrong_duration'),
                          ([assignment('a',start=500,end=560)],'outside_free_window')]:
            issues=validate(tasks,windows,rows)['issues']
            self.assertIn(kind,[r['kind'] for r in issues])

    def test_validator_detects_omission_unknown_task_and_changed_lock(self):
        issues=validate([task('a')],[window()],[assignment('unknown')],locks=[assignment('a')])['issues']
        self.assertTrue({'unknown_task','unscheduled_task','lock_changed'}<={r['kind'] for r in issues})

    def test_no_input_mutation_and_invalid_minutes(self):
        tasks=[task('a')];windows=[window()];before=copy.deepcopy((tasks,windows))
        propose(tasks,windows);self.assertEqual((tasks,windows),before)
        with self.assertRaises(ValueError):propose([task('a',2.5)],windows)
        with self.assertRaises(ValueError):propose([task('a',0)],windows)

    def test_versioned_request_interface(self):
        request=dict(schema_version='study-atlas-planning-request/v1',tasks=[task('a')],windows=[window()])
        self.assertEqual(run(request)['status'],'complete_draft')
        request['firstaid_selection']={}
        with self.assertRaises(ValueError):run(request)

    def test_replan_inherits_locks_without_silent_unlock(self):
        tasks=[task('a'),task('b')];lock=assignment('b',start=600,end=660)
        previous=propose(tasks,[window()],locks=[lock])
        plan=propose(tasks,[window(),window(18)],previous=previous)
        self.assertEqual(plan['locks'],[lock]);self.assertEqual(plan['status'],'complete_draft')
        failed=propose(tasks,[window(18)],previous=previous)
        self.assertEqual(failed['status'],'blocked_constraints')
        self.assertIn('outside_free_window',[r['kind'] for r in failed['constraint_issues']])

    def test_completed_history_cannot_be_reopened(self):
        tasks=[task('a')];old=propose(tasks,[window()]);tasks[0]['completed']=True
        completed=propose(tasks,[],previous=old);self.assertEqual(completed['status'],'complete_draft')
        tasks[0]['completed']=False
        with self.assertRaises(ValueError):propose(tasks,[window()],previous=completed)

    def test_completed_lock_becomes_history(self):
        tasks=[task('a')];old=propose(tasks,[window()],locks=[assignment('a')]);tasks[0]['completed']=True
        plan=propose(tasks,[],previous=old)
        self.assertEqual(plan['status'],'complete_draft');self.assertEqual(plan['locks'],[])
        self.assertEqual(plan['completed_history'],[assignment('a')])

    def test_priority_and_date_boundaries(self):
        tasks=[task('a'),task('b',priority=3)]
        plan=propose(tasks,[window(start=1320,end=1440)])
        self.assertEqual(plan['assignments'][0]['task_id'],'b')
        self.assertEqual(plan['assignments'][-1]['end_minute'],1440)

    def test_small_randomized_drafts_are_independently_validated(self):
        import random
        rng=random.Random(1711)
        for i in range(60):
            tasks=[task(str(k),rng.choice([10,20,30,40,60]),splittable=rng.choice([True,False]),
                        prerequisites=[str(k-1)] if k and rng.random()<.4 else []) for k in range(6)]
            windows=[window(17,end=600),window(18,start=600,end=720),window(19,end=660)]
            plan=propose(tasks,windows)
            if plan['status']=='complete_draft':
                self.assertTrue(validate(tasks,windows,plan['assignments'])['valid'])
                self.assertEqual({r['task_id'] for r in plan['assignments']},{t['id'] for t in tasks})

    def test_curriculum_sized_reverse_dependency_input(self):
        tasks=[task(f't{i:04d}',1,prerequisites=[f't{i-1:04d}'] if i else []) for i in range(1405)]
        plan=propose(list(reversed(tasks)),[window(start=0,end=1440)],
                     locks=[assignment('t1404',start=1404,end=1405)])
        self.assertEqual(plan['status'],'complete_draft');self.assertEqual(len(plan['assignments']),1405)
