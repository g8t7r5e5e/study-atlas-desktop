"""Synthetic fixtures exist only in tests; none are exported as research data."""
import csv
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from data_foundation.core import activate, catalog_dto, connect, import_catalog, stable
from data_foundation.tabular import import_questions, load_rows, read_video_table
from data_foundation.anki import import_anki
from data_foundation.mappings import generate, parse_tag
from data_foundation.reporting import private_export, report, seed_categories


class FoundationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.db = connect(self.root / 'test.sqlite')
        seed_categories(self.db)

    def tearDown(self):
        self.db.close()
        self.temp.cleanup()

    def csv(self, name='questions.csv', rows=None, headers=None):
        path = self.root / name
        rows = rows if rows is not None else [['1','Test topic','10','8','secret question body']]
        with path.open('w',encoding='utf-8-sig',newline='') as f:
            w=csv.writer(f);w.writerow(headers or ['id','title','pplTaken','corrTaken','question']);w.writerows(rows)
        return path

    def count(self, table):
        return self.db.execute('SELECT count(*) FROM '+table).fetchone()[0]

    def video(self, title='Test topic', key='fixed-id', duration=60, path=None):
        path = path or self.root / 'videos.json'
        path.write_text(json.dumps([{'title':title,'source_key':key,'duration_seconds':duration}]))
        rows, validation = read_video_table(path)
        return import_catalog(self.db,path,'bnb',rows,validation)

    def test_question_import_is_metadata_only_idempotent(self):
        p=self.csv();a=import_questions(self.db,p);b=import_questions(self.db,p)
        self.assertEqual(a['catalog_id'],b['catalog_id'])
        self.assertEqual(self.count('question_references'),1)
        self.assertNotIn('secret question body','\n'.join(self.db.iterdump()))
        self.assertEqual(self.count('user_question_progress'),0)

    def test_qid_scoped_by_product(self):
        p=self.csv();import_questions(self.db,p);import_questions(self.db,p,product='step2')
        self.assertEqual(self.count('question_references'),2)

    def test_duplicate_dedup_and_conflicting_rollback(self):
        p=self.csv(rows=[['1','A','10','8','x'],['1','A','10','8','y']])
        self.assertEqual(import_questions(self.db,p)['duplicate_rows'],1)
        p=self.csv(rows=[['2','B','10','8','x'],['2','C','10','8','x']])
        with self.assertRaises(ValueError): import_questions(self.db,p)
        self.assertEqual(self.count('question_references'),1)

    def test_missing_id_and_malformed_rows_rejected(self):
        for rows in [[['','A','1','1','x']],[['1','A']],[['1','A','1','1','x','extra']]]:
            with self.assertRaises(ValueError):import_questions(self.db,self.csv(rows=rows))
        self.assertEqual(self.count('source_snapshots'),0)

    def test_nan_and_invalid_population_statistics_rejected(self):
        for attempted, correct in [('NaN','0'),('1','2'),('-1','0'),('1.2','0')]:
            with self.assertRaises(ValueError):import_questions(self.db,self.csv(rows=[['1','A',attempted,correct,'x']]))

    def test_quoted_multiline_csv_and_explicit_columns(self):
        p=self.csv(headers=['question key','label','people','correct','body'], rows=[['5','A, quoted\nlabel','4','2','private']])
        r=import_questions(self.db,p,explicit={'qid':'question key','title':'label','attempts':'people','correct':'correct'})
        self.assertEqual(r['unique_qids'],1)

    def test_no_progress_loss_and_catalog_rollback(self):
        p=self.csv(rows=[['1','A','10','8','x'],['2','B','10','8','x']]);r=import_questions(self.db,p)
        qid=self.db.execute('select id from question_references order by qid').fetchone()[0]
        with self.db:
            self.db.execute("insert into users values('u')")
            self.db.execute("insert into user_question_progress values('u',?,1,1,'2026-10-18')",(qid,))
        p=self.csv(rows=[['2','B changed','12','9','x']])
        with self.assertRaises(ValueError):import_questions(self.db,p)
        import_questions(self.db,p,allow_smaller=True)
        self.assertEqual(self.count('current_questions'),1)
        self.assertEqual(self.count('user_question_progress'),1)
        activate(self.db,r['catalog_id'])
        self.assertEqual(self.count('current_questions'),2)
        self.assertEqual(self.count('user_question_progress'),1)

    def test_resource_title_change_keeps_identity_and_progress(self):
        r=self.video();iid=catalog_dto(self.db)[0]['id']
        with self.db:
            self.db.execute("insert into users values('u')")
            self.db.execute("insert into user_resource_progress values('u',?,'completed',70,'2026-10-18')",(iid,))
        self.video(title='Renamed topic')
        self.assertEqual(catalog_dto(self.db)[0]['id'],iid)
        self.assertEqual(self.count('user_resource_progress'),1)
        activate(self.db,r['catalog_id'])
        self.assertEqual(catalog_dto(self.db)[0]['title'],'Test topic')

    def test_missing_duration_stays_null(self):
        self.video(duration=None)
        self.assertIsNone(catalog_dto(self.db)[0]['duration_seconds'])
        with self.assertRaises(ValueError):self.video(duration=0)

    def test_video_missing_stable_id_rejected(self):
        p=self.root/'v.json';p.write_text('[{"title":"test","minutes":20}]')
        with self.assertRaises(ValueError):read_video_table(p)

    def test_mapping_candidates_have_provenance_not_verified(self):
        import_questions(self.db,self.csv());self.video();first=generate(self.db);generate(self.db)
        self.assertEqual(first['exact_title_candidates'],1)
        self.assertEqual(self.count('topic_resource_mappings'),1)
        self.assertEqual(report(self.db)['reviewed_cross_resource_links'],0)
        self.assertEqual(self.db.execute("select validation_status from mapping_evidence where evidence_type='exact_title'").fetchone()[0],'candidate')

    def test_old_mapping_not_counted_after_resource_rename(self):
        import_questions(self.db,self.csv());self.video();generate(self.db)
        self.video(title='Entirely unrelated title');generate(self.db)
        self.assertEqual(report(self.db)['question_ids_with_candidate_resource_links'],0)

    def test_anki_aliases_and_version_numbers(self):
        t=parse_tag('#AK_Step1_v12::#UWorld::6575')
        self.assertEqual((t['product'],t['qid']),('step1','6575'))
        self.assertEqual(parse_tag('#AK_Step2_v12::#UWorld::6575')['product'],'step2')
        self.assertEqual(parse_tag('#AK_Step1_v12::#UWorld::COMLEX::6575')['product'],'comlex1')
        self.assertIsNone(parse_tag('#UWorld::6575')['product'])
        self.assertIsNone(parse_tag('#AK_Step1_v12::#UWorld::flag')['qid'])
        self.assertEqual(parse_tag('#AK_Step1_v12::#B&B::Topic')['resource'],'bnb')

    def test_anki_note_card_distinction_and_readonly_copy(self):
        import_questions(self.db,self.csv());self.video()
        path=self.root/'backup.anki2'
        with sqlite3.connect(path) as a:
            a.executescript('CREATE TABLE notes(id,guid,tags,flds);CREATE TABLE cards(id,nid,queue,due,ivl,reps,lapses);')
            a.execute('INSERT INTO notes VALUES(1,?,?,?)',('guid','#AK_Step1_v12::#UWorld::1 #AK_Step1_v12::#B&B::Test_topic','private card text'))
            a.executemany('INSERT INTO cards VALUES(?,?,?,?,?,?,?)',[(10,1,-1,1,2,3,4),(11,1,2,2,3,4,5)])
        original=path.read_bytes()
        a.close()
        with self.assertRaises(ValueError):import_anki(self.db,path,collection='test')
        result=import_anki(self.db,path,collection='test',confirmed_backup=True)
        self.assertEqual((result['notes'],result['cards'],result['cotag_candidates']),(1,2,1))
        self.assertEqual(path.read_bytes(),original)
        self.assertNotIn('private card text','\n'.join(self.db.iterdump()))
        import_anki(self.db,path,collection='test',confirmed_backup=True)
        self.assertEqual(self.count('anki_cards'),2)
        self.assertEqual(self.count('resource_question_mappings'),1)

    def test_anki_wal_backup_rejected(self):
        p=self.root/'backup.anki2';p.touch();Path(str(p)+'-wal').touch()
        with self.assertRaises(ValueError):import_anki(self.db,p,collection='test',confirmed_backup=True)

    def test_xlsx_formulas_rejected(self):
        from openpyxl import Workbook
        p=self.root/'x.xlsx';w=Workbook();w.active.append(['id','title']);w.active.append(['1','=1+1']);w.save(p)
        with self.assertRaises(ValueError):load_rows(p)

    def test_private_export_roundtrip_and_foreign_keys(self):
        import_questions(self.db,self.csv());self.video();generate(self.db)
        private_export(self.db,self.root/'export')
        with sqlite3.connect(self.root/'export/study-atlas.sqlite') as c:
            self.assertEqual(c.execute('PRAGMA integrity_check').fetchone()[0],'ok')
            self.assertEqual(c.execute('PRAGMA foreign_key_check').fetchall(),[])
            self.assertEqual(c.execute('select count(*) from current_questions').fetchone()[0],1)
        self.assertTrue((self.root/'export/current_resource_items.json').exists())
        c.close()

    def test_future_schema_rejected(self):
        p=self.root/'future.sqlite'
        with sqlite3.connect(p) as c:c.execute('PRAGMA user_version=99')
        c.close()
        with self.assertRaises(ValueError):connect(p)


if __name__ == '__main__':
    unittest.main()
