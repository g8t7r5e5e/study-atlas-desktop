"""Candidate generation; textual similarity is not medical equivalence."""
from difflib import SequenceMatcher
from .core import evidence, issue, norm, stable


def generate(db):
    topics = list(db.execute("SELECT DISTINCT t.* FROM topics t JOIN topic_question_mappings m ON m.topic_id=t.id JOIN current_questions q ON q.id=m.question_id JOIN mapping_evidence e ON e.id=m.evidence_id AND e.snapshot_id=q.snapshot_id"))
    exact = {}
    tokens = {}
    for t in topics:
        exact.setdefault(t['normalized_label'], []).append(t)
        for token in set(t['normalized_label'].split()):
            if len(token) >= 4:
                tokens.setdefault(token, set()).add(t['id'])
    by_id = {t['id']: t for t in topics}
    counts = {'exact_title_candidates': 0, 'fuzzy_candidates': 0, 'unmatched_items': 0, 'verified_cross_resource_links': 0}
    with db:
        for item in db.execute('SELECT * FROM current_resource_items').fetchall():
            label = item['normalized_title']
            matches = [(t, 1.0, 'exact_title') for t in exact.get(label, [])]
            if not matches:
                possible = set().union(*(tokens.get(w, set()) for w in label.split() if len(w) >= 4))
                ranked = sorted(((SequenceMatcher(None, label, by_id[tid]['normalized_label']).ratio(), tid) for tid in possible), reverse=True)
                matches = [(by_id[tid], score, 'fuzzy_title') for score, tid in ranked[:3] if score >= .86]
            if not matches:
                counts['unmatched_items'] += 1
                continue
            for t, similarity, kind in matches:
                # Confidence describes the textual linkage, not clinical correctness.
                confidence = .75 if kind == 'exact_title' else min(.65, similarity * .65)
                detail = f'{kind}; similarity={similarity:.4f}; topic={t["id"]}; item={item["id"]}; not equivalence'
                eid = evidence(db, item['snapshot_id'], kind, confidence, 'candidate', item['source_locator'], detail)
                db.execute('INSERT OR IGNORE INTO topic_resource_mappings VALUES(?,?,?)', (t['id'], item['id'], eid))
                issue(db, item['snapshot_id'], 'mapping_candidate', item['id'], detail)
                counts['exact_title_candidates' if kind == 'exact_title' else 'fuzzy_candidates'] += 1
    return counts


ROOTS = {'boardsbeyond': 'bnb', 'boardsandbeyond': 'bnb', 'bb': 'bnb', 'bnb': 'bnb',
         'pathoma': 'pathoma', 'sketchy': 'sketchy', 'sketchymicro': 'sketchy', 'sketchypharm': 'sketchy',
         'firstaid': 'firstaid', 'fa': 'firstaid', 'uworld': 'uworld'}


def parse_tag(tag):
    parts = tag.split('::')
    cleaned = [norm(p).replace(' ', '').replace('_', '') for p in parts]
    root = next(((i, ROOTS[p]) for i, p in enumerate(cleaned) if p in ROOTS), None)
    if root is None:
        return None
    i, resource = root
    product = None
    for part in cleaned:
        if 'step1' in part:
            product = 'step1'
        elif 'step2' in part:
            product = 'step2'
        elif 'step3' in part:
            product = 'step3'
    if any('comlex' in part for part in cleaned):
        product = {'step1': 'comlex1', 'step2': 'comlex2', 'step3': 'comlex3'}.get(product)
    # Only terminal all-digit components qualify; version/chapter digits never do.
    qid = str(int(parts[-1])) if resource == 'uworld' and parts[-1].isdigit() and int(parts[-1]) > 0 else None
    return {'resource': resource, 'product': product, 'qid': qid, 'leaf': parts[-1], 'path': parts[i+1:]}
