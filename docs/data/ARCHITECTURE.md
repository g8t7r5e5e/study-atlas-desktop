# Existing architecture and integration contract

Audited baseline: b25d81f, branch work; feature branch:
feature/usmle-data-and-study-planner. No desktop directory, package manifest,
database, authentication service, API server or installer existed at baseline.

The approved renderer is plain HTML/CSS/JavaScript. Loading order is data.js,
import.js, app.js, dashboard.js. The last script overrides several route handlers.
Browser records use localStorage under zahoor-atlas-prototype. The 22 rendered
routes include daily planner, calendar, resources, UWorld, Anki, progress,
assessments and settings. CSV/XLSX preview import already exists in the prototype.
The dated data.js contains owner data and private Notion links; it is not a clean
resource catalog or a student backup. It is excluded from the data package.

Checkpoint 1 introduces a versioned SQLite schema and offline Python ETL under
desktop/data_foundation. It is in the existing repository and uses its required
database technology. It does not pretend the browser can access SQLite. The
repository API returns metadata DTOs for the future Electron main-process service;
the renderer must later consume these through a narrow validated preload bridge.
No Python subprocess is exposed to renderer-controlled arbitrary arguments.

Resource Map will consume resource_items/topic_resource_mappings. UWorld will use
provider/product scoped question IDs, never MAX(qid). Planner workload will use
current catalog snapshots and nullable durations; existing user progress has
separate foreign keys and survives source refreshes. Missing items are retained
historically. First Aid index references are not page-reading workloads. Numeric
subject/system codes require an authoritative lookup before semantic grouping.

The source-of-truth topic layer separates official category references from
source-derived internal topic labels and unreviewed cross-resource candidates.
Evidence status is carried to exports. Clinical equivalence is never established
by a title match alone. Checkpoint 2 must implement user approval, plan history,
capacity constraints and the existing visual conventions after this data gate.
