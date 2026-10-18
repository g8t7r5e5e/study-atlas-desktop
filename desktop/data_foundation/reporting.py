"""Aggregate public report plus explicitly local-only metadata exports."""
import csv
import json
import sqlite3
from pathlib import Path
from .core import norm, stable


def seed_categories(db):
    data = json.loads(Path(__file__).with_name('official_categories.json').read_text())
    with db:
        for level, key in [('system','systems'), ('discipline','disciplines')]:
            for name in data[key]:
                db.execute('INSERT OR IGNORE INTO topics VALUES(?,?,?,?,?,?,?,?)',
                           (stable('usmle-category', level, name), name, norm(name), level, 'official_category', None, data['version'], None))


def report(db):
    def scalar(sql, args=()):
        return db.execute(sql, args).fetchone()[0]
    resources = [dict(r) for r in db.execute('SELECT resource_id,count(*) AS records,sum(duration_seconds) AS runtime_seconds,sum(duration_seconds IS NULL) AS missing_durations FROM current_resource_items GROUP BY resource_id')]
    for resource in resources:
        key = resource['resource_id']
        matched = scalar('SELECT count(DISTINCT item_id) FROM current_candidate_question_links WHERE resource_id=?', (key,))
        covered_qids = scalar('SELECT count(DISTINCT question_id) FROM current_candidate_question_links WHERE resource_id=?', (key,))
        resource.update(items_with_candidate_links=matched, unmatched_items=resource['records']-matched,
                        candidate_qid_coverage=covered_qids, reviewed_qid_links=0)
    candidate_sql = '''FROM topic_resource_mappings m JOIN mapping_evidence e ON e.id=m.evidence_id
    JOIN current_resource_items i ON i.id=m.item_id AND i.snapshot_id=e.snapshot_id
    JOIN topic_question_mappings tq ON tq.topic_id=m.topic_id
    JOIN mapping_evidence qe ON qe.id=tq.evidence_id
    JOIN current_questions q ON q.id=tq.question_id AND q.snapshot_id=qe.snapshot_id'''
    sources = []
    for row in db.execute('SELECT * FROM source_snapshots ORDER BY source_key,id'):
        s = dict(row)
        validation = json.loads(s.pop('validation_json'))
        # Public reports contain counts, not extracted proprietary titles/rows.
        s['validation'] = {k:v for k,v in validation.items() if k not in ('warnings','raw_ocr_lines')}
        s['warning_count'] = len(validation.get('warnings', []))
        sources.append(s)
    qcount = scalar('SELECT count(*) FROM current_questions')
    covered = scalar('SELECT count(DISTINCT q.id) ' + candidate_sql + " WHERE e.validation_status='candidate'")
    return {
        'schema_version': 'study-atlas-data-report/v1',
        'question_records': qcount,
        'source_label_topics': scalar("SELECT count(*) FROM topics WHERE origin='internal_source_label'"),
        'official_categories': scalar("SELECT count(*) FROM topics WHERE origin='official_category'"),
        'resources': resources,
        'exact_title_candidates': scalar('SELECT count(DISTINCT m.evidence_id) '+candidate_sql+" WHERE e.evidence_type='exact_title'"),
        'fuzzy_title_candidates': scalar('SELECT count(DISTINCT m.evidence_id) '+candidate_sql+" WHERE e.evidence_type='fuzzy_title'"),
        'question_ids_with_candidate_resource_links': covered,
        'candidate_question_coverage_percent': round(100*covered/qcount, 2) if qcount else 0,
        'reviewed_cross_resource_links': scalar("SELECT count(*) FROM resource_question_mappings m JOIN mapping_evidence e ON e.id=m.evidence_id WHERE e.validation_status='reviewed'"),
        'pending_review_items': scalar("SELECT count(*) FROM review_queue WHERE status='pending'"),
        'anki_notes': scalar('SELECT count(*) FROM anki_notes'), 'anki_cards': scalar('SELECT count(*) FROM anki_cards'),
        'foreign_key_errors': [list(r) for r in db.execute('PRAGMA foreign_key_check')],
        'integrity_check': scalar('PRAGMA integrity_check'),
        'sources': sources,
        'planner_gate': {'ready': False, 'reason': 'Review checkpoint before planner integration: opaque classifications, provisional IDs, OCR/index review, and zero reviewed QID crosswalks.'},
        'limitations': [
            'Snapshot count is not the current official question-bank size.',
            'Title and fuzzy matches are review candidates, never verified medical mappings.',
            'No student activity or AnKing collection was supplied.',
            'First Aid entries are partial index references, not a chapter workload catalog.',
            'Pathoma rows can group multiple lessons under one runtime.',
            'The separately named backend research document was not among the attachments.',
        ]
    }


def write_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def private_export(db, directory):
    """Local-only metadata, not a public distributable. Never includes question text."""
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    names = ['current_questions','current_resource_items','topics','topic_aliases',
             'topic_question_mappings','topic_resource_mappings','resource_question_mappings',
             'resource_resource_mappings','mapping_evidence','review_queue','source_snapshots',
             'current_candidate_question_links']
    for name in names:
        cur = db.execute('SELECT * FROM ' + name)
        cols = [d[0] for d in cur.description]
        data = [dict(r) for r in cur]
        write_json(directory / (name + '.json'), data)
        with (directory / (name + '.csv')).open('w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=cols)
            writer.writeheader()
            # Prevent formula execution when metadata is opened in a spreadsheet.
            for row in data:
                writer.writerow({k: "'"+v if isinstance(v,str) and v.startswith(('=','+','-','@','\t','\r')) else v for k,v in row.items()})
    with sqlite3.connect(directory / 'study-atlas.sqlite') as target:
        db.backup(target)
    write_json(directory / 'coverage.json', report(db))
    unmatched_items=[dict(r) for r in db.execute('SELECT * FROM current_resource_items WHERE id NOT IN (SELECT item_id FROM current_candidate_question_links)')]
    unmatched_questions=[dict(r) for r in db.execute('SELECT * FROM current_questions WHERE id NOT IN (SELECT question_id FROM current_candidate_question_links)')]
    write_json(directory / 'unmatched_resource_items.json',unmatched_items)
    write_json(directory / 'unmatched_questions.json',unmatched_questions)
    (directory / 'PRIVATE_LOCAL_ONLY.txt').write_text('User-supplied metadata and review evidence. Do not upload, commit or redistribute. Original question bodies and explanations are excluded.\n')
