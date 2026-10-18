"""Small SQLite repository. Catalog replacement never deletes progress or history."""
import hashlib
import json
import re
import sqlite3
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

VERSION = '1.0.2'


def now():
    return datetime.now(timezone.utc).isoformat()


def norm(value):
    value = unicodedata.normalize('NFKC', str(value)).casefold().replace('_', ' ')
    return re.sub(r'[^\w]+', ' ', value, flags=re.UNICODE).strip()


def stable(prefix, *parts):
    return prefix + ':' + hashlib.sha256(json.dumps(parts, ensure_ascii=False).encode()).hexdigest()[:24]


def checksum(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def connect(path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    version = db.execute('PRAGMA user_version').fetchone()[0]
    if version > 2:
        db.close()
        raise ValueError('Database schema is newer than this importer')
    db.executescript(Path(__file__).with_name('schema.sql').read_text())
    db.executescript(Path(__file__).with_name('outline_schema.sql').read_text())
    db.execute('INSERT OR IGNORE INTO schema_migrations VALUES(1,?)', (now(),))
    db.execute('INSERT OR IGNORE INTO schema_migrations VALUES(2,?)', (now(),))
    db.execute('PRAGMA user_version=2')
    db.commit()
    return db


def snapshot(db, path, source_key, count, report, *, source_version=None, owner='User-supplied source', url=None, parser_config=None):
    sha = checksum(path)
    parser = VERSION + ':' + stable('config', parser_config or {})
    sid = stable('source', source_key, sha, parser)
    db.execute('INSERT OR IGNORE INTO source_snapshots VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
               (sid, source_key, Path(path).name, sha, now(), source_version,
                Path(path).suffix.lstrip('.'), owner, 'private_local_only', url,
                count, parser, json.dumps(report, ensure_ascii=False)))
    return sid


def issue(db, sid, kind, locator, detail):
    db.execute('INSERT OR IGNORE INTO review_queue(id,snapshot_id,kind,locator,detail) VALUES(?,?,?,?,?)',
               (stable('review', sid, kind, locator, detail), sid, kind, str(locator), detail))


def evidence(db, sid, kind, confidence, status, locator, detail):
    eid = stable('evidence', sid, kind, locator, detail)
    db.execute('INSERT OR IGNORE INTO mapping_evidence VALUES(?,?,?,?,?,?,?,?)',
               (eid, sid, kind, confidence, status, str(locator), detail, 'private_local_only'))
    return eid


def topic(db, label, sid):
    tid = stable('topic', norm(label))
    db.execute('INSERT OR IGNORE INTO topics VALUES(?,?,?,?,?,?,?,?)',
               (tid, label, norm(label), 'topic', 'internal_source_label', None, 'source-labels-v1', sid))
    db.execute('INSERT OR IGNORE INTO topic_aliases VALUES(?,?)', (tid, label))
    return tid


def import_catalog(db, path, resource, rows, report, *, allow_smaller=False, config=None):
    if not rows:
        raise ValueError('Empty catalog rejected')
    keys = [r['source_key'] for r in rows]
    if len(set(keys)) != len(keys):
        raise ValueError('Duplicate resource source keys; provide stable disambiguated IDs')
    for row in rows:
        if not row.get('title', '').strip():
            raise ValueError('Empty title')
        duration = row.get('duration_seconds')
        if duration is not None and (not isinstance(duration, int) or duration <= 0):
            raise ValueError('Duration must be positive integer seconds or null')
    previous = db.execute('SELECT count(*) FROM current_resource_items WHERE resource_id=?', (resource,)).fetchone()[0]
    if len(rows) < previous and not allow_smaller:
        raise ValueError(f'Smaller catalog blocked ({len(rows)} < {previous}); review then use --allow-smaller')
    with db:
        db.execute('INSERT OR IGNORE INTO resources VALUES(?,?,?,?)', (resource, resource, 'step1', 'reference' if resource == 'firstaid' else 'video'))
        sid = snapshot(db, path, resource, len(rows), report, parser_config=config)
        cid = stable('catalog', resource, sid)
        db.execute('UPDATE resource_catalog_versions SET is_current=0 WHERE resource_id=?', (resource,))
        db.execute('INSERT INTO resource_catalog_versions VALUES(?,?,?,1) ON CONFLICT(id) DO UPDATE SET is_current=1', (cid, resource, sid))
        for row in rows:
            iid = stable('item', resource, row['source_key'])
            db.execute('INSERT OR IGNORE INTO resource_items VALUES(?,?,?)', (iid, resource, row['source_key']))
            db.execute('INSERT OR IGNORE INTO resource_item_versions VALUES(?,?,?,?,?,?,?,?,?,?)',
                       (iid, cid, row['title'], norm(row['title']), row.get('module'), row.get('section'),
                        row.get('duration_seconds'), json.dumps(row.get('page_refs')) if row.get('page_refs') else None,
                        row['locator'], row.get('status', 'source_extracted')))
            if row.get('status', '').startswith('review'):
                issue(db, sid, 'extraction_review', row['locator'], row['title'])
        for warning in report.get('warnings', []):
            issue(db, sid, 'source_warning', resource, json.dumps(warning))
    return {'snapshot_id': sid, 'catalog_id': cid, 'records': len(rows), **report}


def activate(db, catalog_id):
    """Rollback metadata by activating an existing snapshot; user records untouched."""
    with db:
        row = db.execute('SELECT * FROM resource_catalog_versions WHERE id=?', (catalog_id,)).fetchone()
        if row:
            db.execute('UPDATE resource_catalog_versions SET is_current=0 WHERE resource_id=?', (row['resource_id'],))
            db.execute('UPDATE resource_catalog_versions SET is_current=1 WHERE id=?', (catalog_id,))
            return
        row = db.execute('SELECT * FROM question_catalog_snapshots WHERE id=?', (catalog_id,)).fetchone()
        if not row:
            raise ValueError('Unknown catalog version')
        db.execute('UPDATE question_catalog_snapshots SET is_current=0 WHERE provider=? AND product=?', (row['provider'], row['product']))
        db.execute('UPDATE question_catalog_snapshots SET is_current=1 WHERE id=?', (catalog_id,))


def catalog_dto(db, resource=None):
    """Contract for future desktop main-process calls; no privileged renderer access."""
    sql = 'SELECT * FROM current_resource_items'
    return [dict(r) for r in db.execute(sql + (' WHERE resource_id=?' if resource else '') + ' ORDER BY resource_id,source_key', (resource,) if resource else ())]
