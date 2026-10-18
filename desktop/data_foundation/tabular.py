"""Metadata-only CSV/JSON/XLSX adapters. Unknown fields never enter SQLite."""
import csv
import json
import math
import re
import zipfile
from collections import Counter
from pathlib import Path
from .core import evidence, issue, norm, snapshot, stable, topic

MAX_BYTES = 64 * 1024 * 1024
ALIASES = {
    'qid': ['qid', 'question id', 'id'], 'title': ['title', 'topic', 'question title', 'video title', 'name'],
    'subject': ['subid', 'subject code', 'subject'], 'system': ['sysid', 'system code', 'system'],
    'attempts': ['ppltaken', 'population attempts'], 'correct': ['corrtaken', 'population correct'],
    'updated': ['lastupdated', 'updated at'], 'source_key': ['source key', 'video id', 'id'],
    'module': ['module', 'system'], 'section': ['section', 'chapter'],
    'duration_seconds': ['duration seconds', 'duration_seconds'], 'duration_minutes': ['duration minutes', 'minutes'],
}


def load_rows(path):
    path = Path(path)
    if path.stat().st_size > MAX_BYTES:
        raise ValueError('File exceeds 64 MiB limit')
    if path.suffix.lower() == '.csv':
        with path.open(encoding='utf-8-sig', newline='') as f:
            reader = csv.DictReader(f)
            if not reader.fieldnames or len(set(reader.fieldnames)) != len(reader.fieldnames):
                raise ValueError('Missing or duplicate headers')
            rows = list(reader)
            if any(None in r or any(v is None for v in r.values()) for r in rows):
                raise ValueError('Malformed CSV row width')
    elif path.suffix.lower() == '.json':
        rows = json.loads(path.read_text(encoding='utf-8-sig'))
        if not isinstance(rows, list) or any(not isinstance(r, dict) for r in rows):
            raise ValueError('JSON must be an array of row objects')
    elif path.suffix.lower() == '.xlsx':
        with zipfile.ZipFile(path) as z:
            if sum(i.file_size for i in z.infolist()) > MAX_BYTES:
                raise ValueError('Expanded XLSX exceeds limit')
        from openpyxl import load_workbook
        wb = load_workbook(path, read_only=True, data_only=False)
        try:
            if len(wb.sheetnames) != 1:
                raise ValueError('Select/export one sheet; ambiguous multi-sheet workbook')
            cells = list(wb.active.iter_rows())
            if any(c.data_type == 'f' for row in cells for c in row):
                raise ValueError('Spreadsheet formulas are not accepted as metadata')
            values = [[c.value for c in row] for row in cells]
            headers = [str(v).strip() if v is not None else '' for v in values[0]]
            if not all(headers) or len(set(headers)) != len(headers):
                raise ValueError('Invalid spreadsheet headers')
            rows = [dict(zip(headers, row)) for row in values[1:] if any(v is not None for v in row)]
        finally:
            wb.close()
    else:
        raise ValueError('Supported tabular formats: CSV, JSON, XLSX')
    if not rows:
        raise ValueError('Empty import rejected')
    if len(rows) > 100000:
        raise ValueError('Import exceeds 100,000 rows')
    return rows


def columns(rows, explicit=None):
    headers = list(rows[0])
    normalized = {}
    for h in headers:
        normalized.setdefault(norm(h), []).append(h)
    result = {}
    for key, aliases in ALIASES.items():
        if explicit and key in explicit:
            if explicit[key] not in headers:
                raise ValueError(f'Missing configured column for {key}')
            result[key] = explicit[key]
            continue
        candidates = {h for alias in aliases for h in normalized.get(norm(alias), [])}
        if len(candidates) > 1:
            raise ValueError(f'Ambiguous headers for {key}; provide --columns JSON')
        if candidates:
            result[key] = candidates.pop()
    return result


def profile(rows):
    return {'rows': len(rows), 'columns': {k: {
        'missing': sum(r.get(k) is None or str(r.get(k)).strip() == '' for r in rows),
        'distinct': len({str(r.get(k, '')) for r in rows})
    } for k in rows[0]}}


def integer(value, field, *, nullable=True):
    if value is None or str(value).strip() == '':
        if nullable:
            return None
        raise ValueError(f'Missing {field}')
    try:
        n = float(value)
        if not math.isfinite(n) or n < 0 or not n.is_integer():
            raise ValueError()
        return int(n)
    except (ValueError, TypeError, OverflowError):
        raise ValueError(f'Invalid nonnegative integer in {field}') from None


def import_questions(db, path, *, provider='uworld', product='step1', explicit=None, allow_smaller=False):
    rows = load_rows(path)
    cols = columns(rows, explicit)
    if not {'qid', 'title'} <= cols.keys():
        raise ValueError('QID and title columns required')
    normalized = {}
    duplicates = 0
    for number, row in enumerate(rows, 2):
        def val(k):
            return row.get(cols.get(k))
        raw_qid = str(val('qid')).strip()
        if not re.fullmatch(r'[0-9]+', raw_qid) or int(raw_qid) <= 0:
            raise ValueError(f'Invalid QID at row {number}')
        qid = str(int(raw_qid))
        title = str(val('title') or '').strip()
        if not title:
            raise ValueError(f'Missing title at row {number}')
        attempts, correct = integer(val('attempts'), 'population attempts'), integer(val('correct'), 'population correct')
        if correct is not None and (attempts is None or correct > attempts):
            raise ValueError(f'Inconsistent population statistics at row {number}')
        data = (title, str(val('subject') or ''), str(val('system') or ''), attempts, correct, str(val('updated') or ''))
        if qid in normalized:
            if normalized[qid][0] != data:
                raise ValueError(f'Conflicting duplicate QID at row {number}')
            duplicates += 1
        else:
            normalized[qid] = (data, number)
    previous = db.execute('SELECT count(*) FROM current_questions WHERE provider=? AND product=?', (provider, product)).fetchone()[0]
    if len(normalized) < previous and not allow_smaller:
        raise ValueError(f'Smaller question catalog blocked ({len(normalized)} < {previous})')
    report = profile(rows)
    report.update(unique_qids=len(normalized), duplicate_rows=duplicates,
                  subject_codes=len({v[0][1] for v in normalized.values()}), system_codes=len({v[0][2] for v in normalized.values()}),
                  raw_title_count=len({v[0][0] for v in normalized.values()}),
                  excluded_columns=[k for k in rows[0] if k not in {cols.get(x) for x in ['qid','title','subject','system','attempts','correct','updated']}],
                  warnings=['Subject/system codes are opaque until a source dictionary is supplied.',
                            'Provider/product and id-as-QID are user-supplied assertions, not independently provider-verified.',
                            'Population statistics are not student progress or a validated difficulty estimate.'])
    with db:
        sid = snapshot(db, path, provider + ':' + product, len(normalized), report,
                       parser_config={'columns': cols, 'provider': provider, 'product': product})
        cid = stable('question-catalog', provider, product, sid)
        db.execute('UPDATE question_catalog_snapshots SET is_current=0 WHERE provider=? AND product=?', (provider, product))
        db.execute('INSERT INTO question_catalog_snapshots VALUES(?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET is_current=1', (cid, provider, product, sid))
        for qid, (data, number) in normalized.items():
            qref = stable('question', provider, product, qid)
            db.execute('INSERT OR IGNORE INTO question_references VALUES(?,?,?,?,?)', (qref, provider, product, qid, 'user_asserted'))
            db.execute('INSERT OR IGNORE INTO question_snapshot_items VALUES(?,?,?,?,?,?,?,?,?)', (qref, cid, *data, number))
            tid = topic(db, data[0], sid)
            eid = evidence(db, sid, 'source_title_label', 1, 'source_asserted', f'row:{number}', 'CSV title label; not a verified canonical medical classification')
            db.execute('INSERT OR IGNORE INTO topic_question_mappings VALUES(?,?,?)', (tid, qref, eid))
        for warning in report['warnings']:
            issue(db, sid, 'classification_or_identity', 'all_rows', warning)
    return {'snapshot_id': sid, 'catalog_id': cid, **report}


def read_video_table(path, explicit=None):
    rows = load_rows(path)
    cols = columns(rows, explicit)
    if 'title' not in cols:
        raise ValueError('Video title column required')
    out = []
    for i, row in enumerate(rows, 2):
        def val(k):
            return row.get(cols.get(k))
        title = str(val('title') or '').strip()
        key = str(val('source_key') or '').strip()
        # No silent title-based merging on refresh. Explicit IDs preserve renamed titles.
        if not key:
            raise ValueError(f'Missing stable resource ID at row {i}; provide a source_key column')
        seconds = integer(val('duration_seconds'), 'duration seconds')
        minutes = val('duration_minutes')
        if seconds is None and minutes not in (None, ''):
            amount = float(minutes)
            if not math.isfinite(amount) or amount <= 0 or not (amount * 60).is_integer():
                raise ValueError(f'Invalid minutes at row {i}')
            seconds = int(amount * 60)
        out.append({'source_key': key, 'title': title, 'module': val('module'), 'section': val('section'),
                    'duration_seconds': seconds, 'locator': f'row:{i}', 'status': 'source_extracted'})
    return out, {**profile(rows), 'missing_durations': sum(r['duration_seconds'] is None for r in out), 'column_mapping': cols}
