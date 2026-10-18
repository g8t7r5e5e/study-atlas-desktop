# Checkpoint 1 review — 18 October 2026

The real database, importers, metadata exports and mapping review infrastructure
are implemented in the existing Study Atlas repository. The data is structurally
valid, but cross-resource mapping coverage is not yet clinically reviewed.

## Actual imported rows

| Source | Current rows | Interpretation |
|---|---:|---|
| Question CSV | 3,659 | Unique provider/product-scoped references; no duplicate IDs in this file |
| Question titles | 1,142 | Source-derived internal topic labels, not an official granular taxonomy |
| BnB checklist | 496 | Videos across 22 modules; 150h 51m of listed runtime |
| Pathoma checklist | 110 | Printed duration rows; 34h 4m 39s; 13 combined rows |
| First Aid index | 13,247 | Candidate numeric index entries, 14,466 page references |
| Official category references | 22 | 11 system groupings and 11 disciplines |
| Anki notes/cards | 0 / 0 | No authorized collection supplied |
| Sketchy catalog | 0 | No item-level source acquired |

BnB headings sum to 497 videos, but the source lists only 29 pulmonary videos
under a 30-video heading. There is no invented 497th row. Individual minute
durations often disagree with printed module totals; those discrepancies are
reported. BnB checklist names are not stable provider IDs.

All 110 Pathoma OCR durations independently agree with the numeric glyph channel
in the PDF. Titles and combined lesson boundaries still need review. No runtime
is split or duplicated across the constituent lessons.

First Aid printed index page 813 is absent from the supplied file. Extraction is
partial and all index entries remain review-required because column context and
wrapped headings can be ambiguous. These references are not page-reading tasks.

The CSV has 13 subject codes and 169 system codes, but no dictionaries. All
`lastUpdated` values say 01/01/2026; that does not establish current provider
coverage. Question bodies, explanations, answers and media remain only in the
unchanged original upload. They never enter normalized SQLite or either package.

## Mapping coverage

| Resource | Items with candidate links | QIDs reached by candidates | Reviewed QID crosswalks |
|---|---:|---:|---:|
| BnB | 95 / 496 | 552 / 3,659 (15.09%) | 0 |
| Pathoma | 8 / 110 | 75 / 3,659 (2.05%) | 0 |
| First Aid | 1,347 / 13,247 | 1,814 / 3,659 (49.58%) | 0 |

There are 1,005 exact-title candidates and 528 fuzzy-title candidates.
Across resources, 2,025 distinct question IDs have a candidate link (55.34%);
the remaining 1,634 have none. Resource-specific coverage overlaps and must not
be summed. Exact title matching still does not establish medical equivalence.
The review queue contains 14,913 entries, mostly First Aid extraction review.

## Deliverables and boundaries

- `desktop/data_foundation/`: reusable importers, SQL schema, version activation,
  optional Anki backup reader, candidate generation, reports and package verifier.
- `desktop/private-data/verified.sqlite`: real normalized private database.
- `desktop/private-data/verified-export/`: metadata-only CSV/JSON and consistent
  SQLite backup, candidates, evidence, unmatched lists and source manifests.
- Shareable ZIP: code, SQL, aggregate reports, rights/source register, dictionary,
  and actual official category records in SQLite/CSV/JSON. Restricted catalogs are
  intentionally excluded under the project brief's private-local-only rule.
- Private metadata ZIP: retained in `desktop/private-data/`, not pushed to GitHub
  or published as a download. It contains all normalized metadata, no question text.

There is no existing Electron runtime to wire into at this baseline. The repository
layer and SQLite contract are ready for that work, but no live app integration,
Windows installer, visual parity, or student-data migration is claimed here.

## Validation and next gate

See VERIFICATION.md and machine-readable coverage.json for executed checks.
Before Checkpoint 2: review the numeric-code dictionaries and QID provenance,
the candidate queue, OCR/index limitations, stable resource identities and rights.
A directly evidenced crosswalk or authorized Anki backup would materially improve
coverage. Planning must not treat current candidate links as approved assignments.
The complete granular topic hierarchy and missing resource catalogs remain open.

The next checkpoint is intentionally not activated: this is the requested review
point for actual counts and evidence, not a claim that all data is trustworthy.

## Approved First Aid follow-up

The user approved GitHub publication and requested topic/subtopic organization.
The outline now recovers 7,285 parent topics and 8,309 subtopics, linked to every
raw index entry, with chapter/search browsing and deduplicated reading selections.
Seven orphan entries remain in one review group. 27 tests pass. This is a
resource-specific, review-required outline, not a replacement clinical taxonomy.
See FIRST_AID_OUTLINE.md and the repository's CONTINUE.md for the saved handoff.
