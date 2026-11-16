# Scheduling research checkpoint — 17 November 2026

Completed the sourced approach comparison in docs/planner/SCHEDULING_RESEARCH.md. Recommended: deterministic capacity planner with explicit order/dependencies, separate Anki review forecasts, conservative replanning; CP-SAT deferred pending benchmarks. Eight analytical scenarios documented; arithmetic checked, no scheduler or solver benchmark implemented. Next task is workload/feasibility calculations. First-pass reading stays forward; revisiting prior material is a separately identified review activity (proposed policy). Preserve the new workbook catalog and existing desktop design.

# Current checkpoint: First Aid workbook replacement

Read docs/data/FIRST_AID_REPLACEMENT.md first. It supersedes all First Aid index and 334-unit inventory assumptions below. The desktop app is already merged into main; this branch still requires reconciliation.

# Continue Study Atlas here

Read this file, PLAN.md, AGENTS.md and docs/data/CHECKPOINT1.md before resuming.
This is a durable engineering handoff, not a promise that chat history or private
execution files will persist. The user can say **continue** to resume this plan.

## User's latest direction and authorization

The user explicitly approved uploading the reviewed code, schemas, aggregate
reports and shareable ZIP to g8t7r5e5e/study-atlas-desktop and opening a draft PR.
Private catalogs and question content are excluded from that approved payload.
Use feature/usmle-data-and-study-planner. Do not merge or alter the hosted Site.

The First Aid index must be usable as topics/subtopics when selecting study work.
Additional resources, including Sketchy, will arrive later and must be imported
with provenance and linked to existing resources through reviewed evidence.
Then research established scheduling/exam-preparation algorithm families, explain
tradeoffs, and design a deterministic personalized scheduler using questionnaire
answers about availability, existing progress and resource preferences. Calendar
and full-app integration follow; do not present future features as implemented.
Preserve the existing desktop/prototype architectural and visual requirements.

## Completed checkpoint

- Local foundation commit: 6f5e62ba8d03f94d3cd362e6021a62f1213b8193.
- Equivalent GitHub checkpoint commit: a3b363f2a4669d9503324e8a99ec1f58f85eb041.
  GitHub API publication produces a different commit ID; source tree is equivalent.
- 3,659 question references; 496 BnB videos; 110 Pathoma duration rows;
  13,247 candidate First Aid index entries; 22 official category references.
- 55.34% of QIDs have candidate resource links; zero reviewed QID crosswalks.
- 18 unit tests, 22 prototype route checks, SQLite integrity, source checksums,
  private export roundtrip and ZIP clean-extraction tests passed at that checkpoint.
- The shareable ZIP is tracked at artifacts/usmle_step1_research_and_data_package.zip.
  The accompanying SHA256 and verification files describe the exact artifact.

## Current work and resumption

First Aid hierarchy and selection code is implemented: 7,285 parent topics,
8,309 subtopics, one unresolved-context group (seven orphan entries), and all
13,247 raw entries linked. Chapter/search browsing and a parent/child selection
resolver deduplicate pages and retain review status. SQLite schema 2 is additive.
27 tests pass; real outline examples and SQLite integrity/FKs were checked.
See docs/data/FIRST_AID_OUTLINE.md for exact scope and commands.

The current delivery is the feature branch plus a draft PR; inspect its newest
commit and open PR state through GitHub before resuming, rather than relying on a
remembered SHA. Package bytes/checksums change when code/docs change; read the
tracked artifact sidecars for the current values. Do not merge automatically.

Latest correction: the user wants a few hundred schedulable concepts, not index
headings as tasks. Implemented 334 editorial study units, 28 cardiovascular units,
and their requested first four topics. See docs/data/STUDY_UNITS.md and
STUDY_UNIT_CATALOG.md. Schema 3 adds versioned definitions and scoped candidates;
all 496 BnB videos have candidates, 203 units have First Aid pointers, 109 have
candidate question links (696 distinct QIDs), and no Anki unit crosswalk exists.
31 tests pass. Existing imports were reused; do not repeat source extraction.

First unfinished work: review compact units and resolve missing First Aid page
links, then validate MCQ/Anki crosswalks as sources become available. Do not turn
candidate coverage into a claim of sufficient daily question/card workload.
The next development plan follows the user's original prompt: compare relevant
planner algorithms; implement calibrated workload/capacity and feasibility;
build deterministic scheduling; questionnaire; 3/6/12-month templates; versioned
external-AI JSON validation and preview; then calendar/app integration. Detailed
steps are in docs/data/NEXT_RESOURCES_AND_PLANNER.md. No scheduler/UI is claimed.
User requests minimal incremental work and no repeated costly audits.

## Private data recovery

If the current workspace survives, originals are in /workspace/attachments and
local paths are in desktop/private-data/inputs.json. The real DB is
desktop/private-data/verified.sqlite; exports are in verified-export/; the private
metadata ZIP is desktop/private-data/usmle_step1_private_metadata.zip. These are
ignored by Git, deliberately absent from the shareable artifact, and may disappear
with the execution environment. GitHub preserves the code/reports needed to
rebuild them, not the private data itself. If missing, ask for the originals again:

- Questions details.csv
- BNB video mappings.pdf
- pathoma mapping.pdf
- First Aid for the USMLE Step 1 2025 35th Edition index.pdf
- USMLE GUIDEBOOK 2025-2026.pdf

Do not claim GitHub saved the full transcript or private files. Use the filenames
and checksums in docs/data/coverage.json to verify reuploaded sources. No actual
student progress or authorized AnKing backup has been supplied.

## Verification commands

From desktop/: `python -m unittest discover -s data_foundation/tests -v`.
From repo root: `node scripts/verify-reference.cjs` and
`node scripts/smoke-reference.cjs`. See docs/data/README.md for import commands.
The prior shell Git connection failed to reach its proxy; GitHub connector Git
blob/tree/commit/ref tools worked. Never bypass a rejected approval; the user has
now explicitly approved this scoped upload, so do not ask again for the same work.

## Open data gates

First Aid index page 813 is absent; OCR/index context needs review. Subject/system
codes lack dictionaries, resource identities are provisional, community crosswalks
could not be acquired, and Sketchy/AnKing data is missing. Candidates are not
medical equivalence. Full planner/UI/Windows release work remains unimplemented.

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
