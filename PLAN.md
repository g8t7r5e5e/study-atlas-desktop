# Current checkpoint: First Aid workbook replacement

Read docs/data/FIRST_AID_REPLACEMENT.md first. It supersedes all First Aid index and 334-unit inventory assumptions below. The desktop app is already merged into main; this branch still requires reconciliation.

# Checkpoint plan — 18 October 2026

The current user request prioritizes the real data checkpoint before planner UI.
The repository is a browser prototype handoff, not a functioning Electron app.
The immutable prototype passes its checksum and 22-route render checks.

1. Audit source files and architecture — completed; see docs/data/ARCHITECTURE.md.
2. Implement local SQLite data foundation in desktop/data_foundation — completed:
   transactional adapters, snapshot history, private exports and mapping review.
3. Verify real imports and regression tests — passed; package build uses an
   allowlist, member SHA-256 verification and separate private export.
4. Review actual coverage before Checkpoint 2. Missing source dictionaries,
   unsupported mappings or uncertain identifiers must not become planner facts.
5. Checkpoint 2 remains gated on the data review. Electron persistence, onboarding,
   scheduling, AI-plan import and Windows packaging are separate subsequent work.

Decisions: Python is the offline ETL tool; SQLite is the shared storage contract
specified by the repository. No hosted Site changes, prototype edits, private
uploads, fabricated catalog rows, or inferred student progress. Only source code,
aggregate audit reports and cleared reference metadata enter the shareable ZIP.

Actual results: 3,659 questions; 496 BnB rows; 110 Pathoma duration rows;
13,247 candidate First Aid entries; 55.34% candidate question coverage and zero
reviewed QID crosswalks. 18 Python tests, 22 reference routes and database integrity
checks pass. See docs/data/CHECKPOINT1.md for the review gate and known gaps.

## Approved follow-up

The user explicitly approved GitHub upload and a draft PR. Checkpoint 1 was saved
to feature/usmle-data-and-study-planner (GitHub commit a3b363f2). No private data
was uploaded. The First Aid follow-up adds 7,285 topics and 8,309 subtopics, with
chapter/search browsing, raw-entry traceability and deduplicated selections.
27 unit tests pass. Schema 2 preserves the original catalog and user records.
CONTINUE.md saves user decisions and the first unfinished step for resumption;
docs/data/NEXT_RESOURCES_AND_PLANNER.md records incoming resources and future
algorithm research. Calendar/UI activation remains a later checkpoint.

## Compact curriculum correction

Completed: 334 original study units in 16 groups; major organ-system groups have
20–29 units. Detailed index nodes remain lookup metadata. Cardiac embryology,
anatomy, physiology basics and Wiggers diagram are separate units 1–4.
Versioned SQLite definitions, scoped candidate links, private export and deduped
selection are implemented. 31 tests pass; original source imports were reused.
See docs/data/STUDY_UNITS.md for counts and remaining mapping gaps.

Next: review missing page and question/card coverage, then the prompt's workload
and feasibility model, algorithm comparison/baseline scheduler, questionnaire,
3/6/12-month templates, AI-plan import preview, and calendar/app integration.

## Latest authoritative correction: First Aid page sequence

User requires strictly forward First Aid reading order across systems, topics and
crosslinks, superseding the initial request's example numbering. Do not restore
teaching order or use IDs as sort keys. STUDY_UNIT_CATALOG.md is now the ascending
printed-page reading table. Export/select schema v2 uses reading_sequence page
buckets so separated references cannot force backward reading. Stable unit IDs,
BnB/MCQ relationships and all 334 units are retained. 203 units have matched page
candidates; 131 have unresolved positions and are excluded from scheduling.
336 page steps, zero backward transitions; 34 tests pass. Exact complete chapter
heading order remains blocked by missing topic/page evidence, not solved by
sorting. Do not represent the candidate index mapping as a fully verified book
outline. Resolve this source gap before claiming exact order for all units.
