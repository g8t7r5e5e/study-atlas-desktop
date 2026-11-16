import unittest
from data_foundation.workload import estimate,assess

class WorkloadTests(unittest.TestCase):
    def test_video_and_reading(self):
        self.assertEqual(estimate(dict(kind='video',remaining_runtime_minutes=60,playback_speed=2,overhead_minutes=15)),45)
        self.assertEqual(estimate(dict(kind='reading',remaining_baseline_minutes=20,pace_multiplier=1.5)),30)
    def test_questions_and_cards(self):
        self.assertEqual(estimate(dict(kind='questions',attempts=40,minutes_per_attempt=1.5,review_minutes=80)),140)
        self.assertEqual(estimate(dict(kind='cards',review_events=120,seconds_per_review=10,new_cards=10,seconds_per_new_card=30)),25)
    def test_shortfall_and_dedup(self):
        a=dict(occurrence_id='a',kind='fixed',minutes=750)
        days=[dict(date=f'2026-11-{d}',available_minutes=180,buffer_minutes=30,commitments_minutes=30) for d in range(17,22)]
        r=assess([a,a],days)
        self.assertEqual(r['shortfall_minutes'],150);self.assertEqual(r['duplicate_occurrences_removed'],1)
        self.assertFalse(r['schedule_feasibility_proven'])
    def test_unknown_not_zero(self):
        self.assertEqual(assess([dict(occurrence_id='a',kind='reading')],[])['status'],'incomplete_inputs')
    def test_invalid_and_conflicting_inputs(self):
        for value in [-1,float('nan'),True]:
            with self.assertRaises(ValueError):estimate(dict(kind='fixed',minutes=value))
        with self.assertRaises(ValueError):assess([dict(occurrence_id='a',kind='fixed',minutes=1),dict(occurrence_id='a',kind='fixed',minutes=2)],[])
    def test_completed_and_capacity_conflict(self):
        r=assess([dict(occurrence_id='a',completed=True)], [dict(date='2026-11-17',available_minutes=10,buffer_minutes=20)])
        self.assertEqual(r['known_workload_minutes'],0);self.assertEqual(r['status'],'capacity_conflict')
