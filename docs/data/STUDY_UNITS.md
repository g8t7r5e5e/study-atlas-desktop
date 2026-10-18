# Compact First Aid study curriculum

The main planning granularity is now **334 editorial study units** across 16
systems/foundational groups. The detailed First Aid index hierarchy remains a
lookup/provenance layer; its 7,285 parent labels are not daily scheduling topics.
These groupings are an original draft curriculum, not official First Aid headings
or a medically reviewed claim of exhaustive book coverage.

Cardiovascular has 28 units. Ordering follows printed First Aid page evidence, including pressure-volume
material before Wiggers when its referenced page is earlier. Major organ-system groups
contain 20–29 units; smaller foundational disciplines are not padded to 20.
The complete selectable list is in STUDY_UNIT_CATALOG.md.

## Implemented contract

`study_units.json` contains persistent unit IDs, sequence, concept aliases, BnB
module scopes and First Aid chapter boundaries. IDs must never be renumbered or
reused when units are inserted or reordered; sequence is independent of identity.
Definitions are content-versioned in SQLite schema 3. Candidate resource links
retain item/catalog IDs, matched terms and chapter-scoped page pointers. Old
snapshots remain available; exported links use only the active catalogs. Rebuild
after any import, catalog activation or rule change. No PDFs are reparsed by this
command. The full ingestion pipeline and private export also include this layer.

From desktop/:

```sh
python -m data_foundation --db private-data/verified.sqlite study-units --out private-data/verified-export/study_units.json
python -m data_foundation --db private-data/verified.sqlite study-units-select cardiovascular-01 cardiovascular-02 cardiovascular-03 cardiovascular-04 --out private-data/cardiac-selection.json
```

Selections deduplicate shared video and question IDs across units. BnB runtime
is recorded viewing time, before playback-speed adjustment, pauses or note-taking.
First Aid references are pointers, never inferred continuous reading ranges.
Reading time, MCQ practice/review time and Anki time require student calibration.
A unit is not automatically one day. No calendar event or plan is activated.

## Actual incremental verification

See study-unit-coverage.json. 333/334 units have BnB candidates covering all 496
videos; vaccination has no BnB title candidate. Twelve videos appear in multiple
units and must be deduplicated. 203/334 units have First Aid index candidates
(1,259 distinct raw entries). Missing page links are visible, not guessed.
109 units have candidate question links, representing 696 distinct QIDs. These
are a subset of the existing database's candidate links, not newly reviewed
clinical crosswalks. Zero unit-to-question links are reviewed. Anki counts remain
null because no usable unit/card crosswalk has been supplied. Pathoma's existing
catalog/crosswalks remain intact; direct compact-unit rules await review.

All links here are candidates based on normalized title phrases and source scope.
They are not evidence of clinical equivalence or sufficient daily MCQ coverage.
Remaining index entries are retained and listed privately as unassigned. The
source index alone cannot establish complete First Aid reading coverage.

34 Python tests pass, including chapter boundaries, selected-item deduplication,
active-catalog changes, missing workload values and invalid selection rejection.
Source catalogs were reused without reimport. Raw counts and foreign keys remain
intact. The shareable ZIP contains code, original curriculum definitions and
aggregate coverage; private resource titles, QIDs and resolved links stay local.

## Page-order correction (authoritative)

The former manual teaching order is superseded. Export schema v2 sorts units by
first matched printed page, retaining immutable IDs. Units without page evidence
have null sequence/reading_order and are explicitly unresolved. Definition order
is also corrected; its sequence 0 denotes unresolved, never a schedule position.
Rebuilding recomputes position from active catalog evidence.

**Scheduling must use `reading_sequence`, not whole units sorted by first page.**
It emits 336 strictly ascending page buckets, with zero backward transitions.
Noncontiguous references are split into their page positions. First Aid links in
each bucket contain only that page; BnB and question candidates are carried at
their first occurrence in the selected sequence, deduplicated by persistent ID.
The unit-level crosslinks remain intact for lookup. This placement is provisional,
not clinically reviewed equivalence. Unknown-position units never enter the page
sequence and remain listed separately in both JSON and the catalog.

This fixes order for the 203 units with matched index references. The other 131
need reliable heading/page evidence; the supplied index does not currently yield
that mapping. Exact within-page heading order and complete topic reading spans
cannot be established from this index alone. Do not claim all 334 are now exactly
matched to the book. Full chapter headings with printed pages would resolve this
remaining source gap. No original import or mapping evidence was discarded.
