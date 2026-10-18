# Source and rights register — checked 18 October 2026

This register separates availability from permission to redistribute. No source
code was copied from the repositories below. Downloaded user source files are
unchanged outside Git. Per-file SHA-256, parser version, acquisition time, row
counts, format and validation results are in the generated coverage manifest.

## Supplied files

| Source | Use | Rights / limitations |
|---|---|---|
| Questions details.csv | QID/title/classification-code/statistics metadata | Private local only. Bodies, explanations, answers and media never imported or packaged. Provider/product and ID meaning are user assertions. |
| BNB video mappings.pdf | 2025 video checklist and listed minute durations | Private local only; copyright notice. No QID crosswalk or provider video IDs. Declared counts/totals can disagree with printed rows. |
| pathoma mapping.pdf | OCR of duration rows | Private local only; owner/version/redistribution rights unverified. Combined rows retained. All OCR rows require review. |
| First Aid for the USMLE Step 1 2025 35th Edition index.pdf | Numeric index references | Private local only. Partial index; not full book or complete workload catalog. Layout/context needs review. |
| USMLE GUIDEBOOK 2025-2026.pdf | LSU study-planning background | Private local reference. Not the separately named backend-data research document and not a current official exam specification. |
| Pasted text.txt | Project brief | Requirements input, not a dataset or authority for third-party licensing claims. |

The separately referenced **Backend Data Package for an Algorithm-Driven USMLE
Step 1 Planner** was not supplied. Its claimed starter ZIP was not found. No
contents or downloads from either are assumed.

## Community crosswalks attempted

| URL | Observed result | Import / redistribution |
|---|---|---|
| https://docs.google.com/document/d/1LZweYMU5yXZIQtFl4AVpOo1-U9UQ6uRAo4mnu74Z2n4/edit | Web fetch returned Internal Error | Not acquired; rights unknown |
| https://hoyadocs.com/Block4-GI/resource-mapping/HoyaDocs-UWorld-QID-Mapping.xlsx | Web fetch returned Internal Error | Not acquired; rights unknown |
| https://hoyadocs.com/Block4-GI/resource-mapping/HoyaDocs_Resource_Mapping.xlsx | Web fetch returned Internal Error | Not acquired; rights unknown |

These errors do not prove the sources are deleted or authentication-restricted.
The related Reddit discussion remains a lead, not imported mapping evidence:
https://www.reddit.com/r/medicalschool/comments/16dpri3/i_matched_every_bb_video_with_a_string_of_uworld/

## Repository references

GitHub metadata, root file listings, README files and available license files
were fetched through the connected GitHub API. Selected tag-processing code was
inspected in Atlas, UWorldToAnking and find-uworld-questions-anki-addon. Metadata
dates below are observed push dates, not promises of maintenance or quality.

| Repository | Actual purpose / useful pattern | License and last push |
|---|---|---|
| https://github.com/TheEverion/Atlas | Browser extension plus Anki add-on connecting result IDs with note/resource tags. Useful concept: local note graph. | No license detected in metadata/root; no reuse. 2026-09-24 |
| https://github.com/roshanlodha/Uworld2Anki | Generates cloze cards from educational objectives using a paid ChatGPT API; it is not a QID crosswalk dataset. | MIT license file checked. 2025-03-24. No dependency introduced. |
| https://github.com/omn0mn0m/UWorldToAnking | Browser code builds Anki tag searches from question IDs. | GPL-3.0 file checked. 2024-11-28. No code incorporated. |
| https://github.com/Yusufashk/find-uworld-questions-anki-addon | Extracts and deduplicates IDs from selected notes/cards, separated by exam product. | MIT file checked. 2025-09-10. Independently implemented scoped-ID handling. |
| https://github.com/langfield/AnKing-v11 | Historical deck represented as files via ki; large media tree. | No license detected; deck rights not established. 2022-06-16. Deck/media not downloaded. |

## Official references checked

- https://www.usmle.org/step-exams/step-1 — exam format changed on 14 May 2026;
  do not hardcode the older guidebook's exam blocks into future plans.
- https://www.usmle.org/exam-resources/step-1-materials/step-1-content-outline-and-specifications
  — 11 system groupings and 11 discipline categories captured as referenced
  taxonomy facts. This is not the full granular outline or an official curriculum.
- https://docs.ankiweb.net/ — documentation available. No user collection supplied.
- https://www.ankihub.net/step-deck — supports resource/QID tagging; availability
  of a deck page does not authorize downloading or redistributing its contents.
- https://www.boardsbeyond.com/ — redirects to McGraw Hill product page. No current
  item-level catalog/API was obtained from this page.
- https://www.pathoma.com/ — official product page available, no catalog acquired.
- https://www.sketchy.com/ — official product page available, no catalog acquired.
- https://medical.uworld.com/usmle/usmle-step-1/ — product page available; the
  supplied CSV is not asserted to represent the complete current official bank.

## Missing-data and restricted-source manifest

Missing: subject/system dictionaries, verified provider QID lineage, stable BnB
video IDs, a directly evidenced resource-to-QID crosswalk, Sketchy catalog,
authorized Anki backup, complete First Aid chapter workload metadata, granular
curated topic hierarchy, and the separate backend research document. These gaps
remain explicit; no fictional replacements exist.

All full third-party PDFs, extracted catalogs, mapping candidates and user-derived
topic labels stay in desktop/private-data. The public ZIP contains code, schemas,
aggregate reports, references and the 22 official category facts only. A separate
local metadata export contains the real normalized rows, without question text.

## ETL dependencies

Python standard library supplies SQLite, CSV, JSON, ZIP and tests. PDF/table tooling
is pinned in requirements.txt: pypdf (BSD-3-Clause), pdfplumber (MIT), Pillow
(HPND), openpyxl (MIT). Their transitive runtime dependencies are resolved by pip;
this is not a hash-locked dependency environment. Pathoma OCR additionally requires
Tesseract (Apache-2.0) with English language data. No dependency binaries or
third-party source are vendored in the ZIP. Installed package metadata and versions
are recorded with verification results. An offline Windows runtime does not yet
bundle these development tools.
