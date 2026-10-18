"""Metadata extraction from a user-supplied CLOSED backup, opened read-only."""
import sqlite3
from pathlib import Path
from .core import evidence, issue, norm, snapshot, stable
from .mappings import parse_tag


def import_anki(db, path, *, collection, confirmed_backup=False):
    path = Path(path).resolve()
    if not confirmed_backup:
        raise ValueError('Use --confirmed-backup only for an authorized, closed backup copy')
    if Path(str(path) + '-wal').exists() or Path(str(path) + '-journal').exists():
        raise ValueError('Backup has a WAL/journal; create a consistent closed Anki backup first')
    src = sqlite3.connect(path.as_uri() + '?mode=ro', uri=True)
    try:
        if src.execute('PRAGMA quick_check').fetchone()[0] != 'ok':
            raise ValueError('Anki backup failed integrity check')
        notes = src.execute('SELECT id,guid,tags FROM notes').fetchall()
        cards = src.execute('SELECT id,nid,queue,due,ivl,reps,lapses FROM cards').fetchall()
    finally:
        src.close()
    report = {'notes': len(notes), 'cards': len(cards), 'resource_tag_counts': {}, 'qid_tags': 0,
              'matched_qid_tags': 0, 'unmatched_qid_tags': 0, 'ambiguous_product_tags': 0,
              'matched_resource_tags': 0, 'unmatched_resource_tags': 0, 'ambiguous_resource_tags': 0,
              'cotag_candidates': 0}
    with db:
        sid = snapshot(db, path, 'anki:' + collection, len(notes), report, parser_config={'collection': collection})
        db.execute('INSERT OR IGNORE INTO anki_collections VALUES(?,?)', (collection, collection))
        for nid, guid, tags in notes:
            note_id = stable('anki-note', collection, str(nid))
            db.execute('INSERT INTO anki_notes VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET guid=excluded.guid,snapshot_id=excluded.snapshot_id', (note_id, collection, str(nid), guid, sid))
            db.execute('DELETE FROM anki_note_tags WHERE note_id=?', (note_id,))
            question_ids, resource_ids = set(), set()
            for tag in tags.split():
                parsed = parse_tag(tag)
                tid = stable('anki-tag', tag)
                db.execute('INSERT OR IGNORE INTO anki_tags VALUES(?,?,?)', (tid, tag, parsed['resource'] if parsed else None))
                db.execute('INSERT OR IGNORE INTO anki_note_tags VALUES(?,?)', (note_id, tid))
                if not parsed:
                    continue
                root = parsed['resource']
                report['resource_tag_counts'][root] = report['resource_tag_counts'].get(root, 0) + 1
                if root == 'uworld' and parsed['qid']:
                    report['qid_tags'] += 1
                    if not parsed['product']:
                        report['ambiguous_product_tags'] += 1
                        issue(db, sid, 'anki_product_ambiguous', note_id, tag)
                        continue
                    match = db.execute('SELECT id FROM current_questions WHERE provider=? AND product=? AND qid=?', ('uworld', parsed['product'], parsed['qid'])).fetchone()
                    if match:
                        question_ids.add(match[0])
                        report['matched_qid_tags'] += 1
                    else:
                        report['unmatched_qid_tags'] += 1
                        issue(db, sid, 'anki_qid_absent_from_snapshot', note_id, tag + '; absence does not establish stale provider ID')
                elif root != 'uworld':
                    label = norm(parsed['leaf'].replace('_', ' '))
                    matches = list(db.execute('SELECT id FROM current_resource_items WHERE resource_id=? AND normalized_title=?', (root, label)))
                    if len(matches) == 1:
                        resource_ids.add(matches[0][0])
                        report['matched_resource_tags'] += 1
                    else:
                        report['ambiguous_resource_tags' if matches else 'unmatched_resource_tags'] += 1
                        issue(db, sid, 'anki_resource_review', note_id, tag)
            for iid in resource_ids:
                for qid in question_ids:
                    eid = evidence(db, sid, 'anki_cotag', .6, 'candidate', note_id, f'Shared note tags: item={iid};question={qid}; not equivalence')
                    db.execute('INSERT OR IGNORE INTO resource_question_mappings VALUES(?,?,?)', (iid, qid, eid))
                    report['cotag_candidates'] += 1
        for cid, nid, queue, due, interval, reps, lapses in cards:
            db.execute('INSERT INTO anki_cards VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET queue=excluded.queue,due=excluded.due,interval=excluded.interval,reps=excluded.reps,lapses=excluded.lapses,suspended=excluded.suspended,snapshot_id=excluded.snapshot_id',
                       (stable('anki-card', collection, str(cid)), stable('anki-note', collection, str(nid)), str(cid), queue, due, interval, reps, lapses, int(queue == -1), sid))
        import json
        db.execute('UPDATE source_snapshots SET validation_json=? WHERE id=?', (json.dumps(report), sid))
    return {'snapshot_id': sid, **report}
