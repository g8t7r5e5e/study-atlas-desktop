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
