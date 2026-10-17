# Study Atlas desktop

Offline Electron + SQLite implementation of the immutable reference in `../prototype/`.

Use Node 24.19.0 or a compatible Node 24 release. All dependencies are pinned in package-lock.json. Electron 44.8.0 supplies Node 24.22.0 and built-in SQLite; no third-party native SQLite rebuild is needed.

```powershell
cd desktop
npm ci
npm run dev
npm test
npm run test:reference
npm run test:e2e
npm run test:electron
npm run dist:win
```

Before the first browser test: `npx playwright install chromium`. `npm ci` installs Electron using its checksum-verifying installer. On a managed proxy, Node may require `NODE_USE_ENV_PROXY=1`; keep TLS verification enabled. Use a writable npm/Electron cache on restricted cloud machines.

`dist:win` requires Windows and detects the native architecture (`x64` or `arm64`). To explicitly cross-package from Windows: `npm run dist:win -- --arch arm64`; that does not verify ARM64 execution. NSIS outputs `release/Study-Atlas-1.0.0-<arch>-Setup.exe` plus `release/SHA256SUMS.txt`. Automatic publishing is disabled. The Windows workflow at `../.github/workflows/windows-desktop.yml` builds and uploads a downloadable x64 candidate artifact after checks pass.

`npm run dist:dir` packages the current platform into `release/` for local verification. `npm run audit:release` checks renderer and available app.asar contents for private source links and user data. `npm run test:smoke` combines immutable-reference checks, build and Electron smoke. `npm run export:owner-plan -- <absolute-private-json-path>` creates an optional owner-only plan outside this repository.

The browser test harness is test-only and excluded from packages. It uses real SQLite with a synthetic dialog adapter. Electron smoke uses the actual preload, IPC, custom protocol and renderer, checks all 22 routes, saves linked records, closes/restarts and verifies persistence. Packaged tests set `STUDY_ATLAS_EXECUTABLE` to the executable. All automated profiles are disposable; retained profiles are allowed only for explicit CI upgrade tests.

On this restricted Linux container the system Chromium is selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium`. Electron smoke uses a virtual display and `STUDY_ATLAS_LINUX_TEST_NO_SANDBOX=1` because the host has neither a usable setuid helper nor unprivileged Chromium user namespaces. This is a Linux test exception, not a production launch flag; Windows CI uses the normal sandbox. Never add it to `dev` or release shortcuts.

See [user and migration guide](docs/USER_GUIDE.md), [architecture](docs/ARCHITECTURE.md), [test evidence](docs/TEST_REPORT.md), [traceability](docs/TRACEABILITY.md), [release notes](docs/RELEASE_NOTES.md), and [third-party notices](docs/THIRD_PARTY_NOTICES.md).
