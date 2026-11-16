# First Aid and feasibility checkpoint — 17 November 2026

Implemented desktop/data_foundation/feasibility.py with firstaid_tasks(db, topic_ids, deadline=..., progress=..., pace_multiplier=...) and check(tasks, windows).

The adapter reads only the active workbook catalog, deduplicates selected IDs, preserves topic identity and source estimate, supports explicit completed fractions and a pace multiplier, and charges each topic once. Remaining estimates round upward to whole minutes. Completed fractions represent user-reported work fraction, not inferred mastery. Unknown IDs and invalid progress are rejected. Source sequence establishes selected-topic order only where page spans permit a whole-topic dependency. Overlapping or noncontiguous pages are flagged for explicit workload allocation; no page durations are invented.

Checks validate ISO dates, net free local-day minute windows, overlap, task identities, numeric minutes, dependency references/cycles, propagated prerequisite deadlines, task-specific capacity, continuous-window fit, cumulative release/deadline interval demand and optimistic earliest-finish prerequisite paths. Completed prerequisites do not create remaining workload. Windows must exclude commitments and buffers already; do not subtract them again. Split cross-midnight windows by date. This module does not handle timezone conversion itself.

Passing necessary checks is not proof of a feasible schedule. Independent task competition, locks, assignment validation, automated repair and allocation remain to implement. Contradictions have machine-readable issue kinds. No accepted plan is generated or applied. No UI or installed app changed.

57 tests pass, including nine feasibility/adapter tests. Read-only integration against all 1,405 real First Aid topics preserved all IDs and produced 25,147 source-estimated minutes (about 419.1 hours) at baseline pace, with seven page-allocation flags. This is reading workload from the supplied estimates only, not total USMLE preparation time. Synthetic capacity preview saved locally as outputs/First-Aid-Feasibility-Check.json; it is not owner availability.

Next: resolve the seven page-allocation flags with explicit duration assumptions/evidence; persist calibration and selected progress; add locked-task constraints; build the deterministic allocator and independent assignment validator before calendar integration. Continue the broader Claude handoff roadmap.
