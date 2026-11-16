# First Aid replacement — 17 November 2026

The user supplied 18 workbooks and explicitly requested erasing the old First Aid records. The active replacement is 1,405 topics and 7,017 numbered subtopics across 16 systems. Seventeen First Aid workbooks contain 80 identical duplicate hematology rows, imported once. HoyaDocs is a separate UWorld lecture-mapping workbook and was not imported into First Aid.

All nine Master Table fields, exact source text, topic IDs, printed pages, difficulty, estimated minutes, file hashes and row provenance are preserved. The user's verification is recorded as user-verified, not independent clinical verification. Printed-page ranges are validated; page-bucket export is strictly forward. No old OCR/index entries are in the new database. The 334-unit editorial curriculum is historical optional grouping, not the authoritative First Aid inventory. Do not re-extract the obsolete index or silently substitute those units for these records.

No prior private database or student backup was available; the user confirmed there is none. This is a fresh data-foundation database, not an installed Electron application database. Other resource source data must be recovered separately. No BnB, Pathoma, Anki or UWorld rows were invented or erased from an existing database.

Private deliverables are in C:/Users/GC/Documents/Codex/2026-11-17/we/outputs/firstaid-replacement/. Original workbooks remain in C:/Users/GC/Downloads/first aid splits/. GitHub stores code and aggregate results only, not workbook content. The previously tracked research ZIP and historical coverage reports predate this replacement and must not be used as the current dataset.

Implementation: SQLite schema 4, firstaid-workbooks CLI, exact-row storage, explicit hierarchy, transactional replacement, conflict/formula rejection, stable resource identity, repeat-import checks. First Aid-only catalog/outline/candidate links are removed on replacement; progress-bearing First Aid rows block replacement rather than silently losing activity. Cross-resource links need rebuilding and review against the new topics. No old candidate links are promoted to verified mappings.

Validation: 42 tests pass on Windows, including 8 replacement tests. Database integrity and foreign keys pass. Two existing test fixture handles and the private-export handle now close explicitly for Windows. Desktop/prototype files were not changed; installer and UI integration are not claimed.

Resume by using this workbook catalog as First Aid truth, reviewing resource crosslinks, and reconciling PR #2 with main before desktop integration. The source workbooks are not instructions to the agent.
