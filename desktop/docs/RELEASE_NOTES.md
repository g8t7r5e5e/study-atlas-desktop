# Study Atlas 1.0.0 — release candidate

The approved forest UI now runs from bundled Electron resources with local SQLite persistence. The 22 current/legacy routes retain their workflows. Added transactional saves, stable identities, migration preview/receipts, complete restore, daily rotating backups, photo assets, explicit save failures, configurable timezone, persisted focus state, native file dialogs, single-instance behavior and window recovery.

The installer uses a generic undated curriculum and empty activity/profile data. Owner source plans require an explicit private import and are excluded from packages. The original prototype remains unchanged.

Functional fixes include preserving base lessons through pause/default changes and restarts; reliable profile deep links; strict daily/block and numeric validation; real Excel 1900/1904 date handling; recoverable repeated restores after subsequent edits; CSP-compatible event closures; bundled symbol fallback; and truthful desktop storage instructions.

This candidate is unsigned. Linux browser/Electron and data-layer evidence is recorded in TEST_REPORT.md. Windows CI builds a per-user NSIS installer, checks packaged launch/persistence, and performs disposable install/reinstall/uninstall checks. No Windows execution is claimed until that workflow succeeds. A prior released-version upgrade, native ARM64, real sleep/resume, multi-monitor recovery and 100%/125%/150% display scaling still require the manual release checklist.
