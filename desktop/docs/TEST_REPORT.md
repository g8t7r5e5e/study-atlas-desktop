# Release-candidate test report

Recorded 17 October 2026. Implementation checkpoint: `a3c1c2f`, based on latest main at task start `b25d81f`. The protected prototype is unchanged and still matches SOURCE_MANIFEST.json.

Final release review also normalized Windows archive separators in the package audit and checked the uninstall process exit code. The package audit passed again with both native and simulated Windows path separators. These script checks do not establish Windows execution.

After publication to `desktop/windows-installer`, the owner reported a failed Windows Actions run. The session cannot read its logs because GitHub API access is denied. A separate checkout reproduction found that `core.autocrlf=true` changes all six approved reference hashes. Repository attributes now preserve `prototype/**` bytes; the same checkout reproduction passes all six hashes after the fix. This establishes and fixes a Windows checkout defect, but the original failure's exact cause and the subsequent Windows run still require log evidence.

## Verified in this cloud environment

Host: Linux x64, Debian 13. Development Node 24.19.0/npm 11.9.0. Electron 44.8.0 bundles Node 24.22.0 with SQLite. Packager: electron-builder 26.15.3. Browser automation: Playwright 1.64.1 with the host Chromium. Dependencies are pinned and a fresh `npm ci` completed with artifact checksum and TLS verification intact.

| Check | Actual outcome |
|---|---|
| `node scripts/verify-reference.cjs` (repository root) | All six hashes pass |
| `node scripts/smoke-reference.cjs` (repository root) | All 22 baseline routes render |
| `npm test` | 20 passed, 0 failed/skipped |
| `npm run test:e2e` | 15 passed, 0 failed/skipped: 13 interaction/edge-case scenarios plus 2 visual batches |
| Final targeted workflow rerun | All 13 scenarios passed after final recovery/date refinements |
| `npm run test:electron` | Actual Electron app: 22 routes, no inline handlers, Node unavailable to renderer, IPC validation, save and process restart pass |
| Packaged executable smoke | Same checks pass against `release/linux-unpacked/study-atlas-desktop`; zero renderer errors |
| `npm run audit:release` | 173 files / one app.asar audited; no owner plan, private source links, user records, backup/DB/photo files |
| `npm audit --omit=dev` | 0 runtime vulnerabilities |
| Workflow configuration | YAML parses; Windows runner and read-only repository permissions checked |
| `npm run dist:win` on Linux | Explicitly refuses unsupported local packaging and directs to the Windows workflow; no Windows EXE was produced here |

Electron's actual web preferences are `contextIsolation:true`, `nodeIntegration:false`, `sandbox:true`. The container disallows Chromium's Linux OS sandbox, so Linux Electron tests use a dedicated test-only `--no-sandbox` option. This exception is absent from production launch commands and Windows CI. Thus these results do not verify the OS sandbox on Windows.

Evidence summaries are committed in [evidence/](evidence/). Raw local screenshots are under `desktop/test-evidence/visual/`; browser reports under `desktop/test-report/`. These generated directories are ignored by Git and are uploaded by CI. The browser harness uses real SQLite but replaces native dialog selection with synthetic fixtures; the Electron smoke uses the real preload, IPC and custom local protocol. Neither is an installed-Windows test.

## Visual comparison

48 matched comparisons cover Overview, Today, Daily plan, Calendar, Resources, Systems, Assessments, Weakness, Catch-up, Weekly review, Focus and Milestones at 1440×900 and 1920×1080 in Forest and Soft contrast themes. Both renderers use the same synthetic data, timezone and bundled font equivalents. Main-content screenshots preserve mountain artwork, typography, spacing, tables, equal-height cards and assessment sidebar.

All selected routes except Today matched within the pixel tolerance with no changed pixels over the chosen color threshold. Today's truthful local-storage wording accounts for approximately 0.063% changed pixels at most. Native Windows controls, every pop-up, all display scaling factors and physical monitor configurations are not established by these comparisons. Reference and desktop screenshots were also visually inspected.

## Coverage highlights

- Mission 20 questions → edit to 24 → separate 10-question block yields 34 attempts and 26 correct; Anki-only edits preserve hours/questions and identities. Missing correct counts display unknown accuracy.
- Every prototype backup category plus unknown legacy extensions survives migration. Reimports are idempotent while unchanged; restoring again after subsequent edits replaces without duplicates. Missing and explicitly empty categories differ. Source logs are included only when explicitly logged and not superseded.
- Complete backup round trips retain seed, IDs, profile photo, settings, receipts and topic events. Tests inject a failure inside a restore transaction and verify the previous workspace remains intact. Seven automatic backup rotation and pre-import backups pass. Physical power-loss testing is unrun; recovery relies on SQLite WAL/transactions and atomic JSON replacement.
- Schema 1 → 2 migration, invalid dates/counts/enums/IDs, stale revisions, dangerous JSON keys, corrupt/oversized files, and main-process rejection of invalid renderer payloads pass.
- CSV BOM/quotes/newlines; XLSX shared/inline strings, multiple worksheets, 1900/1904 date systems, cached formula values and expansion limits pass. No imported scripts, macros or formulas execute.
- Pause changes/restarts restore base lessons and preserve explicit overrides. Profile crop/reload/remove, backup receipt UI, failed save/retry/discard, weak-concept repair identity, catch-up completion/history, assessments, milestones, reflections, year/leap-day boundaries and timezone midnight behavior pass.
- Focus pause/resume/reset/reopen, zero-time completion, settings persistence and simulated clock changes pass. Real physical sleep/resume is unverified.

## Dependency review

The complete development dependency audit reports eight moderate entries, all propagated from the `sprintf-js <=1.1.3` unbounded-precision denial-of-service advisory in electron-builder's logging/download dependency chain (GHSA-hp3w-g68c-fv3c). There are no high/critical findings and no production dependency findings. The registry's latest sprintf-js was still 1.1.3 during review. These tools consume trusted build configuration and are excluded from app.asar. The findings are recorded, not hidden by disabling auditing or changing integrity checks. Recheck when upgrading the packager.

## Windows release gate — unverified here

No Windows version or architecture has been executed in this session. No installer checksum or Authenticode signature is claimed. The candidate is configured unsigned.

The **Windows desktop installer** workflow in `.github/workflows/windows-desktop.yml` is committed but has not been run or pushed by this session. After these commits reach GitHub, run it from Actions (or let a push to main trigger it). It is configured to:

1. Test reference integrity, unit/integration behavior, browser workflows/visuals and Electron on Windows Server 2022 x64.
2. Build `desktop/release/Study-Atlas-1.0.0-x64-Setup.exe`, audit app.asar and generate `desktop/release/SHA256SUMS.txt`.
3. Test the packaged EXE, install into a disposable runner, verify populated-profile persistence after reinstall, then check uninstall preserves the actual per-user data directory.
4. Upload **Study-Atlas-Windows-x64-candidate** (installer/checksums/guides) and separate test evidence. A failed gate does not claim a successful release.

The CI reinstall test uses the same candidate version. It is not proof of upgrade from a prior released build. The following remain manual or require additional Windows hardware/builds:

- Standard-user Start menu install/launch without development tools or network.
- 100%, 125% and 150% display scaling, native dropdowns, high-contrast OS mode and all modal keyboard/cancellation flows.
- Physical sleep/resume, clock changes during sleep, single-instance foregrounding and removed-monitor recovery.
- Upgrade from a previous released application, preserving real schema/assets; native ARM64 install/run.
- Owner's private real-backup migration and count verification (no personal browser backup was supplied).
- Code signing, if desired, using an owner-provided certificate/service.

See the original `docs/RELEASE_ACCEPTANCE.md` for the full installed-app checklist. The source/workflow is delivered as a release candidate, not a verified Windows release.

## Artifact paths

Actual Linux validation build: `desktop/release/linux-unpacked/study-atlas-desktop` and `resources/app.asar`; SHA-256 values are in `docs/evidence/linux-package.json`. These are Linux artifacts, not Windows installers. Generated builds are excluded from Git.

Expected Windows artifacts after a successful workflow: `desktop/release/Study-Atlas-1.0.0-x64-Setup.exe` and `desktop/release/SHA256SUMS.txt`, downloadable from that run's candidate artifact. Installation, migration, upgrade and recovery instructions are in [USER_GUIDE.md](USER_GUIDE.md).
