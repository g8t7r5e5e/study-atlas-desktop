# Study Atlas desktop implementation

Baseline: main b25d81f. All six immutable reference hashes and 22 reference routes passed on Linux x64, Node 24.19.0.

## Stages
1. Audit: read all handoff documents (combined instruction files duplicate the individual documents); inspect final overrides and data categories. Complete.
2. Shell: preserve source renderer and local fonts; compile inline handlers into registered closures, sandbox renderer, constrain IPC/navigation. Complete.
3. Storage: SQLite schema migrations, normalized stable record identities with compatible JSON extension fields, transactions, import receipts, profile assets, atomic restore and rotated backups. Complete.
4. Workflow: clean friend seed; optional explicit owner seed JSON import; all existing routes; defaults/pause, dates, timer and save errors. Complete.
5. Validation: domain/integration tests, browser interactions, Electron smoke, matched screenshots, security checks and packaging content audit. Complete on Linux; Windows gates remain.
6. Release: Windows NSIS per-user x64 workflow, native ARM64 packaging command, artifact checksum, guides and evidence. Implemented; Windows execution remains unverified.

## Decisions
- Keep prototype/ byte-for-byte. Implement in desktop/; no framework or hosted deployment.
- Use Electron's bundled Node SQLite API (no third-party native ABI module). Require Node 24 for development tests; verify Electron support at launch.
- Store user data outside installation files under stable per-user Study Atlas application-data directory. Database transactions are the primary store, never localStorage.
- Preserve unknown validated legacy fields in JSON columns. One daily record per date, independent block IDs; imports are previewed and transactional.
- Ship a generic undated curriculum, no owner schedule, URLs or identity. Owner source plan is an explicit local JSON export generated outside release contents.
- Release is unsigned absent supplied signing credentials. Linux tests cannot establish Windows installer, upgrade/uninstall, sleep or scaling acceptance.

See desktop/docs for schema, traceability, release evidence and user instructions as stages complete.

## Implementation evidence and decisions

- Secure Electron custom protocol and a minimal, validated preload now run all 22 routes. Inline action strings compile into lexical closures at build time; imported values cannot become handler source.
- SQLite schema 2, stable record IDs, one daily row per date, topic events, image bytes, source-ID migration, import receipts, consistent logical snapshots, pre-import backups and seven-copy daily rotation implemented and tested.
- Optional owner-plan export stays outside Git and package contents. Friend packages contain only a generic undated curriculum and empty personal state.
- Browser tests cover linked records, settings/pause, imports, assessments/milestones/reflections, profile crop, weak-concept repairs, timer, clock/midnight, failed saves and cancellation. Actual Electron tests cover preload/IPC and persistence across process restart.
- 48 matched synthetic main-content screenshots cover 12 routes, two sizes and both themes. Local symbol fallback preserves glyphs on machines without Windows' default symbol fonts. Only truthful mission storage wording differs in these comparisons.
- Packaging content audit and a local Linux unpacked build have passed. The Linux container requires a test-only no-sandbox launch flag; production/Windows settings retain isolation and sandboxing.
- Windows NSIS workflow uploads an unsigned installer + checksums only after build/tests. Real Windows installation, display scaling, physical sleep, ARM64 and previous-release upgrade cannot be claimed from this Linux session.
- No hosted Site changes or website deployment. Original reference hashes remain the final integrity gate.

## Final status

All implementation stages available on Linux are complete. Twenty unit/integration/security tests, fifteen browser/visual tests (48 screenshot comparisons), a final thirteen-scenario workflow rerun, and the actual packaged Electron save/restart smoke passed. A frozen reinstall succeeded. The final package passed the friend-safety audit. Source and release instructions are saved in Git checkpoints.

The Windows workflow and installer commands are implemented, with downloadable artifact upload and disposable installed-app checks. They have not run in this session. Remaining Windows/hardware/signing/real-owner-data gates are listed explicitly in desktop/docs/TEST_REPORT.md; no Windows release or certificate is claimed. No website was deployed.

Final release review fixed archive separator normalization for the Windows privacy audit and checks the uninstaller exit code. Native and simulated Windows archive-path audits pass. Reusable cloud `install_script` and `start_skill` were saved as an environment configuration draft; publication and fresh-task restoration have not been verified. Local commits have not been pushed. Estimated overall release work remaining: 10–15%, principally Windows execution and manual acceptance; this is a planning estimate, not a measured test percentage.

Subsequent delivery: pushed the implementation and workflow to `desktop/windows-installer`. The owner's Windows log confirms NSIS produced an installer but the subsequent audit failed because the earlier separator normalization broke ASAR's native directory traversal. Fixed lookup paths separately from privacy-rule paths and added regression tests using ASAR's actual traversal with both Windows and Unix path semantics. All 22 tests and the existing Linux package audit pass. The new Windows run must still validate and upload the candidate; API access remains unavailable to this session.
