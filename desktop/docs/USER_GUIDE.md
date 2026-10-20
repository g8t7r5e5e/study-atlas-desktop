# Study Atlas for Windows

## Install and first launch

Download the installer and SHA256SUMS.txt from the GitHub Actions **Windows desktop installer** run's **Study-Atlas-Windows-x64-candidate** artifact. Extract the artifact ZIP. Verify the installer in PowerShell:

```powershell
Get-FileHash .\Study-Atlas-1.0.0-x64-Setup.exe -Algorithm SHA256
```

Compare the hash with SHA256SUMS.txt. Run the installer, choose your per-user destination, then open Study Atlas from Start. Node, a browser server and internet access are unnecessary. This candidate is unsigned; do not disable Windows security controls. A native ARM64 installer requires an ARM64 build and separate verification.

Each Windows account uses its own `%APPDATA%\Study Atlas` directory. New workspaces contain an editable, undated generic curriculum and empty activity/profile records. Open Profile to enter your name and picture, and Settings to choose your study dates, timezone, hours, question targets and Anki deck. Add lessons or import your own CSV/XLSX schedule. The app includes its fonts, mountain artwork and all runtime assets locally.

## Daily workflow

Open Today, select the date, record hours/questions/Anki, update topic progress, and save. Edit the same record to correct it. UWorld includes those daily questions already; log only additional work as a separate block. Anki shares the daily record and preserves the day's other fields. Correct/reviewed counts cannot exceed attempts. Empty official scores remain empty. Coverage, mastery, repeated attempts and readiness are separate concepts.

Daily plan and Calendar share lessons. Add/edit in pop-ups; protected breaks hide routine targets without destroying the underlying plan. Editing a paused lesson shows its underlying values. Global future defaults preserve explicit per-day edits/imports and historical/rest/assessment days. Resource imports match trimmed, case-insensitive Topic + System; daily imports match Date. Blank spreadsheet cells preserve existing fields. Use a lesson/resource editor to explicitly clear a value.

Weaknesses keep one record per concept. Schedule a repair into Catch-up, move its date, or mark it Done/Dropped while retaining history. Assessments and milestones require actual completion dates for completed/achieved records. Weekly review runs Monday–Sunday and defaults to the last complete week. It distinguishes unlogged days from logged shortfalls and never invents past mastery.

## Focus and dates

Timezone defaults to Asia/Karachi and accepts IANA names in Settings (for example Europe/London). Date-only records retain the date you entered. Midnight follows today when you were viewing today; it leaves a selected historical date alone.

Focus uses an absolute deadline. Minimize and sleep count toward elapsed time; pause does not. A detected awake system-clock jump pauses the session. A clock adjustment made during sleep is indistinguishable from sleep duration and follows the wall-clock deadline. After closing/reopening, elapsed time is reflected but the session stays paused until you choose Start. A completed session stays at zero until Reset. Timer sessions are not automatically counted as logged study hours.

## Backups, migration and recovery

Settings → Download backup exports a complete JSON backup: seed provenance, all record categories, stable IDs, settings, image bytes, topic history and import receipts. Keep copies on another drive. Backups contain private personal records and are not encrypted. Share only the installer, checksum and guides with friends.

Settings → Import / restore backup opens a native file picker and shows a preview. Supported inputs:

- The prototype's Settings export `{version:1, exportedAt, demo}`.
- A validated localStorage export `{demo, ui}`.
- A complete desktop backup.
- An explicitly generated private owner-plan JSON.

Read the counts and replacement policy, then confirm. A complete pre-import safety backup is written before the transaction. The receipt reports incoming added/updated identities and unresolved base references. Existing destination records absent from an imported backup are removed under the stated replacement policy. The same import is skipped while the workspace is unchanged; after later edits you may deliberately restore it again, still without duplicates. A cancelled/invalid import changes nothing.

A browser backup usually contains edits, not the original base schedule. If the preview reports unresolved source references, import the private owner plan as well. From the private source checkout, the owner can run:

```powershell
cd desktop
npm run export:owner-plan -- C:\Users\YourName\Documents\StudyAtlas-owner-plan.json
```

Choose an absolute path outside the repository; the script refuses to overwrite a file. Import that file on the owner's PC, then the browser backup. The owner-plan import changes the base plan while retaining activity and explicit edits. It is never included in the installer. Real browser records cannot be recovered unless you supply their backup. Keep the original browser backup until you have verified counts, dates, notes, topic changes, assessments and profile.

Seven daily automatic snapshots rotate in `%APPDATA%\Study Atlas\backups`. Pre-import and pre-reset snapshots are retained. Open backup folder in Settings shows the location. To undo an import, restore its pre-import JSON. Restore is transactional and includes SQLite WAL recovery; never copy only an open `atlas.sqlite` file to make a backup. Images also live under `assets`, with transactional copies in the database. Operational logs under `logs` record event/error codes, not study text.

If the status says **Not saved**, keep the form open, address the error and save again. A backup-copy warning means records committed but the secondary backup needs attention. For a database startup failure, preserve the entire user-data folder; move it aside while the app is closed and launch a clean workspace to import a known-good JSON backup. Do not delete the only copy of your data.

## Update and uninstall

Export a backup, close the app, then run the newer installer. The stable user-data directory stays separate from installed files; schema migrations run transactionally. Do not downgrade after opening a newer schema. Uninstall leaves personal data by default. To intentionally delete it, close/uninstall the app and remove `%APPDATA%\Study Atlas` only after keeping any backups you need.

## Limits

CSV/XLSX only; legacy XLS is unsupported. Spreadsheet input is limited to 10 MB, 40 MB expanded XLSX, 50 sheets, 256 columns and 2,000 data rows (1,500 days for schedules). Backup imports are limited to 20 MB; photos to 5 MB before centered 256×256 cropping. Spreadsheet formula cached values may be read, but formulas/macros/scripts are never executed. No online accounts, synchronization, medical predictions or hosted website deployment are included.
