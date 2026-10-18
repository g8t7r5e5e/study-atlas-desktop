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

First unfinished work: review the recovered First Aid hierarchy and mapping
evidence, acquire numeric-code dictionaries and stable resource identities, then
ingest the next real resources when supplied. Follow
docs/data/NEXT_RESOURCES_AND_PLANNER.md for the saved resource-ingestion workflow
and subsequent algorithm-comparison plan. No further resources have been invented
or fetched just to appear complete. The scheduler, questionnaire and calendar/app
integration remain future checkpoints. Continue from this state, not from scratch.

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
