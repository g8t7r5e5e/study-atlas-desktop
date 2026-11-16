"""Replace obsolete First Aid index data with explicit user-verified workbook rows.

Workbook cells are data, never instructions. Private content stays out of Git.
"""
import json
import math
import re
import zipfile
from collections import Counter
from pathlib import Path
from .core import checksum, norm, stable, snapshot

ALGORITHM = 'firstaid-workbooks/v1'
HEADERS = ['Topic ID','System','Chapter/Section','Main Topic','Subtopics',
           'Printed Page No.','Content Type','Difficulty','Estimated Study Time (min)']


def pages(value):
    text = str(value).strip().replace('–','-').replace('—','-')
    if not re.fullmatch(r'\d+(?:\s*-\s*\d+)?(?:\s*[,;]\s*\d+(?:\s*-\s*\d+)?)*',text):
        raise ValueError(f'Invalid printed pages: {text}')
    result=set()
    for part in re.split('[,;]',text):
        ends=[int(x.strip()) for x in part.split('-')]
        if not 1<=ends[0]<=ends[-1]<=900:raise ValueError(f'Invalid printed page range: {text}')
        result.update(range(ends[0],ends[-1]+1))
    return sorted(result)


def subtopics(text):
    # Only explicit numbered boundaries; semicolons inside descriptions stay intact.
    boundary=r'(?:^|\n)(\d+)[.)]\s+' if '\n' in text else r'(?:^|;\s*)(\d+)[.)]\s+'
    parts=re.split(boundary,text)
    if len(parts)==1:return [{'ordinal':1,'text':text,'pages':[]}]
    if parts[0].strip():raise ValueError('Unexpected text before numbered subtopics')
    result=[]
    for i in range(1,len(parts),2):
        ordinal=int(parts[i]);body=parts[i+1].strip()
        if ordinal!=len(result)+1 or not body:raise ValueError(f'Invalid subtopic numbering: expected {len(result)+1}, found {ordinal}: {body[:80]}')
        refs=set()
        for match in re.finditer(r'\bpp?\.\s*(\d+(?:[–-]\d+)?(?:,\s*\d+)*)',body):
            refs.update(pages(match[1]))
        result.append({'ordinal':ordinal,'text':body,'pages':sorted(refs)})
    return result


def read_workbooks(paths):
    from openpyxl import load_workbook
    records={};sources=[];separate=[];duplicates=0
    for path in sorted(map(Path,paths),key=lambda p:p.name.casefold()):
        if path.stat().st_size>64*1024*1024:raise ValueError('Workbook too large')
        with zipfile.ZipFile(path) as archive:
            if sum(i.file_size for i in archive.infolist())>64*1024*1024:raise ValueError('Expanded workbook too large')
        wb=load_workbook(path,read_only=True,data_only=False)
        try:
            if 'Master Table' not in wb.sheetnames:
                if {'By Lecture','All QIDs'}<=set(wb.sheetnames):
                    separate.append({'file':path.name,'sha256':checksum(path),'role':'UWorld lecture mapping; not First Aid; not imported'})
                    continue
                raise ValueError(f'Missing Master Table: {path.name}')
            rows=iter(wb['Master Table'].values)
            if list(next(rows))!=HEADERS:raise ValueError(f'Unexpected headers: {path.name}')
            count=0
            for rownum,values in enumerate(rows,2):
                if not any(v is not None for v in values):continue
                if any(isinstance(v,str) and v.startswith('=') for v in values):raise ValueError('Formulas are not accepted in Master Table')
                if len(values)!=9 or any(v is None or str(v).strip()=='' for v in values):raise ValueError(f'Missing fields: {path.name}:{rownum}')
                data=dict(zip(HEADERS,values));key=str(values[0]).strip()
                if not re.fullmatch(r'[A-Z]+-\d+',key):raise ValueError(f'Invalid Topic ID: {key}')
                minute=values[8]
                if isinstance(minute,bool) or not isinstance(minute,(int,float)) or not math.isfinite(minute) or minute<=0:raise ValueError('Invalid study-time estimate')
                locator={'file':path.name,'sheet':'Master Table','row':rownum}
                if key in records:
                    if records[key]['fields']!=data:raise ValueError(f'Conflicting Topic ID: {key}')
                    records[key]['sources'].append(locator);duplicates+=1
                else:
                    records[key]={'topic_id':key,'fields':data,'pages':pages(values[5]),
                                  'subtopics':subtopics(str(values[4])),'sources':[locator]}
                count+=1
            sources.append({'file':path.name,'sha256':checksum(path),'rows':count})
        finally:wb.close()
    if not records:raise ValueError('No First Aid records')
    ordered=sorted(records.values(),key=lambda r:(r['pages'][0],r['sources'][0]['file'],r['sources'][0]['row']))
    return {'schema_version':ALGORITHM,'verification':'user_verified; structural checks performed; no independent medical revalidation',
            'sources':sources,'separate_sources':separate,'duplicate_rows_collapsed':duplicates,'records':ordered}


def purge_firstaid(db):
    """Erase First Aid-only records. Never silently erase real progress."""
    ids="SELECT id FROM resource_items WHERE resource_id='firstaid'"
    for table in ('user_resource_progress','study_events'):
        if db.execute(f'SELECT 1 FROM {table} WHERE item_id IN ({ids}) LIMIT 1').fetchone():
            raise ValueError('First Aid progress exists; explicit progress migration is required')
    db.execute("DELETE FROM resource_outline_item_links WHERE outline_id IN (SELECT id FROM resource_outline_versions WHERE resource_id='firstaid')")
    db.execute("DELETE FROM resource_outline_entries WHERE outline_id IN (SELECT id FROM resource_outline_versions WHERE resource_id='firstaid')")
    db.execute("DELETE FROM resource_outline_versions WHERE resource_id='firstaid'")
    # Delete leaves before parents (the legacy outline can have multiple depths).
    while db.execute("SELECT 1 FROM resource_outline_nodes WHERE resource_id='firstaid' LIMIT 1").fetchone():
        cur=db.execute("DELETE FROM resource_outline_nodes WHERE resource_id='firstaid' AND id NOT IN (SELECT parent_id FROM resource_outline_nodes WHERE parent_id IS NOT NULL)")
        if not cur.rowcount:raise ValueError('Cyclic legacy outline')
    for table in ('study_unit_resource_candidates','topic_resource_mappings','resource_question_mappings'):
        db.execute(f'DELETE FROM {table} WHERE item_id IN ({ids})')
    db.execute(f'DELETE FROM resource_resource_mappings WHERE from_item_id IN ({ids}) OR to_item_id IN ({ids})')
    db.execute('DELETE FROM firstaid_workbook_rows')
    db.execute(f'DELETE FROM resource_item_versions WHERE item_id IN ({ids})')
    db.execute("DELETE FROM resource_catalog_versions WHERE resource_id='firstaid'")
    db.execute("DELETE FROM resource_items WHERE resource_id='firstaid'")


def replace(db,manifest_path):
    data=json.loads(Path(manifest_path).read_text(encoding='utf-8'))
    if data.get('schema_version')!=ALGORITHM or not data.get('records'):raise ValueError('Invalid First Aid manifest')
    # The generated manifest is private, immutable provenance for the combined catalog.
    records=data['records'];old=db.execute("SELECT count(*) FROM current_resource_items WHERE resource_id='firstaid'").fetchone()[0]
    counts=Counter(r['fields']['System'] for r in records)
    report={'topics':len(records),'subtopics':sum(len(r['subtopics']) for r in records),'systems':dict(counts),
            'duplicate_rows_collapsed':data['duplicate_rows_collapsed'],'source_files':len(data['sources']),
            'verification':data['verification'],'algorithm':ALGORITHM,'all_nodes_require_review':False}
    with db:
        purge_firstaid(db)
        db.execute("INSERT OR IGNORE INTO resources VALUES('firstaid','firstaid','step1','reference')")
        sid=snapshot(db,manifest_path,'firstaid',len(records),report,source_version='2025-35th',parser_config={'algorithm':ALGORITHM})
        cid=stable('catalog','firstaid',sid);oid=stable('resource-outline',cid,ALGORITHM)
        db.execute('INSERT INTO resource_catalog_versions VALUES(?,?,?,1)',(cid,'firstaid',sid))
        db.execute('INSERT INTO resource_outline_versions VALUES(?,?,?,?,?)',(oid,'firstaid',cid,ALGORITHM,json.dumps(report)))
        for sequence,r in enumerate(records,1):
            f=r['fields'];iid=stable('item','firstaid',r['topic_id']);nid=stable('fa-workbook-node',cid,r['topic_id'])
            db.execute('INSERT INTO resource_items VALUES(?,?,?)',(iid,'firstaid',r['topic_id']))
            db.execute('INSERT INTO resource_item_versions VALUES(?,?,?,?,?,?,?,?,?,?)',
                (iid,cid,f['Main Topic'],norm(f['Main Topic']),f['System'],f['Chapter/Section'],None,json.dumps(r['pages']),json.dumps(r['sources']),'user_verified'))
            db.execute('INSERT INTO firstaid_workbook_rows VALUES(?,?,?,?,?)',(iid,cid,sequence,json.dumps(f,ensure_ascii=False),json.dumps(r['sources'])))
            db.execute('INSERT INTO resource_outline_nodes VALUES(?,?,?,?,?)',(nid,'firstaid',None,f['Main Topic'],'topic'))
            db.execute('INSERT INTO resource_outline_entries VALUES(?,?,?,?,?)',(oid,nid,json.dumps(r['pages']),json.dumps(r['sources']),'reviewed'))
            db.execute('INSERT INTO resource_outline_item_links VALUES(?,?,?)',(oid,nid,iid))
            for sub in r['subtopics']:
                child=stable('fa-workbook-node',cid,r['topic_id'],sub['ordinal'])
                db.execute('INSERT INTO resource_outline_nodes VALUES(?,?,?,?,?)',(child,'firstaid',nid,sub['text'],'subtopic'))
                locators=[{**loc,'subtopic_ordinal':sub['ordinal']} for loc in r['sources']]
                db.execute('INSERT INTO resource_outline_entries VALUES(?,?,?,?,?)',(oid,child,json.dumps(sub['pages']),json.dumps(locators),'reviewed'))
                db.execute('INSERT INTO resource_outline_item_links VALUES(?,?,?)',(oid,child,iid))
        if db.execute('PRAGMA foreign_key_check').fetchall():raise ValueError('Foreign key check failed')
    return {**report,'replaced_active_records':old,'catalog_id':cid,'outline_id':oid}


def export(db):
    rows=[]
    for r in db.execute('''SELECT w.*,i.source_key,i.page_refs FROM firstaid_workbook_rows w
        JOIN current_resource_items i ON i.id=w.item_id AND i.catalog_id=w.catalog_id ORDER BY w.sequence'''):
        rows.append({'topic_id':r['source_key'],'fields':json.loads(r['fields_json']),
                     'pages':json.loads(r['page_refs']),'sources':json.loads(r['sources_json'])})
    if not rows:raise ValueError('No current workbook catalog')
    sequence={}
    for r in rows:
        for page in r['pages']:sequence.setdefault(page,[]).append(r['topic_id'])
    return {'schema_version':ALGORITHM,'records':rows,
            'reading_sequence':[{'page':p,'topic_ids':ids} for p,ids in sorted(sequence.items())],
            'study_time_policy':'User-supplied estimates, not measured student performance; do not count the whole topic estimate at every page'}
