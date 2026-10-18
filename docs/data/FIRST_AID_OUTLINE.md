# First Aid topic/subtopic organization

The supplied index now has a separate, versioned outline for selecting study work.
It retains the original 13,247 raw catalog entries and does not replace the
shared clinical topic taxonomy with book-index headings.

The real layout pass recovered **7,285 parent topics and 8,309 subtopics**. All
13,247 raw entries link to outline nodes by their original PDF page/column/line
locations. Seven entries with missing parent context go in one explicit review
group; context is reset across missing printed page 813. Wrapped lines are joined
using their indentation before interpreting references. Of the outline nodes,
13,083 have direct numeric page references; the other headings can provide parent
context or require review. Counts differ from raw rows because wrapped fragments
are consolidated and parent headings are represented explicitly.

## How it becomes usable for planning

- Browse by chapter, search a parent or a child label, then expand its subtopics.
- Chapter facets use printed chapter starts from the supplied 2025 table of
  contents. A topic can belong to several chapters; it is not forced into one.
- Select a parent, individual children, or both. The resolver deduplicates node
  IDs, linked catalog item IDs and referenced pages.
- Keep page pointers, source locators, outline version and review status in the
  proposed reading selection. A future app view can consume this DTO unchanged.
- Show candidate linked resources through existing shared-topic evidence.
  Mapping confidence/status stays visible; no title match becomes equivalence.

Index pointers are sparse references, not full chapter assignments. The resolver
does not silently fill gaps between page numbers, guess reading minutes or
activate a calendar plan. Runtime estimate stays null until calibrated. Selecting
a parent includes its referenced pages across all chapters; chapter filtering is
currently a browsing filter, not a silent scope restriction.

## Working commands

From `desktop/`, after importing the original First Aid PDF:

```sh
python -m data_foundation --db private-data/verified.sqlite firstaid-outline '/path/First Aid index.pdf'
python -m data_foundation --db private-data/verified.sqlite outline-browse --chapter Respiratory --query 'A-a gradient'
python -m data_foundation --db private-data/verified.sqlite outline-export private-data/firstaid-outline.json
python -m data_foundation --db private-data/verified.sqlite outline-select 'actual-node-id-from-browse' --out private-data/reading-selection.json
```

The pipeline now builds the outline automatically; `export-private` includes its
four normalized tables and the nested `firstaid_outline.json`. Raw sources and
their derived outline remain private. Only code, aggregate counts and methods are
in GitHub/the shareable package.

## Validation and limitations

27 tests pass, including nine outline tests covering parent/child structure,
wrapped lines, missing-page context, distinct same-named children, deduplicated
selections, source checksum verification, idempotence, chapter/search browsing and
additive migration from schema 1 to schema 2. Real examples were checked against
the PDF text for A-a gradient, abdominal pain and abdominal aorta. SQLite integrity
and foreign keys pass after building the real outline.

All nodes still require review. Indentation recovery is not clinical curation.
The schema supports resource outlines, but these page boundaries and parsing rules
are specific to the supplied 2025 First Aid edition. New editions need their own
validated adapter. No planner UI or calendar activation is claimed by this change.
