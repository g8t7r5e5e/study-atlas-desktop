# Study Atlas — Complete Desktop Build Instructions

This standalone document combines the master prompt, user setup, feature requirements, migration notes and release tests. The ZIP supplies the source and scripts referenced below. It is a build handoff, not a compiled EXE.


---

<!-- Included from START_HERE.md -->

# Study Atlas desktop handoff

This ZIP contains the approved web prototype source and the complete specification for converting it to a Windows app. **It is a build handoff, not an already compiled Windows EXE.** No installer or Electron dependency tree is included.

## Use with Codex or Claude Code

1. Extract the whole ZIP to a normal writable folder such as `C:\Projects\StudyAtlasDesktop`. Do not run tools inside the ZIP viewer.
2. Install Git and Node.js LTS. Open the extracted folder as the local project in Codex or Claude Code. A chat-only session can read the bundle, but the build needs local terminal/filesystem access or a connected coding environment.
3. Open `MASTER_PROMPT.md`, copy its entire contents, and paste them into the coding agent. The shorter launcher below is also sufficient when the agent can access the folder.
4. Let the agent inspect and implement. Review working stages against the reference. Keep the source folder and Git history.
5. When it produces an installer, perform `docs/RELEASE_ACCEPTANCE.md` on your PC. A development preview is not the finished release.
6. Share the **friend-safe installer**, not your database, personal backup, or development ZIP. Friends should create their own profiles and records.

### Short launcher prompt

> Read MASTER_PROMPT.md and every document it references. The approved source is in prototype/. Implement the complete Windows desktop app in desktop/, preserving the exact design and all workflows. Follow BUILD_GUIDE.md and the acceptance checklist through actual Windows packaging and installed-app verification. Start by inspecting the files and environment, then continue implementation; do not stop at a plan.

## Preserve your current data

Before you migrate, open the hosted app in the browser where you use it. Go to **Settings → Download backup**. Keep that JSON outside this source folder. The desktop app must import it after its importer is implemented. This ZIP cannot contain your browser's localStorage, which is accessible only in your browser session.

## Files to read

| File | Purpose |
|---|---|
| `MASTER_PROMPT.md` | Paste into Codex or Claude Code |
| `BUILD_GUIDE.md` | Full requirements, steps, handoff and release guidance |
| `docs/FEATURE_PARITY.md` | Every route and interaction to preserve |
| `docs/ARCHITECTURE_AND_MIGRATION.md` | Existing records, durable storage and backup migration |
| `docs/RELEASE_ACCEPTANCE.md` | Tests that define a finished release |
| `docs/KNOWN_GAPS.md` | Actual prototype limitations and unverified work |
| `prototype/` | Exact source baseline from the deployed version |
| `examples/` | Synthetic CSV and JSON fixtures; never personal records |
| `scripts/` | Reference verification, smoke check and local preview |
| `SOURCE_MANIFEST.json` / `SHA256SUMS.txt` | Provenance and file integrity |
| `AGENTS.md` / `CLAUDE.md` | Project instructions recognized by coding agents |

## Preview the supplied reference

With Node.js installed, from this extracted root:

```powershell
node scripts/verify-reference.cjs
node scripts/smoke-reference.cjs
node scripts/preview-reference.cjs
```

Open `http://127.0.0.1:4173` in a browser. Stop the preview with Ctrl+C. This optional reference preview is not the future installed app. To avoid mixing test records with real records, use a separate browser profile.

## Source provenance

Baseline: deployed source commit `2b34c1fc508ffd7615d1b5753b9d39755dc148d7`, captured 16 October 2026, including the global dropdown readability fix. Original snapshot data dates from 16 October 2026. No hosted project credentials, Git metadata, hosting configuration, personal browser backup, or built EXE is included. The source snapshot includes the original study schedule and Notion source links; review before sharing raw source.


---

<!-- Included from MASTER_PROMPT.md -->

# Master implementation prompt — Codex or Claude Code

You are the implementation owner for **USMLE — Step 1 Study Atlas**, a finished Windows desktop app. Work directly in this extracted project. The supplied prototype is the approved visual and behavioral reference. Reuse its actual source; preserve the interface precisely. Complete implementation, testing, and Windows packaging rather than stopping after advice or scaffolding.

## Read first

Read `START_HERE.md`, `BUILD_GUIDE.md`, `docs/FEATURE_PARITY.md`, `docs/ARCHITECTURE_AND_MIGRATION.md`, `docs/RELEASE_ACCEPTANCE.md`, and `docs/KNOWN_GAPS.md`. Inspect all files in `prototype/`, in their actual script-loading order. Run `node scripts/verify-reference.cjs` and `node scripts/smoke-reference.cjs` before changing anything. These are baseline checks, not proof of production readiness. Treat `prototype/` as immutable reference; create `desktop/` for the implementation. Capture reference screenshots yourself if browser tooling is available. No baseline screenshots are included or claimed.

## Product goal

Deliver the same Study Atlas as a standalone, offline Windows desktop application, suitable for the owner's PC and distribution to friends. Preserve the forest theme, typography, mountain SVG, spacing, navigation, page layouts, tables, equal-height cards, pop-ups, dropdown readability, profile controls, import flows, and every established feature. Functional bug fixes are allowed and must be documented. Do not introduce a visual redesign or new framework unless a real technical requirement demands it. The live website is an optional supplementary reference: https://zahoor-study-atlas.modestpark4.chatgpt.site . Do not make runtime operation depend on this URL.

## Implementation choices

Use Electron with a locally bundled renderer and a local SQLite database. Choose and pin compatible, maintained versions after checking their official documentation. Prefer the existing HTML/CSS/JavaScript renderer. Use a narrow preload bridge and IPC to main-process services for persistence and file operations. If the SQLite library has native binaries, configure Electron ABI rebuild and packaging correctly. Use one supported Windows packaging toolchain, document it, commit its lockfile, and produce an installer .exe. A portable build is secondary if the toolchain supports it. Detect Windows architecture rather than assuming it. Default to a per-user installer without administrator rights where supported.

## Scope to preserve

All current routes and connected workflows: Overview; Today’s Mission; Focus room; Daily plan; Calendar; Resource Map with both orderings; UWorld; Anki; Weakness log; Catch-up queue; System progress; manual Assessments and analytics sidebar; Weekly review; Study analytics; Study roadmap; Milestones; Exam/settings; Study guide; How to use; workspace/source information; and Profile.

Preserve lesson add/edit pop-ups and read-only tables, grouped pause ranges, schedule and resource CSV/XLSX import previews, UWorld system selection, linked daily records, Anki journal, weakness New/Edit selection, manual milestone achievement dates, readable native dropdowns, global settings, profile photo, top-right buttons, and Back behavior. Implement backup restore in addition to the prototype's export. Preserve separation between coverage, mastery, performance, and readiness. Never invent medical scores, passing probabilities, historical mastery, or unique question counts.

## Durable data

Replace localStorage as the primary record store. Use versioned SQLite migrations, stable IDs, constraints, transactions, and explicit save/error states. Store database, profile images, backups, and logs under Electron's per-user application-data directory. Never write user records inside installation resources. Initial seed loading must be idempotent. Preserve explicit date-specific lesson edits when applying global defaults. Use a shared service/model layer so all linked screens and analytics agree after save, restart, and upgrade. Count daily UWorld records and separately logged blocks correctly without creating duplicate records during edits.

Implement the actual prototype backup importer described in the migration document, including `{version:1, exportedAt, demo}`. Validate formats and reject malformed, incompatible, or oversized data before changing the database. Offer a migration preview and an import receipt; reimporting the same backup must not duplicate records. Import without executing JavaScript from backup files. Keep original identifiers for relationship mapping. Never claim to recover browser records that were not provided.

## Backup and recovery

Provide complete backup export, validated restore, rotating automatic backups, a pre-restore backup, and a clear backup location. Include profile assets and all record categories. Ensure consistent SQLite snapshots, including WAL handling if enabled. Restore must be atomic or recoverable. Updates must preserve data. Uninstall should leave personal data unless the user explicitly requests deletion. Provide a separate clean test profile for automated tests.

## Security and offline operation

Use contextIsolation:true, nodeIntegration:false, sandbox:true where compatible with the architecture. Expose narrow validated preload APIs; validate IPC payloads and sender origins. Adopt a restrictive CSP. Refactor inline event attributes as needed without changing the visible UI. Do not use eval or execute imported data. Restrict navigation and new-window requests; open only approved HTTP(S) links in the external browser. Bundle fonts and required assets locally, with license notices. No remote URL, CDN, account, API key, or localhost development server is required for installed runtime operation. Network may be required during development to install tools and dependencies.

## Desktop behavior

Include app icon, native file dialogs, window bounds persistence with offscreen recovery, single-instance handling, keyboard usability, a reliable Back stack, and sensible error messages. Date-only records must not shift across timezones. Default timezone is Asia/Karachi and make it configurable. Handle midnight rollover without forcing a user off a historical date. Preserve focus timer timing after minimization, sleep, pause/resume, and system clock behavior. Use absolute elapsed-time logic with documented sleep behavior.

## Owner and friends

The source contains the owner's study-plan snapshot and original Notion links. Personal browser edits are not included. Keep development source private unless the owner chooses to share it. Produce a friend-safe installer: no owner profile, photos, logs, backup files, databases, private Notion links, or identity metadata. New users start with their own local profile and empty activity records. Offer a generic editable curriculum or clearly labeled sample plan, and an optional owner-only plan import. Do not silently distribute the owner's plan as everyone's personal schedule. Disable or replace owner-specific source links in friend builds while preserving the visual layout. Each Windows user gets independent data.

## Work sequence

1. Inspect source and environment. Confirm Windows/CPU/tools and reference checksums. Write PLAN.md, decisions, migration schema, and traceability matrix. Identify source behavior that is provisional or incomplete. Ask only genuinely blocking questions; use documented defaults for routine decisions.
2. Build a desktop shell that loads the original interface locally. Bundle fonts. Capture reference and desktop screenshots at matched viewport, route, theme, and data state. Keep this a visual-parity gate.
3. Implement durable repositories/services, seed policy, migrations, and the prototype backup importer. Integrate persistence across every workflow. Add missing backup restore and desktop error handling.
4. Complete offline operation, security boundaries, settings propagation, timezone handling, profile assets, timer behavior, and clean first-run behavior for friends.
5. Test domain rules, database migrations, import validation, backup round trips, record relationships, all routes and controls, visual parity, and Windows display scaling. Run installed-app tests as well as development tests. Keep evidence and fix failures.
6. Build installer .exe and optional portable package. Install, launch, restart, upgrade from a previous build, and uninstall-test in a disposable environment or with informed user authorization. Do not overwrite personal data during testing. Test a clean friend profile separately from owner migration.
7. Deliver source, lockfile, exact reproducible build commands, release artifacts with SHA-256 checksums, user/migration guides, dependency/license notices, test report, signing status, and known limitations.

Continue across these stages; do not declare completion at the end of planning. Keep small Git checkpoints. Never edit the hosted Site or deploy a website as part of this desktop task. Never commit personal data or secrets. Never remove working features to make tests pass. Do not claim a real Windows EXE, visual comparison, signing, or installed-app test has succeeded unless it has actually run. If the environment cannot build/test Windows, implement everything possible, provide a Windows build script or CI workflow, and state the exact remaining verification gate. A Linux dev preview does not close the Windows release gate.

## Commands and release contract

Define and document these commands in `desktop/package.json`: development launch, tests, reference/desktop smoke checks, and Windows installer build. Suggested names: `npm run dev`, `npm test`, `npm run test:e2e`, `npm run dist:win`; these names are a requested interface, not preexisting commands. Run from `desktop/`. Never tell the owner to execute commands that do not exist yet. End with exact artifact paths, tested Windows architecture/version, install instructions, tests actually run, failures/blockers, and signing status.

Start now by inspecting the provided files and environment, then proceed through the plan.


---

<!-- Included from BUILD_GUIDE.md -->

# USMLE — Step 1 Study Atlas: complete Windows build guide

Prepared 16 October 2026. For Codex or Claude Code with local project and terminal access.

## 1. What you are building

A faithful, offline Windows application from the approved Study Atlas prototype. Preserve the interface and its successful workflows. Add production-grade local persistence, recovery, migration, and installation. The owner wants to install it personally and send an installer to friends.

**This handoff includes source and instructions. It does not include a compiled EXE.** The implementation agent must build and test the Windows application before describing it as finished. No account, OpenAI API key, cloud database, paid backend, or live Notion connection is required for the installed app. Access to a coding agent and development downloads is separate from runtime requirements.

## 2. Owner setup, step by step

### Step A — Save personal records

Open https://zahoor-study-atlas.modestpark4.chatgpt.site in the browser used for studying. Select Settings, then Download backup. Keep that JSON in a private location, outside Git and outside files you send to friends. Do not clear browser data before migration is verified. The included `prototype/data.js` is the original seed snapshot, not your later browser edits.

### Step B — Prepare a Windows project

Install the coding agent of your choice with local file and terminal access. Install Git and Node.js LTS. VS Code is optional. Using PowerShell with winget, where available:

```powershell
winget install --id Git.Git
winget install --id OpenJS.NodeJS.LTS
```

Restart your terminal and check:

```powershell
git --version
node --version
npm --version
```

Use a supported Windows release and detect x64 versus ARM64. Windows x64 may be the primary release if it matches the machine, but do not label an x64 installer as ARM64-native. The agent must check Electron, Node, SQLite, packaging, and test-runner compatibility when installing. Pin chosen versions and commit a lockfile. Native SQLite modules may require Electron rebuild tooling and, if prebuilt binaries are unavailable, Windows C++ build tools. Install those only if needed. Do not require end users to install development tools.

If PowerShell blocks `npm.ps1`, the agent can try `npm.cmd` rather than changing machine-wide policy. Development sandbox/network prompts may need approval for normal dependency downloads. This is different from granting unrestricted access to the whole PC.

### Step C — Extract and open

Extract this ZIP to `C:\Projects\StudyAtlasDesktop` or another ordinary writable local folder. Open the folder in Codex or Claude Code. Do not assume a new coding session has the current conversation or access to the hosted Site's private source. All required reference source is supplied in `prototype/`.

Paste `MASTER_PROMPT.md`. In a chat UI that accepts ZIP uploads but cannot execute local Windows commands, use the ZIP as project context, then transfer the generated project to a local coding environment for the real build. A coding agent running only in Linux can prepare code or Windows CI, but installed-app Windows testing remains a release requirement.

### Step D — Review working stages

Keep the same project and preserve Git history. Ask the agent to continue the next incomplete stage and show the working app. Compare your familiar screens before accepting visual changes. An app that launches but does not save correctly is not finished.

### Step E — Install and migrate

After a release candidate is built, install it and choose import prototype backup. Verify counts and representative records against your original backup. Keep the hosted copy and original JSON until verification completes. Reimport must not duplicate records.

### Step F — Share with friends

Send only the friend-safe release installer, checksum, short installation guide, and release notes. Each friend should begin with their own profile and empty activity history. Do not send your personal database or backup. This source bundle contains your original study-plan snapshot and Notion links; it is intended for the implementation agent and should be reviewed before forwarding as raw source.

## 3. Visual contract

Use the source as the design authority. Retain the forest palette, Manrope/DM Sans typography, mountain illustration, charcoal panels, gold accents, spacing, borders, card rhythm, and restrained animations. Keep read-only horizontal tables with pop-up editing. Preserve equal-height system cards, cards with aligned footers, side analytics on assessments, and the cleaned catch-up/weakness layouts.

The reference loads fonts through a Google Fonts CSS import. A finished offline build must download/package appropriately licensed font files and notices, replace that network import with local `@font-face`, and compare rendering. Font binaries are not bundled in this handoff. The mountain artwork is inline SVG in `app.js`; preserve it without regenerating it.

Do not use the original README's old route count as authority. Inspect active functions after `dashboard.js` loads, because later overrides implement the final design. `app.js` and `dashboard.js` contain duplicate or overridden functions; these are source structure to refactor carefully, not permission to revert to earlier versions.

For visual comparisons, use identical viewport size, Windows scaling, timezone/date, fixture records, theme, and selected route. Suggested comparisons: 1440×900 and 1920×1080 at 100%, followed by 125% and 150% Windows scaling. Native selects may render slightly differently across Chromium versions; they must remain readable and usable. Record any unavoidable differences rather than promising mathematically pixel-identical output on every monitor.

## 4. Staged implementation plan

### Stage 1 — Audit and freeze

- Verify `SOURCE_MANIFEST.json` file hashes with the included script.
- Read actual source, including initialization order and global overrides.
- Document all routes, modals, forms, imports, stored records, settings, and cross-page relationships.
- Run the reference render smoke test. Inspect prototype behavior in a real browser when available.
- Create a baseline Git commit; preserve `prototype/` unmodified.
- Capture reference screenshots yourself. The package includes no captured UI screenshots.
- Write PLAN.md, architecture decisions, schema/migration design, and requirement-to-test mapping.

Exit gate: agreed source baseline and complete inventory, with known limitations explicit.

### Stage 2 — Faithful desktop shell

- Create `desktop/`, package configuration, Electron main/preload/renderer layout, and launch scripts.
- Load bundled application resources from a suitable local protocol or local packaged content.
- Keep the app independent of the live Site and developer server.
- Bundle fonts and icons with notices. Use the existing brand mark for a proper application icon, preserving its appearance.
- Add native window frame or unobtrusive title controls without redesigning page content.
- Implement single-instance handling and remembered, onscreen window bounds.

Exit gate: all routes work in Electron and the approved UI remains intact.

### Stage 3 — Persistence and shared state

- Introduce a repository/service layer and versioned SQLite database in `app.getPath('userData')`.
- Preserve stable identities and relationships. Store images under the user's application-data folder, referenced by ID/path.
- Add transactional saves, schema migrations, constraints, and honest failure states.
- Replace browser-only persistence without changing everyday input workflows.
- Migrate existing prototype backup and preserve every stored category, including legacy fields.
- Seed only once. Separate generic curriculum from the owner's dated study plan.
- Make cross-page updates immediate; recompute derived totals from shared records.

Exit gate: create/edit/restart/upgrade preserves all records, and migration is idempotent.

### Stage 4 — Production workflows

- Use native file-open/save dialogs and validated CSV/XLSX parsing.
- Keep previews, date ordering, matching and blank-cell semantics.
- Implement complete JSON/archive backup export and restore, pre-restore safety, rotating backups, recovery instructions, and storage error messages.
- Expose timezone and handle date-only values, daylight changes, midnight, and historical date selection.
- Verify all settings propagate with documented override rules.
- Make timer behavior explicit across pause, minimize, sleep, and reopening. Do not unexpectedly restart a completed session.
- Replace misleading prototype labels with accurate desktop/local-data wording while preserving layout.
- Provide friend-safe first run and owner-backup migration as separate flows.

Exit gate: daily use works offline with clear save/recovery behavior.

### Stage 5 — Security and quality

- Use a sandboxed, isolated renderer and minimal preload API.
- Remove or refactor inline handlers to support restrictive CSP; avoid enabling unsafe execution merely to preserve legacy code style.
- Validate IPC messages and destinations. Database and privileged file operations remain in main-process services.
- Restrict app navigation, new windows, and external protocols. Open approved web links in the default browser.
- Validate imported data and protect against huge/expanded spreadsheet archives, malformed XML, duplicate IDs, unexpected keys, and formula execution.
- Add keyboard/focus, screen scaling, visual comparison, persistence, migration and recovery tests.
- Review dependency advisories, compatibility, license notices and bundled font rights.

Exit gate: no unresolved serious functional or data-loss defects, with test evidence.

### Stage 6 — Build and release

- Choose a maintained Electron packager, e.g. electron-builder with NSIS, or another documented supported toolchain.
- Build a normal Windows installer `.exe`; add portable output only if supported and tested.
- Install and run the actual packaged build without Node, source folder, or internet.
- Test update from an earlier app version while retaining the database and profile.
- Document uninstall behavior. Default to preserving user data unless the user explicitly requests removal.
- Produce checksums, release notes, user guide, migration guide, and artifact paths.
- Code signing is a release decision requiring the owner's certificate/service. Do not invent signing credentials or claim signing occurred. Report unsigned status honestly; do not instruct friends to disable antivirus or security controls. A signed build still does not guarantee reputation-based prompts disappear immediately.

Exit gate: `docs/RELEASE_ACCEPTANCE.md` is completed with real evidence. Source code alone is not the installer.

## 5. Suggested implementation organization

This is a design guide, not pre-created implementation:

```text
prototype/                   # supplied immutable reference
 desktop/                    # agent creates this project
   package.json
   package-lock.json         # or one chosen package-manager lockfile
   src/main/                 # windows, IPC, repositories, files, backups
   src/preload/              # narrow renderer bridge
   src/renderer/             # preserved UI and event wiring
   migrations/               # versioned DB migrations
   assets/fonts/             # locally bundled, licensed fonts
   assets/icons/
   tests/unit/
   tests/integration/
   tests/e2e/
   release/                  # locally generated, not user records
 docs/                       # supplied requirements + final user/release docs
```

An initial JSON compatibility adapter may help migration, but final persistence must be durable and versioned, with tested writes. Do not silently keep localStorage as the primary desktop database.

## 6. Required command interface

The implementation agent should define and test these commands inside `desktop/package.json`:

```powershell
npm ci
npm run dev
npm test
npm run test:e2e
npm run dist:win
```

These desktop commands do not exist in the handoff yet; the agent must implement them. The reference scripts in `scripts/` do exist and require only Node.js. Document exact build tool versions and the output path rather than guessing installer names. Keep secrets out of package scripts and logs.

## 7. Practical handoff prompts

### Continue work

“Read PLAN.md and the parity checklist. Continue the next incomplete stage. Preserve the approved UI, implement and test the work, and update the evidence. Do not stop after describing a plan.”

### Correct visual drift

“Compare this desktop screen with the supplied prototype at the same viewport, theme, and data state. Restore the approved colors, typography, spacing, layout, card sizes, and controls while preserving working desktop data logic.”

### Verify persistence

“Test the installed app using a disposable profile: create records, close it, relaunch, export a backup, restore into a clean profile, then upgrade the app. Compare record IDs/counts and representative values. Fix failures before continuing.”

### Release gate

“Run docs/RELEASE_ACCEPTANCE.md against the real installed Windows build. Provide evidence, artifact paths, SHA-256 checksums, signing status, and any remaining blockers. Clearly distinguish implemented from tested.”

## 8. What completion means

You can install the app, use every approved workflow offline, restart Windows without losing records, migrate your browser backup, recover a full backup, update the application safely, and send a clean installer to a friend. The agent supplies source, reproducible commands, and honest test evidence. No promised feature is silently replaced with a static screen.

## 9. Documentation references

Recheck current official documentation when selecting dependency versions:

- https://developers.openai.com/codex/app/windows — Windows coding environment; may redirect to current ChatGPT/Codex documentation.
- https://www.electronjs.org/docs/latest/tutorial/security — Electron security model.
- https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging — packaging overview.
- https://www.electronjs.org/docs/latest/api/app — user-data location and application lifecycle.
- https://www.sqlite.org/backup.html — consistent database backup considerations.
- https://www.electron.build/ — optional electron-builder/Windows installer configuration.

No dependency versions or paid-service availability are guaranteed by this document; choose compatible versions during implementation and pin them in the project.


---

<!-- Included from docs/FEATURE_PARITY.md -->

# Feature parity and acceptance matrix

For each row, record implementation file, automated test, manual verification, and result in the implementation project. The current route implementation is the final active function after all source scripts have loaded.

| Route | Required behavior | Minimum verification |
|---|---|---|
| `home` | Mountain hero; actual daily capacity and questions; reviewed topics; settings-driven exam/readiness; next manual assessment; break and rhythm cards | Change settings and records; totals and labels update without fixed old values |
| `today` | Date selector; focused hours/goal; planned topics; progress; UWorld attempts/correct/reviewed; Anki completed/due/new; weak concepts; outcome; catch-up date; notes; assessment checkpoint | Save once and edit; one daily record per date; all connected views update after restart |
| `focus` | 25/45/60/custom sessions; default duration from settings; start/pause/reset; visible time; return to mission | Pause/minimize/sleep tests; no negative or duplicated sessions |
| `planner` | Read-only Date/System/Plan & targets/Hours/UWorld/Status table; Add lesson; Make edit; one colored pause-range row; search | Selected date loads correct fields; saving updates calendar; explicit override survives settings |
| `calendar` | Accurate month arrows/picker; day numbers; lesson summary; assessment and catch-up events; date pop-up; open mission/add/edit | Year rollover, leap day, empty date creation, protected break shading |
| `resources` | Read-only resource rows; topic/System/reference/status; view/edit pop-up; search and filters; study schedule and FA order; CSV/XLSX upload | Mission progress reflected; both orderings; import updates matching topic+system |
| `curriculum` | Legacy link resolves to same Resource Map experience | No duplicate navigation item or broken deep link |
| `uworld` | Existing attractive block form/history; System-wise requires system; Mixed clears system selection; manual blocks; edit; weighted accuracy/review totals; bank-size context | Reject impossible counts; distinguish separate blocks and daily mission records; no duplicate edits |
| `anki` | Same-tab selected-date entry; deck/due/completed/new/ceiling/minutes/notes; read-only review journal with edit action | Mission and Anki update same daily record; blank versus zero preserved |
| `weakness` | Horizontal rows like catch-up; concept/explanation/system/source/priority/review/status; Capture offers New/Edit; select existing; schedule repair | Duplicate concept handling; edit same record; repair appears on designated day |
| `catchup` | Clean horizontal schedule; add/edit pop-up; reschedule/status/estimate/priority/category/notes; open day | Same identity when moved; Done/Dropped leave active workload but retain history |
| `systems` | Equal-size system cards; reviewed/mastered/in-progress counts and progress bars; open system resources | Updates from mission/resource changes and newly imported topics |
| `assessments` | Manual assessment planning/edit/results; dates/form/status/score type/official score/probability/weakness/action/notes; right-side analytics | Blank results stay blank; Completed needs date taken; metrics labeled; calendar/mission checkpoint updates |
| `weekly` | Previous Monday–Sunday by default; move/select week; hours/targets/questions/Anki; seven-day rows; all saved daily/block records; achievements/assessments; weaknesses/catch-up; editable reflection | Correct date bounds; unlogged versus logged shortfall; no invented historical mastery |
| `analytics` | Live saved-record totals, recent days, prior-week summary and assessment context | Same shared records as other screens, correct weighted accuracy |
| `phases` | Minimal three-part Study roadmap; connected links; settings-driven window and protected break | No stale hard-coded dates or misleading mastery deadline |
| `milestones` | Uniform cards; Create milestone; edit gear; target/category/status/evidence/notes; achieved date | Achievement enters matching weekly review; status changes handled correctly |
| `settings` | Exam/start/window/QBank dates and readiness; weekday/Saturday/Sunday capacity; question target; future-default switch; Anki deck/ceiling; bank size; map order; focus; break; theme/density | All relevant pages update; history/explicit overrides preserved; validated fields |
| `guide` | Clear learning loop and How to use button; aligned cards/footers | Every guide link works |
| `howto` | Sentence-by-sentence methods covering every feature and storage behavior | Update browser-only instructions to accurate desktop instructions |
| `sources` | Uniform source/about cards, actual data provenance, connected-data explanation, backup, confirmed reset | Friend build removes private owner links; backup accurate; destructive reset requires confirmation |
| `profile` | Clickable sidebar workspace and header photo; name/motto/school/stage/location/goals/about; photo crop/upload/remove | Reload deep link; restart retains photo; friends start blank |

## Global requirements

- Back remains inside application navigation and works after direct deep links.
- Three top-right actions work: Today, Focus, Settings. Photo opens Profile.
- Forest and Soft contrast themes retain readable selects/options/selected/disabled states; high-contrast OS behavior remains accessible.
- Preserve comfortable/compact table spacing and card footer alignment.
- Pop-ups support labels, keyboard focus, Escape, and safe cancellation. No loss of unsaved input from incidental navigation without appropriate handling.
- All date-based views use the selected/configured timezone with stable date-only values.
- All imports preview before commit, validate all rows, avoid unintended partial writes, and use documented matching rules.
- Records have stable identities; read-only tables are not converted back to cluttered inline forms.
- Renderer errors, storage failures, and invalid data produce actionable messages.
- Runtime works offline with packaged fonts, source data, icons and artwork.

## Do not infer or fabricate

A reviewed topic is not automatically mastered. Volume is not readiness. Repeated UWorld attempts are not unique first-pass completion. A logged shortfall differs from an unlogged day. Future/rest/break days do not create automatic study debt. Official score and passing probability fields must be manually entered from real reports. Source formula/rollup URLs are unresolved metadata, never numerical measurements.


---

<!-- Included from docs/ARCHITECTURE_AND_MIGRATION.md -->

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


---

<!-- Included from docs/RELEASE_ACCEPTANCE.md -->

# Windows release acceptance checklist

The implementation agent must add evidence paths and actual results. All boxes start unchecked. Do not interpret inclusion of this file as verification.

## Environment and artifacts

- [ ] Windows release, CPU architecture, Node/Electron/SQLite/packager versions recorded.
- [ ] Source revision and dependency lockfile recorded.
- [ ] Installer produced on a supported Windows build environment (or documented CI), with exact path and SHA-256.
- [ ] Signing status reported honestly; credentials never embedded.
- [ ] Third-party notices, font licenses, release notes and user guide included.
- [ ] Installer contains no owner database, browser backup, photo, secrets or private source links.

## Visual and interaction parity

- [ ] All routes in FEATURE_PARITY.md work in the actual packaged app.
- [ ] Matched reference and desktop screenshots reviewed at 1440×900 and 1920×1080.
- [ ] 100%, 125%, and 150% Windows scaling tested; scrolling remains usable.
- [ ] Forest and Soft contrast themes tested; no white-on-white dropdowns.
- [ ] Keyboard navigation, labels, modal focus, Escape, and cancellation work.
- [ ] Equal-size system cards, aligned footers, clean horizontal tables and assessment sidebar preserved.
- [ ] Back, Today, Focus, Settings, sidebar profile and header photo work.
- [ ] Direct profile and other route reloads work.

## Linked record scenario

Using a disposable profile, save one mission with 3 hours, 20 questions, 15 correct, 18 reviewed, 80 Anki reviews, 100 due, 5 new cards, one weak concept and one unfinished task. Mark one assigned topic Reviewed.

- [ ] UWorld shows exactly those 20 daily questions once; weighted accuracy is 75%.
- [ ] Edit that mission to 24 questions/18 correct/22 reviewed; counts update rather than duplicate.
- [ ] Add a separate 10-question block with 8 correct and 10 reviewed; combined attempts are 34 and correct are 26, with accuracy based on 26/34.
- [ ] Anki journal and selected-day form show the same record; an Anki-only edit preserves mission hours/questions.
- [ ] Resource Map and System progress reflect the topic status.
- [ ] Weakness is captured once; edit existing updates the same ID.
- [ ] Catch-up appears only on its designated day; moving it retains ID; Done removes active workload.
- [ ] All values survive close/reopen and Windows restart.

## Plans, imports and settings

- [ ] Add and edit a lesson, including an unscheduled date; calendar and mission agree.
- [ ] Pause range appears as one table band and correct calendar shading; moving the pause restores underlying plans safely.
- [ ] CSV quoted commas/newlines/BOM tested; XLSX shared strings, multiple sheets and Excel dates tested.
- [ ] Import previews, matching, blank-cell preservation and date sorting verified.
- [ ] Invalid dates, oversized files, unsupported formats and duplicate rows fail cleanly without partial writes.
- [ ] Resource import adds and updates topics without duplicate system/topic pairs; both orderings work.
- [ ] Global future defaults update relevant plans; explicit imports/lesson edits, history, rest/assessment/pause rules are respected.
- [ ] Exam/readiness/window/deck/card ceiling/QBank size/focus/order/theme/density settings update relevant views.
- [ ] Timezone setting works; date-only records never shift; midnight rollover respects a historical date selection.

## Assessments, milestones and weekly review

- [ ] Manual assessment plan/add/edit/result works, including blank official values.
- [ ] Correct score ranges and metric labels; no calculated passing probability.
- [ ] Assessment changes appear in calendar and daily checkpoint.
- [ ] Create/edit milestone, mark Achieved with date, then change status; weekly output follows correctly.
- [ ] Weekly review defaults to the last complete Monday–Sunday and supports navigation.
- [ ] Seven-day plan/actual rows, separate block records, achievements, weaknesses, catch-up, assessments and saved reflections are correct.
- [ ] Unlogged days are labeled distinctly from logged shortfalls; rest and pauses do not create debt.
- [ ] Analytics use shared live records and do not invent historic mastery or unique questions.

## Migration, backup and recovery

- [ ] Import synthetic prototype backup; validate every migrated category.
- [ ] Import real owner backup only in a private owner profile after preview/authorization.
- [ ] Repeat import; no duplicates. Conflicts and present-empty versus missing categories handled explicitly.
- [ ] Export full backup; restore to a clean profile; compare IDs/counts/representative values and photo.
- [ ] Malformed/version-incompatible backups are rejected before destination changes.
- [ ] Pre-restore backup, automatic backup rotation, and interrupted restore recovery verified.
- [ ] Disk/storage errors show unsaved/error state, not false success.
- [ ] Schema migration tested from at least one previous desktop schema.

## Installed application

- [ ] Install and launch from Start menu under a standard user.
- [ ] Launch without source folder, Node or a development server.
- [ ] Disconnect internet; all normal screens, fonts, imports, saves and timer work.
- [ ] Single-instance and window-bound recovery tested, including monitor removal.
- [ ] Timer tested through minimize, sleep, pause/resume and reset.
- [ ] External approved links open in system browser, not privileged app windows.
- [ ] Upgrade retains all data and profile assets; userData identity remains stable.
- [ ] Uninstall behavior documented and tested using disposable data.
- [ ] Friend first run contains no owner activity or identity, and creates an independent local profile.

## Required final report

State: what was implemented; Windows and architecture tested; tests run and evidence; untested items; remaining defects; installer and source paths; checksums; signing status; installation, upgrade, migration, backup and restore instructions. If a required release test could not run, label the build a candidate and name the missing gate.


---

<!-- Included from docs/KNOWN_GAPS.md -->

# Actual baseline limitations and conversion work

The owner has approved the current visual experience. Preserve it while addressing these implementation gaps.

1. **No desktop application exists in this bundle.** Electron, SQLite, installer configuration, production dependencies and Windows binary still need implementation.
2. **Storage is browser-local.** The reference uses localStorage, not a production desktop database. User browser records are not available in this environment and are not included.
3. **Backup export exists; restore does not.** Implement validated desktop migration and full restore, not just a file-download button.
4. **Fonts currently require a remote Google Fonts CSS import.** Bundle licensed local fonts for offline fidelity. This handoff does not include downloaded font binaries.
5. **Source has global state and overriding functions.** Script order matters. Earlier code may describe outdated screens. Refactor without removing final behavior.
6. **Native dropdown fix is included.** It sets dark select color-scheme, opaque option backgrounds, selected/disabled colors and forced-colors behavior. Test this on actual Windows.
7. **No live visual QA or Windows installer test was performed for this handoff.** Render smoke checks and JS syntax checks are useful but not substitutes. No screenshots are bundled or claimed.
8. **Dates and timer need production treatment.** TODAY is initialized using Asia/Karachi at startup; the reference does not provide a complete configurable-timezone/midnight/sleep lifecycle. Implement and test it.
9. **Computed pause/default state needs normalization.** Source uses mutable base snapshots and overrides. Ensure reload or pause resizing never loses the underlying plan or captures a derived pause as permanent source data.
10. **Local IDs and some arrays lack a uniform domain schema.** Convert carefully with stable IDs; preserve legacy records, relations, and explicit overrides.
11. **Numeric validation is uneven.** Consistently validate actual hours, counts, score ranges, dates and finite values in main-process services as well as UI.
12. **Imports are prototype parsers.** Current XLSX parsing relies on ZIP/XML and browser DecompressionStream. Verify workbook compatibility or replace with a maintained bundled parser, keeping matching/preview rules. `.xls` is not currently supported.
13. **Some source values are unresolved Notion formula/rollup URLs.** Never parse them as performance numbers or fabricated results.
14. **Original source URLs and owner schedule are included in reference data.** Preserve exact reference for development, but ship a separate clean friend seed policy and remove private links from friend UI/resources.
15. **Some wording describes a design preview/browser storage.** Update storage/about/help copy to truthful desktop behavior, without disturbing layout.
16. **Historic mastery events do not exist.** Current status is not past-week completion evidence. Add future event logging if needed; do not invent a history.
17. **Code signing is not provided.** A certificate or signing service must be configured separately if chosen. Unsigned status must be reported, not disguised.
18. **Browser and Electron storage origins differ.** Migration requires the owner's exported JSON; a website URL alone cannot transfer data.

The exact source and manifest remain the reference. These notes identify conversion requirements rather than authorizing a visual redesign.


---

<!-- Included from docs/HANDOFF_VERIFICATION.md -->

# Handoff verification report

Verified 16 October 2026 in the source preparation environment.

- All six prototype files match the deployed source commit recorded in SOURCE_MANIFEST.json byte for byte.
- JavaScript syntax checks passed for app.js, dashboard.js, and import.js.
- The included stub-DOM smoke script initialized the scripts in the correct order and rendered all 22 current/legacy routes.
- The smoke script is deliberately limited: it does not test a browser layout, real input events, database persistence, Electron, Windows installation, or packaging.
- Synthetic CSV and JSON fixtures contain test records, not the owner's browser activity.
- No EXE, Electron implementation, installed fonts, dependency tree, personal browser backup, hosting credentials, or Git repository metadata is included.
- No screenshot captures or Windows release results are claimed.

The implementation agent must complete the release checklist in docs/RELEASE_ACCEPTANCE.md. This file reports handoff validation only.
