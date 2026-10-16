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
