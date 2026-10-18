PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS source_snapshots(
 id TEXT PRIMARY KEY, source_key TEXT NOT NULL, filename TEXT NOT NULL,
 sha256 TEXT NOT NULL CHECK(length(sha256)=64), captured_at TEXT NOT NULL,
 source_version TEXT, format TEXT NOT NULL, owner TEXT NOT NULL,
 rights TEXT NOT NULL, source_url TEXT, record_count INTEGER NOT NULL,
 parser_version TEXT NOT NULL, validation_json TEXT NOT NULL,
 UNIQUE(source_key,sha256,parser_version)
);
CREATE TABLE IF NOT EXISTS resources(id TEXT PRIMARY KEY, provider TEXT NOT NULL,
 product TEXT NOT NULL, kind TEXT NOT NULL, UNIQUE(provider,product,kind));
CREATE TABLE IF NOT EXISTS resource_catalog_versions(
 id TEXT PRIMARY KEY, resource_id TEXT NOT NULL REFERENCES resources(id),
 snapshot_id TEXT NOT NULL REFERENCES source_snapshots(id), is_current INTEGER NOT NULL CHECK(is_current IN(0,1)),
 UNIQUE(resource_id,snapshot_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_current_catalog ON resource_catalog_versions(resource_id) WHERE is_current=1;
CREATE TABLE IF NOT EXISTS resource_items(
 id TEXT PRIMARY KEY, resource_id TEXT NOT NULL REFERENCES resources(id),
 source_key TEXT NOT NULL, UNIQUE(resource_id,source_key)
);
CREATE TABLE IF NOT EXISTS resource_item_versions(
 item_id TEXT NOT NULL REFERENCES resource_items(id), catalog_id TEXT NOT NULL REFERENCES resource_catalog_versions(id),
 title TEXT NOT NULL, normalized_title TEXT NOT NULL, module TEXT, section TEXT,
 duration_seconds INTEGER CHECK(duration_seconds IS NULL OR duration_seconds>0),
 page_refs TEXT, source_locator TEXT NOT NULL, extraction_status TEXT NOT NULL,
 PRIMARY KEY(item_id,catalog_id)
);
CREATE TABLE IF NOT EXISTS question_references(
 id TEXT PRIMARY KEY, provider TEXT NOT NULL, product TEXT NOT NULL,
 qid TEXT NOT NULL, identity_status TEXT NOT NULL, UNIQUE(provider,product,qid)
);
CREATE TABLE IF NOT EXISTS question_catalog_snapshots(
 id TEXT PRIMARY KEY, provider TEXT NOT NULL, product TEXT NOT NULL,
 snapshot_id TEXT NOT NULL REFERENCES source_snapshots(id), is_current INTEGER NOT NULL CHECK(is_current IN(0,1)),
 UNIQUE(provider,product,snapshot_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_current_questions ON question_catalog_snapshots(provider,product) WHERE is_current=1;
CREATE TABLE IF NOT EXISTS question_snapshot_items(
 question_id TEXT NOT NULL REFERENCES question_references(id), catalog_id TEXT NOT NULL REFERENCES question_catalog_snapshots(id),
 title TEXT NOT NULL, subject_code TEXT, system_code TEXT,
 population_attempts INTEGER CHECK(population_attempts>=0), population_correct INTEGER CHECK(population_correct>=0 AND population_correct<=population_attempts),
 source_updated_at TEXT, source_row INTEGER NOT NULL,
 PRIMARY KEY(question_id,catalog_id)
);
CREATE TABLE IF NOT EXISTS topics(
 id TEXT PRIMARY KEY, label TEXT NOT NULL, normalized_label TEXT NOT NULL,
 level TEXT NOT NULL CHECK(level IN('system','discipline','process','topic','subtopic')),
 origin TEXT NOT NULL CHECK(origin IN('official_category','internal_source_label','curated')),
 parent_id TEXT REFERENCES topics(id), taxonomy_version TEXT NOT NULL,
 source_snapshot_id TEXT REFERENCES source_snapshots(id)
);
CREATE TABLE IF NOT EXISTS topic_aliases(topic_id TEXT NOT NULL REFERENCES topics(id),alias TEXT NOT NULL,PRIMARY KEY(topic_id,alias));
CREATE TABLE IF NOT EXISTS mapping_evidence(
 id TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL REFERENCES source_snapshots(id),
 evidence_type TEXT NOT NULL, confidence REAL NOT NULL CHECK(confidence BETWEEN 0 AND 1),
 validation_status TEXT NOT NULL CHECK(validation_status IN('source_asserted','candidate','reviewed','rejected')),
 source_locator TEXT NOT NULL, detail TEXT NOT NULL, rights TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS topic_question_mappings(
 topic_id TEXT NOT NULL REFERENCES topics(id), question_id TEXT NOT NULL REFERENCES question_references(id),
 evidence_id TEXT NOT NULL REFERENCES mapping_evidence(id), PRIMARY KEY(topic_id,question_id,evidence_id)
);
CREATE TABLE IF NOT EXISTS topic_resource_mappings(
 topic_id TEXT NOT NULL REFERENCES topics(id), item_id TEXT NOT NULL REFERENCES resource_items(id),
 evidence_id TEXT NOT NULL REFERENCES mapping_evidence(id), PRIMARY KEY(topic_id,item_id,evidence_id)
);
CREATE TABLE IF NOT EXISTS resource_question_mappings(
 item_id TEXT NOT NULL REFERENCES resource_items(id), question_id TEXT NOT NULL REFERENCES question_references(id),
 evidence_id TEXT NOT NULL REFERENCES mapping_evidence(id), PRIMARY KEY(item_id,question_id,evidence_id)
);
CREATE TABLE IF NOT EXISTS resource_resource_mappings(
 from_item_id TEXT NOT NULL REFERENCES resource_items(id), to_item_id TEXT NOT NULL REFERENCES resource_items(id),
 evidence_id TEXT NOT NULL REFERENCES mapping_evidence(id), PRIMARY KEY(from_item_id,to_item_id,evidence_id),CHECK(from_item_id<>to_item_id)
);
CREATE TABLE IF NOT EXISTS review_queue(
 id TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL REFERENCES source_snapshots(id),
 kind TEXT NOT NULL, locator TEXT NOT NULL, detail TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','accepted','rejected'))
);
CREATE TABLE IF NOT EXISTS anki_collections(id TEXT PRIMARY KEY,label TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS anki_notes(
 id TEXT PRIMARY KEY, collection_id TEXT NOT NULL REFERENCES anki_collections(id),
 note_id TEXT NOT NULL,guid TEXT NOT NULL,snapshot_id TEXT NOT NULL REFERENCES source_snapshots(id),UNIQUE(collection_id,note_id)
);
CREATE TABLE IF NOT EXISTS anki_cards(
 id TEXT PRIMARY KEY,note_id TEXT NOT NULL REFERENCES anki_notes(id),card_id TEXT NOT NULL,
 queue INTEGER NOT NULL,due INTEGER NOT NULL,interval INTEGER NOT NULL,reps INTEGER NOT NULL,lapses INTEGER NOT NULL,
 suspended INTEGER NOT NULL CHECK(suspended IN(0,1)),snapshot_id TEXT NOT NULL REFERENCES source_snapshots(id)
);
CREATE TABLE IF NOT EXISTS anki_tags(id TEXT PRIMARY KEY,tag TEXT UNIQUE NOT NULL,resource_root TEXT);
CREATE TABLE IF NOT EXISTS anki_note_tags(note_id TEXT NOT NULL REFERENCES anki_notes(id),tag_id TEXT NOT NULL REFERENCES anki_tags(id),PRIMARY KEY(note_id,tag_id));
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS user_resource_progress(
 user_id TEXT NOT NULL REFERENCES users(id),item_id TEXT NOT NULL REFERENCES resource_items(id),
 status TEXT NOT NULL CHECK(status IN('not_started','in_progress','completed')),actual_seconds INTEGER CHECK(actual_seconds>=0),
 updated_at TEXT NOT NULL,PRIMARY KEY(user_id,item_id)
);
CREATE TABLE IF NOT EXISTS user_question_progress(
 user_id TEXT NOT NULL REFERENCES users(id),question_id TEXT NOT NULL REFERENCES question_references(id),
 attempts INTEGER NOT NULL CHECK(attempts>=0),correct INTEGER NOT NULL CHECK(correct BETWEEN 0 AND attempts),
 updated_at TEXT NOT NULL,PRIMARY KEY(user_id,question_id)
);
CREATE TABLE IF NOT EXISTS user_anki_progress(
 user_id TEXT NOT NULL REFERENCES users(id),card_id TEXT NOT NULL REFERENCES anki_cards(id),
 observed_at TEXT NOT NULL,review_seconds INTEGER CHECK(review_seconds>=0),PRIMARY KEY(user_id,card_id,observed_at)
);
CREATE TABLE IF NOT EXISTS study_events(
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),occurred_at TEXT NOT NULL,
 event_type TEXT NOT NULL,item_id TEXT REFERENCES resource_items(id),question_id TEXT REFERENCES question_references(id),
 actual_seconds INTEGER CHECK(actual_seconds>=0)
);
CREATE VIEW IF NOT EXISTS current_resource_items AS
 SELECT i.*,v.title,v.normalized_title,v.module,v.section,v.duration_seconds,v.page_refs,v.source_locator,v.extraction_status,c.snapshot_id,c.id AS catalog_id
 FROM resource_items i JOIN resource_item_versions v ON i.id=v.item_id
 JOIN resource_catalog_versions c ON c.id=v.catalog_id WHERE c.is_current=1;
CREATE VIEW IF NOT EXISTS current_questions AS
 SELECT q.*,v.title,v.subject_code,v.system_code,v.population_attempts,v.population_correct,v.source_updated_at,v.source_row,c.snapshot_id,c.id AS catalog_id
 FROM question_references q JOIN question_snapshot_items v ON q.id=v.question_id
 JOIN question_catalog_snapshots c ON c.id=v.catalog_id WHERE c.is_current=1;
CREATE VIEW IF NOT EXISTS current_candidate_question_links AS
 SELECT DISTINCT i.id AS item_id,i.resource_id,q.id AS question_id,q.provider,q.product,q.qid,
 m.topic_id,e.id AS evidence_id,e.evidence_type,e.confidence,e.validation_status,
 e.snapshot_id AS resource_snapshot_id,q.snapshot_id AS question_snapshot_id
 FROM topic_resource_mappings m
 JOIN mapping_evidence e ON e.id=m.evidence_id
 JOIN current_resource_items i ON i.id=m.item_id AND i.snapshot_id=e.snapshot_id
 JOIN topic_question_mappings tq ON tq.topic_id=m.topic_id
 JOIN mapping_evidence qe ON qe.id=tq.evidence_id
 JOIN current_questions q ON q.id=tq.question_id AND q.snapshot_id=qe.snapshot_id
 WHERE e.validation_status='candidate';
