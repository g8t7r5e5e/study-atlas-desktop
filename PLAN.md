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
