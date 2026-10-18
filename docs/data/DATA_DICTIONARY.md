# SQLite data dictionary

The full field/type/nullability/key dictionary is generated from SQLite PRAGMA
metadata into `data/DATA_DICTIONARY.json` in the shareable ZIP. Constraints and
indexes are defined by `desktop/data_foundation/schema.sql`.

| Tables | Meaning |
|---|---|
| schema_migrations | Schema versions; newer unsupported databases are rejected |
| source_snapshots | File hash, source key, parser/config version, acquisition timestamp, rights, row count and private validation JSON |
| resources, resource_catalog_versions | Resource identity and a single active snapshot per resource |
| resource_items, resource_item_versions | Stable identity separate from versioned title, hierarchy, nullable duration, page references and extraction status |
| question_references | Scoped provider/product/QID identity; ID provenance status |
| question_catalog_snapshots, question_snapshot_items | One active snapshot per provider/product, with titles, opaque codes and optional population counts |
| topics, topic_aliases | Official category references separate from internal source labels; parent/level/version supported |
| mapping_evidence | Required snapshot, evidence kind, confidence, status, source locator, rights and explanation |
| topic_question_mappings | Direct source title association, not a verified canonical medical classification |
| topic_resource_mappings | Exact/fuzzy title candidates awaiting review |
| resource_question_mappings | Explicit resource/QID relationships; optional Anki co-tag candidates |
| resource_resource_mappings | Supported many-to-many resource links; no invented links seeded |
| review_queue | Extraction, identity, classification and mapping concerns, with review state |
| anki_collections, anki_notes, anki_cards | Independent collection-scoped notes/cards and native scheduling values |
| anki_tags, anki_note_tags | Hierarchical tag strings belong to notes |
| users, user_resource_progress, user_question_progress, user_anki_progress | Separate user state; never populated from general question statistics |
| study_events | Future observed activity, no invented historical records |
| resource_outline_versions | Versioned source-layout interpretation, anchored to a catalog snapshot |
| resource_outline_nodes | Resource-specific parent topics, subtopics and explicit unresolved-context groups |
| resource_outline_entries | Node membership per outline, page pointers, source locators and review status |
| resource_outline_item_links | Traceability from outline nodes back to unchanged raw catalog entries |

`current_questions` and `current_resource_items` expose active catalogs.
`current_candidate_question_links` joins current title-label evidence and resource
candidates. It is explicitly not a verified crosswalk.

IDs use deterministic SHA-256-derived internal identifiers; resource IDs remain
stable across title changes only when a stable source key is retained. Missing
items persist in older snapshots so progress foreign keys remain valid. Source
imports do not delete user progress. Durations are integer seconds; missing is
NULL. Population attempts/correct are source aggregates, not personal performance.
First Aid page_refs are JSON arrays of printed book pages, not PDF page numbers;
source_locator uses the uploaded PDF's one-based page/column/line positions.
