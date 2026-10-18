"""Evidence-backed index hierarchy, separate from the raw catalog and clinical taxonomy."""
import json
import re
from collections import Counter, defaultdict
from .core import checksum, norm, stable

ALGORITHM = 'firstaid-indentation/v1'
# Printed chapter starts read from the supplied 2025 edition's contents (PDF pp2-3).
# This is a browsing facet, not a claim that every page is a required reading task.
CHAPTERS = [(1,'Preparation and front matter'),(31,'Biochemistry'),(93,'Immunology'),
            (121,'Microbiology'),(201,'Pathology'),(227,'Pharmacology'),(255,'Public Health Sciences'),
            (283,'Cardiovascular'),(329,'Endocrine'),(363,'Gastrointestinal'),
            (409,'Hematology and Oncology'),(449,'Musculoskeletal, Skin, and Connective Tissue'),
            (499,'Neurology and Special Senses'),(569,'Psychiatry'),(595,'Renal'),
            (629,'Reproductive'),(677,'Respiratory'),(707,'Rapid Review'),(739,'Review resources and back matter')]


def chapter(page):
    return next(title for start,title in reversed(CHAPTERS) if page>=start)


def parse_entry(text):
    m=re.match(r'^(.*?),\s*(\d{1,3}(?:[–-]\d{1,3})?(?:\s*,\s*\d{1,3}(?:[–-]\d{1,3})?)*)$',text)
    if not m:
        return text.strip(), []
    pages=set()
    for token in m[2].split(','):
        ends=re.split('[–-]',token.strip());lo,hi=int(ends[0]),int(ends[-1])
        if lo<1 or hi>843 or hi<lo or hi-lo>100:
            return text.strip(),[]
        pages.update(range(lo,hi+1))
    return m[1].strip(), sorted(pages)


def logical_entries(lines):
    """Indent >=24pt denotes wrapped text; 0/8/16pt denote hierarchy levels.

    `reset` isolates a missing printed-page gap. Never carry a parent across it.
    Lines are in printed column order, not a four-column interleaved text stream.
    """
    pending=None
    for line in lines:
        if line.get('reset'):
            if pending:yield pending;pending=None
            yield {'reset':True}
            continue
        text=' '.join(line['text'].split())
        if not text:continue
        if len(text)==1 and text.isalpha():
            if pending:yield pending;pending=None
            yield {'reset':True}
            continue
        indent=line['indent']
        if indent>=23 and pending:
            pending['text']+=' '+text
            pending['locators'].append(line['locator'])
        else:
            if pending:yield pending
            pending={'text':text,'depth':min(2,max(0,round(indent/8))),
                     'locators':[line['locator']], 'orphan_wrap':indent>=23}
    if pending:yield pending


def pdf_lines(path):
    import pdfplumber
    previous=None
    with pdfplumber.open(path) as pdf:
        for p,page in enumerate(pdf.pages,1):
            top=page.crop((0,0,page.width,70)).extract_text() or ''
            number=re.search(r'\b(7[7-9]\d|8[0-4]\d)\b',top)
            if p==4:
                printed,start_y,base=773,220,87
            elif number and 'INDEX' in top:
                printed,start_y=int(number[1]),65
                chars=[c for c in page.chars if 65<c['top']<780 and c['text'].strip()]
                base=69 if min(c['x0'] for c in chars)<80 else 87
            else:continue
            if previous is not None and printed!=previous+1:yield {'reset':True}
            previous=printed
            for col in range(4):
                left=base+col*132.75-.5
                crop=page.crop((left,start_y,min(left+132.5,page.width),785))
                for n,line in enumerate(crop.extract_text_lines(x_tolerance=1.5,y_tolerance=3),1):
                    yield {'text':line['text'],'indent':line['x0']-(left+.5),
                           'locator':f'pdf-page:{p}:column:{col+1}:line:{n}'}


def structure(lines):
    nodes={};stack={};locator_nodes={};orphan_count=0
    def ensure(title,parent,level):
        nid=stable('fa-outline-node','2025-35th',parent,norm(title))
        nodes.setdefault(nid,{'id':nid,'parent_id':parent,'title':title,'level':level,'pages':set(),'locators':[]})
        return nid
    for entry in logical_entries(lines):
        if entry.get('reset'):stack={};continue
        label,pages=parse_entry(entry['text'])
        depth=entry['depth']
        if depth and (depth-1 not in stack or entry['orphan_wrap']):
            parent=ensure('Unresolved index context',None,'review_group')
            orphan_count+=1
        else:parent=stack.get(depth-1) if depth else None
        nid=ensure(label,parent,'subtopic' if parent else 'topic')
        nodes[nid]['pages'].update(pages);nodes[nid]['locators'].extend(entry['locators'])
        for locator in entry['locators']:locator_nodes[locator]=nid
        stack={d:n for d,n in stack.items() if d<depth};stack[depth]=nid
    return nodes,locator_nodes,orphan_count


def build(db,path):
    catalog=db.execute("SELECT c.id,c.snapshot_id,s.sha256 FROM resource_catalog_versions c JOIN source_snapshots s ON s.id=c.snapshot_id WHERE c.resource_id='firstaid' AND c.is_current=1").fetchone()
    if not catalog:raise ValueError('Import the First Aid catalog first')
    if checksum(path)!=catalog['sha256']:raise ValueError('PDF does not match the active First Aid snapshot')
    nodes,locators,orphan_count=structure(pdf_lines(path))
    outline_id=stable('resource-outline',catalog['id'],ALGORITHM)
    links=[];unlinked=0
    for item in db.execute("SELECT id,source_locator FROM current_resource_items WHERE resource_id='firstaid'"):
        nid=locators.get(item['source_locator'])
        if nid:links.append((outline_id,nid,item['id']))
        else:unlinked+=1
    stats={'algorithm':ALGORITHM,'topics':sum(n['level']=='topic' for n in nodes.values()),
           'subtopics':sum(n['level']=='subtopic' for n in nodes.values()),
           'review_groups':sum(n['level']=='review_group' for n in nodes.values()),
           'nodes_with_direct_page_references':sum(bool(n['pages']) for n in nodes.values()),
           'orphan_entries':orphan_count,'raw_catalog_entries_linked':len(links),
           'raw_catalog_entries_unlinked':unlinked,'all_nodes_require_review':True,
           'chapter_facet_source':'Supplied 2025 contents, PDF pages 2-3',
           'missing_printed_index_pages':[813]}
    with db:
        db.execute('INSERT OR IGNORE INTO resource_outline_versions VALUES(?,?,?,?,?)',(outline_id,'firstaid',catalog['id'],ALGORITHM,json.dumps(stats)))
        for n in nodes.values():
            db.execute('INSERT OR IGNORE INTO resource_outline_nodes VALUES(?,?,?,?,?)',(n['id'],'firstaid',n['parent_id'],n['title'],n['level']))
            db.execute('INSERT OR IGNORE INTO resource_outline_entries VALUES(?,?,?,?,?)',
                       (outline_id,n['id'],json.dumps(sorted(n['pages'])),json.dumps(n['locators']),'needs_review'))
        db.executemany('INSERT OR IGNORE INTO resource_outline_item_links VALUES(?,?,?)',links)
    return {'outline_id':outline_id,**stats}


def current_id(db):
    row=db.execute("SELECT o.id FROM resource_outline_versions o JOIN resource_catalog_versions c ON c.id=o.catalog_id WHERE c.is_current=1 AND o.resource_id='firstaid' AND o.algorithm_version=?",(ALGORITHM,)).fetchone()
    if not row:raise ValueError('Build the outline for the current First Aid catalog first')
    return row[0]


def outline(db):
    oid=current_id(db)
    nodes={r['id']:{**dict(r),'page_refs':json.loads(r['page_refs']),'children':[]} for r in db.execute(
        'SELECT n.id,n.parent_id,n.title,n.level,e.page_refs,e.review_status FROM resource_outline_nodes n JOIN resource_outline_entries e ON e.node_id=n.id WHERE e.outline_id=?',(oid,))}
    roots=[]
    for n in nodes.values():
        if n['parent_id'] in nodes:nodes[n['parent_id']]['children'].append(n)
        else:roots.append(n)
    def aggregate(n):
        pages=set(n['page_refs'])
        for child in n['children']:pages.update(aggregate(child))
        n['all_page_refs']=sorted(pages);n['chapters']=sorted({chapter(p) for p in pages})
        n['children'].sort(key=lambda c:norm(c['title']))
        return pages
    for n in roots:aggregate(n)
    roots.sort(key=lambda n:norm(n['title']))
    return {'schema_version':'study-atlas-resource-outline/v1','resource_id':'firstaid','outline_id':oid,
            'chapters':[{'title':title,'start_page':start} for start,title in CHAPTERS],
            'topics':roots,'duration_policy':'Not estimated from index references; student calibration required.'}


def selection(db,node_ids):
    """Resolve parent+child selections without duplicated nodes, pages or item IDs."""
    tree=outline(db);nodes={}
    def collect(n):
        nodes[n['id']]=n
        for c in n['children']:collect(c)
    for n in tree['topics']:collect(n)
    if not node_ids or any(n not in nodes for n in node_ids):raise ValueError('Select known current outline IDs')
    selected=set()
    def descend(n):
        if n['id'] in selected:return
        selected.add(n['id'])
        for child in n['children']:descend(child)
    for nid in node_ids:descend(nodes[nid])
    pages=sorted({p for nid in selected for p in nodes[nid]['page_refs']})
    if not pages:raise ValueError('Selected entries have no numeric page references; review them first')
    items=sorted({r['item_id'] for r in db.execute('SELECT node_id,item_id FROM resource_outline_item_links WHERE outline_id=?',(tree['outline_id'],)) if r['node_id'] in selected})
    return {'schema_version':'study-atlas-reading-selection/v1','resource_id':'firstaid','outline_id':tree['outline_id'],
            'selected_node_ids':sorted(selected),'resource_item_ids':items,'page_refs':pages,
            'distinct_referenced_pages':len(pages),'estimated_minutes':None,'requires_review':True,
            'warning':'Index pointers are not complete chapter coverage; review before scheduling. No plan has been activated.'}


def browse(db,*,chapter_name=None,query='',limit=100):
    if not isinstance(limit,int) or not 1<=limit<=500:raise ValueError('limit must be 1..500')
    if chapter_name is not None and chapter_name not in {title for _,title in CHAPTERS}:
        raise ValueError('Unknown First Aid chapter')
    tree=outline(db);matches=[];needle=norm(query)
    def searchable(node):
        return needle in norm(node['title']) or any(searchable(c) for c in node['children'])
    for topic in tree['topics']:
        if chapter_name and chapter_name not in topic['chapters']:continue
        if needle and not searchable(topic):continue
        pages=[p for p in topic['all_page_refs'] if chapter_name is None or chapter(p)==chapter_name]
        if not pages:continue
        matches.append({'id':topic['id'],'title':topic['title'],'subtopic_count':len(topic['children']),
                        'referenced_pages':pages,'chapters':topic['chapters'],'requires_review':True})
    return {'outline_id':tree['outline_id'],'matching_topics':len(matches),'topics':matches[:limit],
            'truncated':len(matches)>limit,'selection_scope':'Selecting a topic includes all its referenced chapters; page filters here affect browsing only.'}


def linked_resources(db,node_ids):
    """Carry existing evidence status into proposed links; never assert equivalence."""
    chosen=selection(db,node_ids);items=set(chosen['resource_item_ids'])
    topics={r['topic_id'] for r in db.execute('''SELECT m.topic_id,m.item_id FROM topic_resource_mappings m
        JOIN mapping_evidence e ON e.id=m.evidence_id
        JOIN current_resource_items i ON i.id=m.item_id AND i.snapshot_id=e.snapshot_id
        WHERE e.validation_status<>'rejected' ''') if r['item_id'] in items}
    results=[]
    for r in db.execute('''SELECT DISTINCT i.id,i.resource_id,i.title,m.topic_id,e.evidence_type,e.validation_status,e.confidence
        FROM topic_resource_mappings m JOIN mapping_evidence e ON e.id=m.evidence_id
        JOIN current_resource_items i ON i.id=m.item_id AND i.snapshot_id=e.snapshot_id
        WHERE i.resource_id<>'firstaid' AND e.validation_status<>'rejected' '''):
        if r['topic_id'] in topics:results.append(dict(r))
    return {'selection':chosen,'candidate_resources':results,'automatic_equivalence':False}
