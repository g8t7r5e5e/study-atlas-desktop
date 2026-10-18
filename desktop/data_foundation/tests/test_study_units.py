import tempfile
import unittest
from pathlib import Path
from data_foundation.core import connect, import_catalog
from data_foundation.study_units import build, definitions, matches, select, order_units, reading_sequence


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
        names={u['id']:u['title'] for u in units}
        self.assertEqual(names['cardiovascular-04'],'Wiggers diagram')
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

    def test_page_order_overrides_ids_and_input_order(self):
        import_catalog(self.db,self.src,'firstaid',[
            {'source_key':'early','title':'physiology','page_refs':[289],'locator':'fixture'},
            {'source_key':'later','title':'cardiac cycle','page_refs':[292],'locator':'fixture'}],{})
        build(self.db)
        r=select(self.db,['cardiovascular-04','cardiovascular-03','cardiovascular-01'])
        self.assertEqual(r['selected_unit_ids'][:2],['cardiovascular-03','cardiovascular-04'])
        self.assertEqual([s['page'] for s in r['reading_sequence']],[289,292])
        self.assertEqual(r['unresolved_unit_ids'],['cardiovascular-01'])

    def test_noncontiguous_units_do_not_backtrack_or_duplicate_crosslinks(self):
        video={'item_id':'v','resource_id':'bnb','page_refs':[]}
        question={'question_id':'q'}
        units=[{'id':'z','title':'First','system':'one','firstaid_index_pages':[183,563],
                'resource_candidates':[video],'question_candidates':[question]},
               {'id':'a','title':'Second','system':'two','firstaid_index_pages':[200],
                'resource_candidates':[video],'question_candidates':[question]}]
        order_units(units);steps=reading_sequence(units)
        self.assertEqual([s['page'] for s in steps],[183,200,563])
        self.assertEqual([s['unit_ids'] for s in steps],[['z'],['a'],['z']])
        self.assertEqual(sum(len(s['resource_candidates']) for s in steps),1)
        self.assertEqual(sum(len(s['question_candidates']) for s in steps),1)

    def test_page_step_does_not_pull_later_reading_forward(self):
        fa={'item_id':'f','resource_id':'firstaid','page_refs':[183,563]}
        units=[{'id':'u','firstaid_index_pages':[183,563],
                'resource_candidates':[fa],'question_candidates':[]}]
        steps=reading_sequence(units)
        self.assertEqual([s['resource_candidates'][0]['page_refs'] for s in steps],[[183],[563]])
