import json
import tempfile
import unittest
from pathlib import Path
from openpyxl import Workbook
from data_foundation.core import connect,import_catalog
from data_foundation.firstaid_workbooks import HEADERS,pages,subtopics,read_workbooks,replace,export
from data_foundation.firstaid_outline import outline,selection


class WorkbookTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        self.db=connect(self.root/'db.sqlite')
        self.path=self.root/'topics.xlsx'
        self.make(self.path)

    def tearDown(self):
        self.db.close();self.tmp.cleanup()

    def make(self,path,title='Synthetic topic',page='32–33'):
        w=Workbook();s=w.active;s.title='Master Table';s.append(HEADERS)
        s.append(['BIO-001','Biochemistry','Synthetic section',title,
                  '1. First (p. 32)\n2. Second; 21) stays inside text (p. 33)',page,'Concept','Moderate',20])
        w.save(path);w.close()

    def apply(self,paths=None):
        data=read_workbooks(paths or [self.path]);manifest=self.root/'manifest.json'
        manifest.write_text(json.dumps(data),encoding='utf-8')
        return replace(self.db,manifest)

    def test_replace_removes_old_firstaid_only(self):
        source=self.root/'source.txt';source.write_text('fixture')
        row={'source_key':'old','title':'Old','page_refs':[51],'locator':'row:1'}
        import_catalog(self.db,source,'firstaid',[row],{})
        import_catalog(self.db,source,'bnb',[row],{})
        self.db.execute("INSERT INTO users VALUES('student')");self.db.commit()
        self.apply()
        self.assertEqual(self.db.execute("SELECT source_key FROM current_resource_items WHERE resource_id='firstaid'").fetchone()[0],'BIO-001')
        self.assertEqual(self.db.execute("SELECT count(*) FROM resource_items WHERE resource_id='firstaid'").fetchone()[0],1)
        self.assertEqual(self.db.execute("SELECT count(*) FROM current_resource_items WHERE resource_id='bnb'").fetchone()[0],1)
        self.assertEqual(self.db.execute('SELECT count(*) FROM users').fetchone()[0],1)
        self.assertFalse(self.db.execute('PRAGMA foreign_key_check').fetchall())

    def test_duplicate_and_conflicting_sources(self):
        other=self.root/'second.xlsx';self.make(other)
        self.assertEqual(self.apply([self.path,other])['duplicate_rows_collapsed'],1)
        self.make(other,title='Conflicting')
        with self.assertRaises(ValueError):self.apply([self.path,other])
        self.assertEqual(export(self.db)['records'][0]['fields']['Main Topic'],'Synthetic topic')

    def test_repeat_import_and_changed_title(self):
        first=self.apply();self.assertEqual(first['catalog_id'],self.apply()['catalog_id'])
        iid=self.db.execute("SELECT id FROM resource_items WHERE resource_id='firstaid'").fetchone()[0]
        self.make(self.path,title='Renamed');self.apply()
        self.assertEqual(iid,self.db.execute("SELECT id FROM resource_items WHERE resource_id='firstaid'").fetchone()[0])
        self.assertEqual(self.db.execute('SELECT count(*) FROM firstaid_workbook_rows').fetchone()[0],1)

    def test_outline_and_subtopic_pages(self):
        self.apply();tree=outline(self.db);topic=tree['topics'][0]
        self.assertEqual(tree['source_kind'],'user_verified_workbooks')
        self.assertEqual(len(topic['children']),2)
        selected=selection(self.db,[topic['id']])
        self.assertEqual(selected['page_refs'],[32,33]);self.assertFalse(selected['requires_review'])
        self.assertEqual(export(self.db)['records'][0]['fields']['Estimated Study Time (min)'],20)

    def test_invalid_pages_and_formula_rejected_before_changes(self):
        self.apply();before=export(self.db)
        self.make(self.path,page='33-32')
        with self.assertRaises(ValueError):self.apply()
        self.make(self.path,title='=HYPERLINK("bad")')
        with self.assertRaises(ValueError):self.apply()
        self.assertEqual(before,export(self.db))

    def test_transaction_rolls_back_on_insert_failure(self):
        self.apply();before=export(self.db)
        self.db.execute("CREATE TRIGGER stop_new BEFORE INSERT ON firstaid_workbook_rows BEGIN SELECT RAISE(ABORT,'injected failure'); END")
        with self.assertRaises(Exception):self.apply()
        self.assertEqual(before,export(self.db))

    def test_page_delimiters_and_numbers_in_body(self):
        self.assertEqual(pages('32–34, 37; 39'),[32,33,34,37,39])
        self.assertEqual(subtopics('1. p. 339 — 21 hydroxylase')[0]['pages'],[339])
        self.assertEqual(len(subtopics('1. A (p. 32); 2. B (p. 33)')),2)

    def test_existing_progress_blocks_destructive_replacement(self):
        self.apply();iid=self.db.execute('SELECT item_id FROM firstaid_workbook_rows').fetchone()[0]
        self.db.execute("INSERT INTO users VALUES('student')")
        self.db.execute("INSERT INTO user_resource_progress VALUES('student',?,'completed',60,'today')",(iid,));self.db.commit()
        with self.assertRaises(ValueError):self.apply()
        self.assertEqual(self.db.execute('SELECT count(*) FROM user_resource_progress').fetchone()[0],1)
