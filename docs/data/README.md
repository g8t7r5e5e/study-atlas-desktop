# Checkpoint 1: real data foundation

Run commands from `desktop/` with Python 3.11+ and SQLite support. Install the
optional PDF/XLSX dependencies with:

```sh
python -m pip install -r data_foundation/requirements.txt
python -m unittest discover -s data_foundation/tests -v
```

Install Tesseract with English data for the Pathoma adapter; `tesseract --version`
must work. No network, account, or paid API is used during imports.

## Import supplied files

```sh
python -m data_foundation --db private-data/study-atlas.sqlite init
python -m data_foundation --db private-data/study-atlas.sqlite questions '/path/Questions details.csv'
python -m data_foundation --db private-data/study-atlas.sqlite pdf '/path/BNB video mappings.pdf' --resource bnb
python -m data_foundation --db private-data/study-atlas.sqlite pdf '/path/pathoma mapping.pdf' --resource pathoma
python -m data_foundation --db private-data/study-atlas.sqlite pdf '/path/First Aid index.pdf' --resource firstaid
python -m data_foundation --db private-data/study-atlas.sqlite register '/path/USMLE GUIDEBOOK 2025-2026.pdf' --source-key guidebook
python -m data_foundation --db private-data/study-atlas.sqlite map
python -m data_foundation --db private-data/study-atlas.sqlite report --out private-data/coverage.json
python -m data_foundation --db private-data/study-atlas.sqlite export-private private-data/export
```

Or create a private JSON object with `questions`, `bnb`, `pathoma`, `firstaid`,
`guidebook` keys pointing to local files and rerun all five adapters:

```sh
python -m data_foundation.pipeline --db private-data/study-atlas.sqlite --config private-data/inputs.json --export-dir private-data/export
```

The pipeline records success/failure receipts beside the DB. Each adapter is one
transaction; a failed source does not overwrite its last good catalog. The full
multi-source run is not one transaction; earlier successful sources remain if a
later source fails. Existing originals are read without modification.

## Updating question or video tables

CSV, JSON arrays and single-sheet XLSX are supported. Fields are allowlisted; raw
questions, answers, explanations and media never enter the database. QIDs are
positive integers scoped by `--provider` and `--product`. Rows with malformed IDs,
conflicting duplicate metadata or invalid statistics fail atomically. Identical
metadata duplicates collapse with a reported count. Population counts are not
student activity. Current snapshot count is not a claim about the full live bank.

Use `--columns columns.json` for explicit mappings, for example:

```json
{"qid":"Question ID","title":"Topic","subject":"Subject Code","system":"System Code"}
```

For newer video metadata:

```sh
python -m data_foundation --db private-data/study-atlas.sqlite videos '/path/videos.csv' --resource bnb --columns '/path/video-columns.json'
```

Supported video keys: `source_key`, `title`, `module`, `section`,
`duration_seconds` or `duration_minutes`. Explicit IDs are required for tabular
catalogs so a renamed title preserves progress. When migrating from the PDF,
export its `source_key` and reuse that key in the first CSV, or curate an ID
crosswalk; do not silently switch namespaces. PDF keys are provisional
title/module identifiers. Missing runtimes stay NULL, never zero or guessed.

A smaller replacement catalog is blocked unless `--allow-smaller` is explicitly
supplied after review. Previous item versions and progress remain. To revert:

```sh
python -m data_foundation --db private-data/study-atlas.sqlite activate 'catalog-id-from-import-receipt'
```

Activation switches the current catalog pointer, not user records. Snapshots are
deduplicated by file checksum, parser version and parser configuration. Update
the parser version when parsing semantics change. SQLite backups use the backup
API, not a live file copy.

## Anki extraction

Supply an authorized closed backup copy, never the live collection:

```sh
python -m data_foundation --db private-data/study-atlas.sqlite anki '/path/backup.anki2' --collection 'my-collection' --confirmed-backup
```

Reads only note IDs/GUIDs/tags and card scheduling fields; does not read `flds`,
media or review text. Notes and cards remain distinct. Due values retain Anki's
native queue-dependent units; they are not converted to calendar dates. WAL or
journal sidecars are rejected. A collection identifier is required to prevent
cross-user ID collisions. This is a metadata extractor, not a live sync engine.
Modern unsupported Anki schemas fail rather than pretending to import. APKG/
COLPKG archives need a proper Anki export/backup first.

Tag roots and Step product markers are recognized conservatively. Numeric IDs
without a product remain ambiguous. An exact unique resource-title tag can
support a co-tag candidate, with note evidence. This does not establish clinical
equivalence. Missing QIDs mean absent from the imported snapshot, not proven stale.
Historical missing notes/cards are retained; no live synchronization is claimed.

## Mapping review

First Aid now also has chapter/topic/subtopic browsing and deduplicated reading
selection. See FIRST_AID_OUTLINE.md for working commands and review limitations.
NEXT_RESOURCES_AND_PLANNER.md records future resource ingestion and the requested
algorithm-research roadmap.

Source question titles populate internal topic labels. Official top-level
categories remain separate; numeric codes are not decoded by guessing. The
schema supports system/discipline/process/topic/subtopic levels, but a complete
curated granular hierarchy has not been supplied or invented.

Exact normalized titles produce candidates with confidence 0.75. Fuzzy title
similarity >=0.86 produces at most three candidates, confidence <=0.65. Those
scores are matching heuristics, not medical accuracy probabilities. Every mapping
references a source snapshot, source locator, evidence type, rights and validation
status. Repeated candidate generation is idempotent. Review queues and unmatched
tables are included in private exports; no candidate is automatically promoted.
Current coverage excludes evidence from inactive resource/question snapshots.

## Package and integration

See ARCHITECTURE.md and SOURCES.md. The SQLite DTO/repository is implemented and
tested in the existing project. Electron UI wiring, authentication/profiles,
planning mathematics, questionnaires, 3/6/12-month plans, AI-plan import and a
Windows installer are not part of this completed data checkpoint. The current
browser prototype remains unchanged. Run its existing checks from repository root:

```sh
node scripts/verify-reference.cjs
node scripts/smoke-reference.cjs
```

Data review is a gate, not a claim that all imported labels or mappings are
clinically verified. The missing-data manifest and measured coverage determine
what can safely feed Checkpoint 2.

Build and verify the shareable package from `desktop/`:

```sh
python -m data_foundation.package --root .. --output ../artifacts/usmle_step1_research_and_data_package.zip
python -m data_foundation.package --verify ../artifacts/usmle_step1_research_and_data_package.zip
```

The allowlist includes only the data-foundation code, docs/data reports and the
official category reference database. No private directory or original prototype
files are bundled. GitHub Actions runs unit/reference checks and produces this
shareable ZIP as a CI artifact; no release upload or successful remote CI run is
assumed. The real private catalogs require the user's original local inputs.
