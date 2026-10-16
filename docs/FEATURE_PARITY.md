# Feature parity and acceptance matrix

For each row, record implementation file, automated test, manual verification, and result in the implementation project. The current route implementation is the final active function after all source scripts have loaded.

| Route | Required behavior | Minimum verification |
|---|---|---|
| `home` | Mountain hero; actual daily capacity and questions; reviewed topics; settings-driven exam/readiness; next manual assessment; break and rhythm cards | Change settings and records; totals and labels update without fixed old values |
| `today` | Date selector; focused hours/goal; planned topics; progress; UWorld attempts/correct/reviewed; Anki completed/due/new; weak concepts; outcome; catch-up date; notes; assessment checkpoint | Save once and edit; one daily record per date; all connected views update after restart |
| `focus` | 25/45/60/custom sessions; default duration from settings; start/pause/reset; visible time; return to mission | Pause/minimize/sleep tests; no negative or duplicated sessions |
| `planner` | Read-only Date/System/Plan & targets/Hours/UWorld/Status table; Add lesson; Make edit; one colored pause-range row; search | Selected date loads correct fields; saving updates calendar; explicit override survives settings |
| `calendar` | Accurate month arrows/picker; day numbers; lesson summary; assessment and catch-up events; date pop-up; open mission/add/edit | Year rollover, leap day, empty date creation, protected break shading |
| `resources` | Read-only resource rows; topic/System/reference/status; view/edit pop-up; search and filters; study schedule and FA order; CSV/XLSX upload | Mission progress reflected; both orderings; import updates matching topic+system |
| `curriculum` | Legacy link resolves to same Resource Map experience | No duplicate navigation item or broken deep link |
| `uworld` | Existing attractive block form/history; System-wise requires system; Mixed clears system selection; manual blocks; edit; weighted accuracy/review totals; bank-size context | Reject impossible counts; distinguish separate blocks and daily mission records; no duplicate edits |
| `anki` | Same-tab selected-date entry; deck/due/completed/new/ceiling/minutes/notes; read-only review journal with edit action | Mission and Anki update same daily record; blank versus zero preserved |
| `weakness` | Horizontal rows like catch-up; concept/explanation/system/source/priority/review/status; Capture offers New/Edit; select existing; schedule repair | Duplicate concept handling; edit same record; repair appears on designated day |
| `catchup` | Clean horizontal schedule; add/edit pop-up; reschedule/status/estimate/priority/category/notes; open day | Same identity when moved; Done/Dropped leave active workload but retain history |
| `systems` | Equal-size system cards; reviewed/mastered/in-progress counts and progress bars; open system resources | Updates from mission/resource changes and newly imported topics |
| `assessments` | Manual assessment planning/edit/results; dates/form/status/score type/official score/probability/weakness/action/notes; right-side analytics | Blank results stay blank; Completed needs date taken; metrics labeled; calendar/mission checkpoint updates |
| `weekly` | Previous Monday–Sunday by default; move/select week; hours/targets/questions/Anki; seven-day rows; all saved daily/block records; achievements/assessments; weaknesses/catch-up; editable reflection | Correct date bounds; unlogged versus logged shortfall; no invented historical mastery |
| `analytics` | Live saved-record totals, recent days, prior-week summary and assessment context | Same shared records as other screens, correct weighted accuracy |
| `phases` | Minimal three-part Study roadmap; connected links; settings-driven window and protected break | No stale hard-coded dates or misleading mastery deadline |
| `milestones` | Uniform cards; Create milestone; edit gear; target/category/status/evidence/notes; achieved date | Achievement enters matching weekly review; status changes handled correctly |
| `settings` | Exam/start/window/QBank dates and readiness; weekday/Saturday/Sunday capacity; question target; future-default switch; Anki deck/ceiling; bank size; map order; focus; break; theme/density | All relevant pages update; history/explicit overrides preserved; validated fields |
| `guide` | Clear learning loop and How to use button; aligned cards/footers | Every guide link works |
| `howto` | Sentence-by-sentence methods covering every feature and storage behavior | Update browser-only instructions to accurate desktop instructions |
| `sources` | Uniform source/about cards, actual data provenance, connected-data explanation, backup, confirmed reset | Friend build removes private owner links; backup accurate; destructive reset requires confirmation |
| `profile` | Clickable sidebar workspace and header photo; name/motto/school/stage/location/goals/about; photo crop/upload/remove | Reload deep link; restart retains photo; friends start blank |

## Global requirements

- Back remains inside application navigation and works after direct deep links.
- Three top-right actions work: Today, Focus, Settings. Photo opens Profile.
- Forest and Soft contrast themes retain readable selects/options/selected/disabled states; high-contrast OS behavior remains accessible.
- Preserve comfortable/compact table spacing and card footer alignment.
- Pop-ups support labels, keyboard focus, Escape, and safe cancellation. No loss of unsaved input from incidental navigation without appropriate handling.
- All date-based views use the selected/configured timezone with stable date-only values.
- All imports preview before commit, validate all rows, avoid unintended partial writes, and use documented matching rules.
- Records have stable identities; read-only tables are not converted back to cluttered inline forms.
- Renderer errors, storage failures, and invalid data produce actionable messages.
- Runtime works offline with packaged fonts, source data, icons and artwork.

## Do not infer or fabricate

A reviewed topic is not automatically mastered. Volume is not readiness. Repeated UWorld attempts are not unique first-pass completion. A logged shortfall differs from an unlogged day. Future/rest/break days do not create automatic study debt. Official score and passing probability fields must be manually entered from real reports. Source formula/rollup URLs are unresolved metadata, never numerical measurements.
