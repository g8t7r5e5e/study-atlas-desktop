"""Compact editorial curriculum; resource links remain reviewable title candidates."""
import json
from collections import Counter, defaultdict
from pathlib import Path
from functools import lru_cache
from .core import norm, stable


def definitions():
    data = json.loads(Path(__file__).with_name('study_units.json').read_text())
    ids = [u['id'] for u in data['units']]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate curriculum IDs')
    return data


@lru_cache(maxsize=20000)
def padded(value):
    return " " + norm(value) + " "


def matches(title, terms):
    text = padded(title)
    return [t for t in terms if padded(t) in text]


def build(db):
    data = definitions()
    did = stable('curriculum', data)
    items = [dict(r) for r in db.execute('SELECT * FROM current_resource_items')]
    links = []
    for u in data['units']:
        for r in items:
            terms = matches(r['title'], u.get('firstaid_terms',u['terms']) if r['resource_id']=='firstaid' else u['terms'])
            if not terms:
                continue
            pages = []
            if r['resource_id'] == 'firstaid':
                lo, hi = u['firstaid_pages']
                pages = [p for p in json.loads(r['page_refs'] or '[]') if lo <= p < hi]
                if not pages:
                    continue
            elif r['resource_id'] == 'bnb':
                if r['module'] not in u['bnb_modules']:
                    continue
            else:
                # Other resources need explicit module/edition-aware rules.
                continue
            links.append((did,u['id'],r['id'],r['catalog_id'],json.dumps(terms),json.dumps(pages)))
    with db:
        db.executemany('INSERT OR IGNORE INTO study_unit_definitions VALUES(?,?,?,?,?,?)',
                       [(did,u['id'],u['system'],u['sequence'],u['title'],json.dumps(u)) for u in data['units']])
        db.executemany('INSERT OR IGNORE INTO study_unit_resource_candidates '
                       '(definition_id,unit_id,item_id,catalog_id,matched_terms,page_refs) VALUES(?,?,?,?,?,?)', links)
    return export(db)


def order_units(units):
    """Only source-backed pages establish position; IDs are never ordering keys."""
    units.sort(key=lambda u:(not bool(u['firstaid_index_pages']),
                            min(u['firstaid_index_pages'],default=float('inf')),
                            u['title'],u['id']))
    system_positions=Counter()
    for position,u in enumerate((u for u in units if u['firstaid_index_pages']),1):
        system_positions[u['system']]+=1
        u.update(sequence=system_positions[u['system']],reading_order=position,
                 firstaid_start_page=min(u['firstaid_index_pages']),
                 ordering_status='index_page_candidate')
    for u in units:
        if not u['firstaid_index_pages']:
            u.update(sequence=None,reading_order=None,firstaid_start_page=None,
                     ordering_status='unresolved_no_page_evidence')
    return units


def reading_sequence(units):
    """Page buckets avoid backtracking even when a unit has noncontiguous refs.

    Crosslinks stay attached to the owning unit, not to a new ordinal. A shared
    video/question is assigned only at its first occurrence in this selection.
    """
    pages=defaultdict(list)
    for u in units:
        for page in u['firstaid_index_pages']:
            pages[page].append(u)
    seen_resources=set();seen_questions=set();result=[]
    for page,owners in sorted(pages.items()):
        resources=[];questions=[]
        for u in owners:
            for r in u['resource_candidates']:
                if r['resource_id']=='firstaid':
                    if page in r['page_refs'] and not any(x['item_id']==r['item_id'] for x in resources):
                        resources.append({**r,'page_refs':[page]})
                    continue
                if r['item_id'] not in seen_resources:
                    resources.append(r);seen_resources.add(r['item_id'])
            for q in u['question_candidates']:
                if q['question_id'] not in seen_questions:
                    questions.append(q);seen_questions.add(q['question_id'])
        result.append({'page':page,'unit_ids':[u['id'] for u in owners],
                       'resource_candidates':resources,'question_candidates':questions,
                       'requires_review':True})
    return result


def export(db):
    data = definitions(); did = stable('curriculum', data)
    if not db.execute('SELECT 1 FROM study_unit_definitions WHERE definition_id=?',(did,)).fetchone():
        raise ValueError('Build the current study-unit definitions first')
    byunit = defaultdict(list)
    for row in db.execute('''SELECT l.*,i.resource_id,i.title,i.duration_seconds,i.snapshot_id
          FROM study_unit_resource_candidates l JOIN current_resource_items i
          ON i.id=l.item_id AND i.catalog_id=l.catalog_id WHERE l.definition_id=?''',(did,)):
        r=dict(row);r['page_refs']=json.loads(r['page_refs']);r['matched_terms']=json.loads(r['matched_terms'])
        byunit[r['unit_id']].append(r)
    qlinks=defaultdict(dict)
    for row in db.execute("SELECT * FROM current_candidate_question_links WHERE validation_status<>'rejected'"):
        r=dict(row);qlinks[r['item_id']][r['question_id']]=r
    units=[];allq=set();linked=set();memberships=Counter()
    for u in data['units']:
        links=sorted(byunit[u['id']],key=lambda r:(r['resource_id'],r['item_id']))
        vids=[r for r in links if r['resource_id']=='bnb']
        qs={q:val for r in links for q,val in qlinks[r['item_id']].items()}
        allq.update(qs);linked.update(r['item_id'] for r in links);memberships.update(r['item_id'] for r in vids)
        units.append({k:u[k] for k in ('id','system','sequence','title')} | {
            'status':'editorial_draft','resource_candidates':links,
            'firstaid_index_pages':sorted({p for r in links for p in r['page_refs']}),
            'bnb_runtime_seconds':sum(r['duration_seconds'] or 0 for r in vids),
            'bnb_missing_durations':sum(r['duration_seconds'] is None for r in vids),
            'question_candidates':sorted(qs.values(),key=lambda r:r['question_id']),
            'question_candidate_count':len(qs), 'reviewed_unit_question_links':0,
            'anki_card_count':None,'anki_status':'unit_crosswalk_not_supplied',
            'reading_minutes':None,'question_minutes':None,'anki_minutes':None,
            'ready_for_automatic_scheduling':False})
    order_units(units)
    page_sequence=reading_sequence(units)
    catalog=[dict(r) for r in db.execute('SELECT id,resource_id,catalog_id FROM current_resource_items')]
    report={'definition_id':did,'study_units':len(units),'units_per_system':dict(Counter(u['system'] for u in units)),
            'units_with_bnb_candidates':sum(any(r['resource_id']=='bnb' for r in u['resource_candidates']) for u in units),
            'units_with_firstaid_candidates':sum(bool(u['firstaid_index_pages']) for u in units),
            'units_with_question_candidates':sum(u['question_candidate_count']>0 for u in units),
            'distinct_question_candidates':len(allq),'reviewed_unit_question_links':0,
            'bnb_items_in_multiple_units':sum(n>1 for n in memberships.values()),
            'resource_coverage':{res:{'total':sum(r['resource_id']==res for r in catalog),
                  'linked_candidates':sum(r['resource_id']==res and r['id'] in linked for r in catalog)} for res in ('bnb','firstaid')},
            'anki_unit_crosswalk_available':False,
            'units_with_page_order':sum(u['reading_order'] is not None for u in units),
            'units_with_unresolved_order':sum(u['reading_order'] is None for u in units),
            'reading_page_steps':len(page_sequence),
            'backward_page_transitions':sum(a['page']>=b['page'] for a,b in zip(page_sequence,page_sequence[1:]))}
    return {'schema_version':'study-atlas-study-units/v2','definition_id':did,'report':report,'units':units,
            'reading_sequence':page_sequence,
            'unresolved_unit_ids':[u['id'] for u in units if u['reading_order'] is None],
            'unassigned_resource_item_ids':[r['id'] for r in catalog if r['resource_id'] in ('bnb','firstaid') and r['id'] not in linked],
            'policy':'Read reading_sequence in ascending printed-page order; never schedule whole multi-page units by their first page alone. Units without page evidence are excluded from that sequence. Editorial units, not official First Aid headings. Chapter-scoped index pointers and title links require review. No inferred page spans or complete MCQ/Anki coverage. Deduplicate shared items across units before scheduling.'}


def select(db, unit_ids):
    data=export(db); chosen=set(unit_ids); known={u['id'] for u in data['units']}
    if not chosen or not chosen <= known:
        raise ValueError('Select known study-unit IDs')
    units=[u for u in data['units'] if u['id'] in chosen]
    resources={r['item_id']:r for u in units for r in u['resource_candidates']}
    qs={r['question_id']:r for u in units for r in u['question_candidates']}
    return {'definition_id':data['definition_id'],'selected_unit_ids':[u['id'] for u in units],
            'reading_sequence':reading_sequence(units),
            'unresolved_unit_ids':[u['id'] for u in units if u['reading_order'] is None],
            'resource_candidates':list(resources.values()),'question_candidates':list(qs.values()),
            'firstaid_index_pages':sorted({p for u in units for p in u['firstaid_index_pages']}),
            'bnb_runtime_seconds':sum(r['duration_seconds'] or 0 for r in resources.values() if r['resource_id']=='bnb'),
            'anki_card_count':None,'estimated_total_minutes':None,'requires_review':True,'activated':False}
