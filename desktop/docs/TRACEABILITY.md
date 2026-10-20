# Requirement traceability

The UI originates in the approved renderer. Superseded definitions were removed from the desktop copy only. `app.js` supplies shared forms/views; `dashboard.js` supplies final layouts; `desktop.js` supplies desktop-specific behavior. Build-time handler compilation preserves actions without inline scripts. The reference remains immutable.

| Requirement / route | Implementation | Evidence |
|---|---|---|
| Overview `home` | renderer/dashboard.js | All-route browser + Electron smoke; matched screenshots both themes/sizes |
| Today `today` | renderer/app.js + dashboard checkpoint wrapper | Linked mission → edited mission → additional block → Anki → reload test |
| Focus `focus` | app.js view, desktop.js timer | Pause/resume/reset/completion/reopen and clock-change tests; real Windows sleep pending |
| Daily plan `planner` | app.js lessons/pause, import.js mapping | Add/edit, pause move/restart, explicit override, CSV preview/blank preservation/duplicate rejection |
| Calendar `calendar` | app.js + dashboard.js | Lesson/calendar agreement, year rollover, leap day; matched screenshots |
| Resource Map `resources`, `curriculum` | app.js + dashboard.js | Upload, both orders, filter, reviewed status, all-route smoke; matched screenshots |
| UWorld `uworld` | app.js + shared logs | 20→24 daily attempts + 10 separate; 26/34 weighted correct; edits preserve IDs |
| Anki `anki` | app.js + shared daily log | Anki-only edit preserves hours/questions; reload retains values |
| Weakness `weakness` | app.js forms, dashboard.js rows | New/edit same ID, duplicate handling, repair scheduling; matched screenshots |
| Catch-up `catchup` | app.js | Move keeps ID, Done removes active work, retained history; matched screenshots |
| Systems `systems` | dashboard.js | Shared topic state, all-route smoke and equal-card screenshots |
| Assessments `assessments` | dashboard.js | Completed date and range validation; blank score remains blank; sidebar and screenshot |
| Weekly `weekly` | dashboard.js | Monday date normalization, dated milestone inclusion, saved reflection, shared logs; screenshots |
| Analytics `analytics` | dashboard.js | Shared aggregate rows, all-route smoke; no historical mastery inference |
| Roadmap `phases` | dashboard.js | All-route smoke, settings-based dates and connected links |
| Milestones `milestones` | dashboard.js | Achieved date validation and weekly inclusion; screenshots |
| Settings `settings` | dashboard.js + desktop.js | Defaults/pause/explicit edits, themes, timezone; main-process validation |
| Guide `guide`, help `howto` | dashboard.js + desktop help | All-route smoke; desktop storage instructions and linked destinations |
| Sources `sources` | desktop.js | Local provenance, backup/restore/reset confirmation; private link audit |
| Profile `profile` | dashboard.js + main photo dialog | Deep link/reload, edited name, 256×256 crop/reload/remove, SQLite image backup round trip |
| Back / header actions | dashboard.js, desktop navigation guards | Click Today/Focus/Back/Profile; reload/deep-link tests |
| Modal keyboard / cancel | app.js + desktop.js | Escape closes, focus restored; failed edits discard without persisting |
| SQLite / migrations | main/store.cjs, migrations/001–002.sql | File-backed store tests; schema-1 migration; actual Electron close/restart |
| Import preview / receipt | main/model.cjs + store.cjs | Every prototype category + extensions, deterministic block IDs, missing vs empty, repeat idempotency |
| Owner plan / source links | scripts/export-owner.cjs, assets/seed.json | Validated optional local export, retained source IDs; clean seed and package-content audits |
| Backups / recovery | main/store.cjs | Full round trip incl. image, seed, receipts/events; rotation; injected transaction failure rollback |
| CSV / XLSX | main/spreadsheets.cjs + renderer mappings | BOM/quoted newline, sheets/shared/inline strings/cached formula, epochs, corrupt/oversized archives |
| Renderer security | main/index.cjs, security.cjs, preload, compiler | Origin/frame checks, impossible-payload rejection, protocol restriction, injection-value test, CSP/zero inline handlers |
| Offline fonts / art | scripts/build.cjs, assets, renderer CSS/SVG | No renderer remote requests, local fonts, 48 matched screenshots; package launch via atlas protocol |
| Window bounds / one instance | main/index.cjs + security.cjs | Bounds unit checks; actual monitor removal and secondary-instance focus require Windows manual test |
| Installer / upgrade / uninstall | dist-win.cjs, windows-desktop.yml, test-installed.ps1 | Workflow prepared; Linux packaged smoke passed; Windows execution is unverified here |

Automated screenshots use a shared synthetic data state, identical viewport/timezone, and locally bundled font equivalents for both renderers. They cover main content of 12 representative routes, not every pop-up or Windows native control. The supported sizes are 1440×900 and 1920×1080. Windows 100%, 125%, 150% scaling remains a separate release gate.
