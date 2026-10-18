# Compact First Aid study curriculum

The main planning granularity is now **334 editorial study units** across 16
systems/foundational groups. The detailed First Aid index hierarchy remains a
lookup/provenance layer; its 7,285 parent labels are not daily scheduling topics.
These groupings are an original draft curriculum, not official First Aid headings
or a medically reviewed claim of exhaustive book coverage.

Cardiovascular has 28 units. Its first four are cardiac embryology, cardiac
anatomy, cardiac physiology basics and Wiggers diagram. Major organ-system groups
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

31 Python tests pass, including chapter boundaries, selected-item deduplication,
active-catalog changes, missing workload values and invalid selection rejection.
Source catalogs were reused without reimport. Raw counts and foreign keys remain
intact. The shareable ZIP contains code, original curriculum definitions and
aggregate coverage; private resource titles, QIDs and resolved links stay local.
