# Executed verification

Environment: Linux; Python 3.12.14; SQLite 3.53.1; pypdf 6.10.0;
pdfplumber 0.11.9; pdfminer.six 20251230; pypdfium2 5.13.0; Pillow 12.3.0;
openpyxl 3.1.5; Tesseract 5.5.0. Parser version 1.0.2.

## Passed locally

- 18 Python unittest cases: metadata allowlisting, CSV quoting/BOM/newlines,
  configurable headers, malformed rows, missing/duplicate/scoped QIDs, invalid
  statistics, safe smaller-import handling, history rollback, progress retention,
  stable video IDs on title change, nullable runtime, candidate provenance,
  stale snapshot exclusion, Anki product/root parsing including COMLEX, separate
  note/card extraction, read-only backup, WAL rejection, XLSX formula rejection,
  SQLite export and unsupported future schema rejection.
- Real question CSV: 3,659 rows and 3,659 unique IDs; repeat import created no
  additional question records, versions, snapshots or topic labels.
- Actual source-file SHA-256 values still match the acquired originals.
- SQLite integrity_check = ok and foreign_key_check returns no violations.
- Private SQLite export has matching key table counts and passes integrity_check.
- Every JSON export opens successfully.
- All 110 Pathoma OCR durations match independent encoded PDF numeric tokens.
- No student progress or Anki data was invented to populate empty tables.
- Approved prototype file hashes still match the baseline manifest.
- All 22 existing prototype route render checks pass.

First Aid follow-up: all **27 tests** now pass (the original 18 plus nine outline
tests), including a schema-1 upgrade with existing user data, heading/wrapped-line
recovery, missing-page isolation, safe selections, idempotence and chapter/search
browsing. The real outline links all 13,247 raw entries and passes SQLite integrity
and foreign-key checks. Original raw counts and candidate mapping coverage remain
unchanged. All outline nodes retain needs-review status.

The ZIP builder additionally checks CRC, exact manifest membership, byte lengths
and SHA-256 of every member before returning success. Its separate verification
JSON and checksum file accompany the downloadable ZIP. A clean-extraction test
is recorded in the final artifact verification.

## Not claimed

Clinical mapping review, complete First Aid index/context recovery, live provider
QID validation, resource-ID crosswalk approval, real AnKing collection import,
browser visual/interaction testing, Electron/Windows builds, installed-app tests,
or Checkpoint 2 scheduler/onboarding/AI-import behavior. CI is configured but its
remote run status must be checked independently; local tests are the evidence
reported here.
