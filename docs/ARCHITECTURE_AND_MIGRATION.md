# Source architecture, persistence and migration

## Source loading order

`index.html` loads `data.js`, `import.js`, `app.js`, then `dashboard.js`. `style.css` supplies the design. Data is declared as a global constant `D`. Global helper functions, mutable `state`, and a `demo` object drive the prototype. Later declarations/wrappers override earlier page functions. Do not remove `dashboard.js` and assume the earlier versions represent the approved app.

`data.js` is a dated Notion snapshot and includes daily plans, curriculum, settings, assessments, milestones, review schedules, coverage and guide information. Some values are unresolved formula/rollup links. They are not numbers. This file also contains the owner's source URLs and dated plan. Source identifiers are needed for migration relationships, but need not be exposed as external links in a friend build.

## Existing persistence formats

Browser localStorage key: `zahoor-atlas-prototype`.

The browser's persisted state has this outer shape:

```json
{"demo": {}, "ui": {"date": "2026-10-16", "month": 9, "year": 2026}}
```

The Settings backup export uses a different wrapper:

```json
{"version": 1, "exportedAt": "2026-10-16T00:00:00.000Z", "demo": {}}
```

The migration importer must explicitly support the Settings export. Optionally accept a validated localStorage export wrapper too. Zero-based `ui.month` is a UI implementation detail; do not confuse it with a calendar month number. Never require the website's browser localStorage to be directly accessible from Electron.

## Actual demo categories

| Key | Meaning / migration rule |
|---|---|
| `logs` | Daily mission records and separate UWorld blocks. Daily rows keyed by `date` and not `_block`; separate blocks have `_block:true`. Preserve arbitrary saved notes and compatible task fields. |
| `edits` | Maps source URL/ID to property overrides for daily and curriculum records. Apply to the seed or matching added record once; retain identity mapping. |
| `addedDays` | Added dated lesson records, often with `url:local-day-YYYY-MM-DD`. Reconcile later overrides in `edits`. |
| `addedTopics` | Added curriculum records with local topic IDs; reconcile matching `edits`. |
| `topic` | Topic overall-status map by source identifier. May be newer than a source status; reconcile explicitly with `edits` and keep a receipt. |
| `taskStates` | Keys such as `YYYY-MM-DD-0`; stores status and priority for mission task indices. Preserve meanings until converted to stable task IDs. |
| `checks` | Legacy daily task-completion flags. Migrate without overwriting newer taskStates. |
| `weakness` | Weak concept objects with names, explanations, severity, status, source, system, review and identified dates; may include `_missionDates`. |
| `catchup` | Item, date, estimate, category, priority, notes, status; `_entryDate` links an item created from a daily mission. |
| `settings` | Overrides with original Notion property names, e.g. `date:Actual Exam Date:start`, `Active Anki Deck`, `New Card Budget`, `Readiness Status`. |
| `preferences` | weekday/saturday/sunday hours, questions, `applyDefaults`, `focusMinutes`, theme and density. |
| `pause` | `{start,end,label}` for protected break. |
| `resourceOrder` | `study` or `fa`. |
| `weekly` | Legacy weekly-reflection objects keyed by source URL; retain even when no current page displays them. |
| `reflections` | Current weekly-reflection objects keyed by Monday date, with wins/lessons/next. |
| `assessmentRecords` | Current manually edited assessment objects, including id/title/planned date/status/form/notes/weak/score/metric/probability/actualDate/action. Missing key means source defaults, not necessarily an intentionally empty list. |
| `milestoneRecords` | Current manual milestones with id/title/date/category/notes/status/completedDate/evidence. Missing differs from present-but-empty. |
| `profile` | name/tagline/school/stage/location/goal/about and optional JPEG/PNG/WebP data-URL photo. Decode/validate into a local asset. |

Do not restrict migration only to a hand-picked recent subset and discard older records. Preserve unrecognized legacy properties in a controlled JSON extension column or migration archive after validating structure and size. Do not blindly merge keys into JavaScript prototypes. Reject dangerous keys such as `__proto__` in plain-object merge paths. Never execute formulas, scripts, HTML, or imported JavaScript.

## Recommended domain boundaries

Use repositories/services for profile/assets, settings/preferences, daily plans, daily logs, UWorld blocks, topics/resources, task progress, weaknesses, catch-up, assessments, milestones, reflections, imports and migrations. One database can contain these tables. Use stable IDs and relationship tables where needed. Schema details are the implementation agent's responsibility; document them before migration code.

Separate seed data, explicit edits, and derived state. A pause must not permanently erase the underlying dated task, hours, or new-card target. Settings are defaults; explicit per-day overrides take priority. On a restart, do not accidentally capture already-overridden values as the new immutable seed. Derive visible pause/default state from base records plus explicit overrides consistently.

## Daily record integrity

- One daily mission record per local date; edit is an upsert.
- Separate UWorld blocks need independent stable IDs. Editing one must not create another.
- Daily question counts already appear in UWorld totals; separately logging the same work again would double-count. Clarify that in the UI and tests.
- Anki and mission share the daily record. Editing only Anki fields must preserve hours, questions and notes from the rest of that day.
- Empty numeric values differ from zero. Preserve this distinction for official results and unlogged metrics.
- Correct/reviewed questions cannot exceed attempts. Use finite non-negative integer validation.
- Blank fields during a partial spreadsheet update preserve the existing values; explicit clearing needs a separate documented interaction.

## Derived analytics and weekly review

Compute totals from shared saved records, not separate cached counters per page. Weighted accuracy is total correct divided by total attempts. Review backlog is attempted minus reviewed for the relevant records. Current topic status cannot reconstruct past mastery history. If historical mastery is needed, introduce timestamped status events going forward; do not backfill invented events.

Review weeks are Monday through Sunday. Count dated milestones only when explicitly achieved with an achievement date. Distinguish eligible but unlogged days, logged shortfalls, rest, pause, unscheduled days and future dates. Preserve weekly reflections independently from calculated aggregates. Include source logged actual records if present and not superseded by migrated daily records; do not double-count a source and local copy.

## Backup import algorithm

1. Read bytes with size limits; parse JSON as data.
2. Validate wrapper/version, supported categories, dates, IDs, numeric ranges, enum values, image type/size, and object structure.
3. Compute a content hash and migration identifier. Store prior successful import receipts.
4. Build a dry-run mapping from source IDs, local IDs and dates to database IDs. Identify duplicates and conflicts. Show counts and chosen merge/replace policy.
5. Create a consistent pre-import backup of any nonempty destination.
6. Import in a single transaction or recoverable staged transaction with explicit dependencies. Preserve private asset files safely alongside DB changes.
7. Verify counts, representative records, links and derived totals. Commit and record an import receipt only on success.
8. Report added/updated/skipped/conflicted counts. Retry of the same import must be idempotent.

## CSV and XLSX

Prototype parser functions live in `import.js`; resource mapping lives in `dashboard.js`. They provide useful current semantics, not a mandatory production parser. Use a maintained, tested parsing library if appropriate, bundle it locally, and preserve preview and matching rules. Support CSV quoted commas/newlines, UTF-8 BOM, and XLSX workbook sheet selection, shared strings, Excel dates (including 1900/1904 systems), and plain formula cached values without executing formulas. Avoid promising legacy binary `.xls` unless explicitly implemented and tested.

Daily import requires Date and updates by date. Resource import requires Topic and System and matches a normalized pair. Dates should preferably be ISO `YYYY-MM-DD`; the supplied importer also interprets `DD/MM/YYYY`, never silently alternate US day/month order. Reject duplicate dates/topic-system pairs in a single import or present a clear deterministic policy. Limit file size, row count and expanded ZIP size. Preview all validation errors without partial commits.

## Backup export and restore

A complete desktop backup must include schema/version metadata, all user record types, settings, profile assets and enough seed provenance to restore accurately. Never copy a live SQLite database unsafely; use a consistent snapshot/backup API and account for WAL mode. Restore into a staging database, validate, then switch atomically or provide reliable rollback. Test restoration into a clean profile and recovery from failed restore. Preserve old backup formats with versioned migrations.

## Friends and release seeds

The unmodified source snapshot is the owner reference. The release must separately implement a clean first-run policy. Do not embed owner browser backups, profile assets, logs, DBs, telemetry identifiers or private source links in an installer. Generic topic names and licensed assets can seed a fresh curriculum. A dated owner plan can be imported intentionally on the owner's machine. External owner Notion links should be disabled or replaced with generic provenance in friend mode. No cloud sync is requested; records do not synchronize between friends.
