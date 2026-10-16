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
