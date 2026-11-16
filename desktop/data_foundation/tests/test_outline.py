import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from data_foundation.core import connect, import_catalog
from data_foundation.firstaid_outline import browse, build, logical_entries, outline, parse_entry, selection, structure


def line(text,indent,n):
    return {'text':text,'indent':indent,'locator':f'pdf-page:4:column:1:line:{n}'}


class OutlineTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        self.db=connect(self.root/'data.sqlite');self.path=self.root/'index.pdf'
        self.path.write_bytes(b'Synthetic fixture, not source data')
        rows=[{'source_key':'one','title':'First child','page_refs':[51,52],'locator':'pdf-page:4:column:1:line:2'},
              {'source_key':'two','title':'Second child','page_refs':[52,53],'locator':'pdf-page:4:column:1:line:3'}]
        import_catalog(self.db,self.path,'firstaid',rows,{})
        self.lines=[line('Parent topic',0,1),line('First child, 51, 52',8,2),line('Second child, 52, 53',8,3)]

    def tearDown(self):
        self.db.close();self.temp.cleanup()

    def do_build(self):
        with patch('data_foundation.firstaid_outline.pdf_lines',return_value=iter(self.lines)):
            return build(self.db,self.path)

    def test_parent_child_and_deduplicated_selection(self):
        self.do_build();tree=outline(self.db);parent=tree['topics'][0]
        self.assertEqual(parent['title'],'Parent topic');self.assertEqual(len(parent['children']),2)
        chosen=selection(self.db,[parent['id'],parent['children'][0]['id'],parent['id']])
        self.assertEqual(chosen['page_refs'],[51,52,53]);self.assertEqual(len(chosen['resource_item_ids']),2)
        self.assertIsNone(chosen['estimated_minutes']);self.assertTrue(chosen['requires_review'])

    def test_wrapped_heading_and_references(self):
        lines=[line('Long heading,',0,1),line('51, 52',24,2),line('Child, 53',8,3)]
        nodes,_,_=structure(lines)
        parent=next(n for n in nodes.values() if n['parent_id'] is None)
        self.assertEqual(parent['title'],'Long heading');self.assertEqual(parent['pages'],{51,52})
        self.assertEqual(len(nodes),2)

    def test_missing_page_break_does_not_invent_parent(self):
        lines=self.lines+[{'reset':True},line('Orphan child, 54',8,4)]
        nodes,_,orphans=structure(lines)
        self.assertEqual(orphans,1)
        orphan=next(n for n in nodes.values() if n['title']=='Orphan child')
        self.assertEqual(nodes[orphan['parent_id']]['level'],'review_group')

    def test_same_child_label_under_different_parents_is_distinct(self):
        lines=[line('Parent one',0,1),line('Same label, 51',8,2),line('Parent two',0,3),line('Same label, 52',8,4)]
        nodes,_,_=structure(lines)
        self.assertEqual(sum(n['title']=='Same label' for n in nodes.values()),2)

    def test_rebuild_idempotent_and_raw_catalog_untouched(self):
        first=self.do_build();second=self.do_build()
        self.assertEqual(first,second)
        self.assertEqual(self.db.execute('select count(*) from resource_outline_entries').fetchone()[0],3)
        self.assertEqual(self.db.execute('select count(*) from current_resource_items').fetchone()[0],2)
        self.assertEqual(self.db.execute('pragma foreign_key_check').fetchall(),[])

    def test_unknown_selection_and_wrong_source_rejected(self):
        self.do_build()
        with self.assertRaises(ValueError):selection(self.db,['invented'])
        self.path.write_bytes(b'changed')
        with self.assertRaises(ValueError):build(self.db,self.path)

    def test_reference_range_validation(self):
        self.assertEqual(parse_entry('Heading, 51–53'),('Heading',[51,52,53]))
        self.assertEqual(parse_entry('Heading, 53-51')[1],[])
        self.assertEqual(parse_entry('Heading, 900')[1],[])

    def test_version_one_database_migrates_without_data_loss(self):
        path=self.root/'old.sqlite'
        db=connect(path);db.execute("insert into users values('existing')")
        for table in ['resource_outline_item_links','resource_outline_entries','resource_outline_nodes','resource_outline_versions']:
            db.execute('DROP TABLE '+table)
        db.execute('delete from schema_migrations where version=2');db.execute('pragma user_version=1');db.commit();db.close()
        db=connect(path)
        self.assertEqual(db.execute('pragma user_version').fetchone()[0],4)
        self.assertEqual(db.execute('select id from users').fetchone()[0],'existing');db.close()

    def test_browse_finds_children_under_chapter_and_caps_output(self):
        self.do_build();result=browse(self.db,chapter_name='Biochemistry',query='First child',limit=1)
        self.assertEqual(result['matching_topics'],1)
        self.assertEqual(result['topics'][0]['title'],'Parent topic')
        self.assertEqual(browse(self.db,chapter_name='Renal')['matching_topics'],0)
        with self.assertRaises(ValueError):browse(self.db,chapter_name='Invented chapter')


if __name__=='__main__':unittest.main()
