import unittest
import tempfile
import json
from data_foundation.feasibility import check,firstaid_tasks
from data_foundation.core import connect
from pathlib import Path

def task(key,minutes=60,**kw):
    return dict(id=key,minutes=minutes,deadline='2026-11-18',**kw)
def window(day=17,start=540,end=600):
    return dict(date=f'2026-11-{day}',start_minute=start,end_minute=end)

class FeasibilityTests(unittest.TestCase):
    def test_firstaid_adapter_estimates_identity_and_progress(self):
        with tempfile.TemporaryDirectory() as folder:
            db=connect(Path(folder)/'db.sqlite')
            from data_foundation.core import import_catalog
            source=Path(folder)/'source.txt';source.write_text('synthetic')
            import_catalog(db,source,'firstaid',[dict(source_key='BIO-001',title='Synthetic',page_refs=[32,34],locator='row:2')],{})
            row=db.execute("SELECT id,catalog_id FROM current_resource_items").fetchone()
            db.execute('INSERT INTO firstaid_workbook_rows VALUES(?,?,?,?,?)',(*row,1,json.dumps({'Main Topic':'Synthetic','Estimated Study Time (min)':20}),'[]'));db.commit()
            tasks=firstaid_tasks(db,['BIO-001','BIO-001'],deadline='2026-11-18',progress={'BIO-001':.5},pace_multiplier=1.5)
            self.assertEqual(len(tasks),1);self.assertEqual(tasks[0]['minutes'],15);self.assertTrue(tasks[0]['needs_page_allocation'])
            with self.assertRaises(ValueError):firstaid_tasks(db,['unknown'],deadline='2026-11-18')
            with self.assertRaises(ValueError):firstaid_tasks(db,['BIO-001'],deadline='2026-11-18',progress={'BIO-001':2})
            db.close()
    def test_total_fit_not_proof(self):
        r=check([task('a')],[window()]);self.assertEqual(r['status'],'necessary_checks_passed');self.assertFalse(r['schedule_feasibility_proven'])
    def test_contiguous_and_split(self):
        slots=[window(),window(start=660,end=720)]
        self.assertIn('no_contiguous_window',[x['kind'] for x in check([task('a',90)],slots)['issues']])
        self.assertEqual(check([task('a',90,splittable=True)],slots)['status'],'necessary_checks_passed')
    def test_deadline_prefix(self):
        a=task('a',90);a['deadline']='2026-11-17'
        self.assertEqual(check([a],[window(),window(18)])['status'],'infeasible_bounds')
    def test_release_interval(self):
        tasks=[task('a',40,release_date='2026-11-18'),task('b',40,release_date='2026-11-18')]
        self.assertIn('deadline_interval_shortfall',[x['kind'] for x in check(tasks,[window(),window(18)])['issues']])
    def test_dependency_deadline_propagation(self):
        a=task('a');b=task('b',prerequisites=['a']);b['deadline']='2026-11-17'
        r=check([a,b],[window(),window(18)])
        self.assertEqual(r['effective_deadlines']['a'],'2026-11-17');self.assertEqual(r['status'],'infeasible_bounds')
    def test_dependency_window_path(self):
        a=task('a',60,release_date='2026-11-18');b=task('b',60,prerequisites=['a'])
        r=check([a,b],[window(),window(18)])
        self.assertIn('prerequisite_path_window_conflict',[x['kind'] for x in r['issues']])
    def test_invalid_graph_and_windows(self):
        for tasks in [[task('a',prerequisites=['b'])],[task('a',prerequisites=['b']),task('b',prerequisites=['a'])]]:
            with self.assertRaises(ValueError):check(tasks,[window()])
        with self.assertRaises(ValueError):check([task('a')],[window(),window()])
    def test_completed_prerequisite(self):
        self.assertEqual(check([task('a',completed=True),task('b',prerequisites=['a'])],[window()])['status'],'necessary_checks_passed')
