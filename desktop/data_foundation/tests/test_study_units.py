import tempfile
import unittest
from pathlib import Path
from data_foundation.core import connect, import_catalog
from data_foundation.study_units import build, definitions, matches, select


class StudyUnitTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        self.db=connect(self.root/'db.sqlite');self.src=self.root/'fixture.txt'
        self.src.write_text('Synthetic metadata')

    def tearDown(self):
        self.db.close();self.temp.cleanup()

    def test_curriculum_size_and_requested_sequence(self):
        units=definitions()['units']
        self.assertTrue(200<=len(units)<=400)
        self.assertEqual([u['title'] for u in units[:4]],[
            'Cardiac embryology','Cardiac anatomy','Cardiac physiology basics','Wiggers diagram'])
        self.assertFalse(matches('COPD',['cop']))

    def test_page_scope_and_no_invented_workload(self):
        import_catalog(self.db,self.src,'firstaid',[
            {'source_key':'a','title':'cardiac cycle','page_refs':[292,600],'locator':'fixture'}],{})
        build(self.db)
        result=select(self.db,['cardiovascular-04'])
        self.assertEqual(result['firstaid_index_pages'],[292])
        self.assertIsNone(result['anki_card_count'])
        self.assertIsNone(result['estimated_total_minutes'])
        self.assertFalse(result['activated'])

    def test_deduplication_and_catalog_switch(self):
        rows=[{'source_key':'a','title':'Hypertension in Pregnancy','module':'Reproductive',
               'duration_seconds':600,'locator':'fixture'}]
        import_catalog(self.db,self.src,'bnb',rows,{})
        first=build(self.db);second=build(self.db)
        self.assertEqual(first,second)
        result=select(self.db,['reproductive-21','reproductive-23','reproductive-21'])
        self.assertEqual(len(result['resource_candidates']),1)
        self.assertEqual(result['bnb_runtime_seconds'],600)
        self.src.write_text('New snapshot');rows[0]['title']='Unrelated topic'
        import_catalog(self.db,self.src,'bnb',rows,{})
        self.assertEqual(select(self.db,['reproductive-21'])['resource_candidates'],[])
        build(self.db)
        self.assertEqual(self.db.execute('PRAGMA foreign_key_check').fetchall(),[])

    def test_unknown_selection_rejected(self):
        build(self.db)
        for ids in ([],['missing']):
            with self.assertRaises(ValueError):select(self.db,ids)
