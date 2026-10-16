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
