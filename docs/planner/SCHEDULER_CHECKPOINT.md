# Schedule generator checkpoint — 17 November 2026

## Implemented

`desktop/data_foundation/scheduler.py` implements a deterministic draft allocator, independent assignment validator and replanning change preview. `desktop/data_foundation/planner.py` provides a versioned JSON interface and command-line entry point. It supports explicit tasks or a First Aid selection loaded from the existing workbook database in read-only mode.

The allocator uses net local-day free windows, positive integer remaining minutes, release dates, deadlines, explicit prerequisites, priority, stable tie-breaking and approved splitting. It reserves locked assignments and propagates their starting-time bounds to ancestors. Existing usable assignments are soft-reserved before displaced work competes for those slots. When that preservation attempt leaves work out, a second deadline-based pass is tried; the pass with less unplaced workload is retained. This is a deterministic heuristic, not a global optimizer or proof of minimum schedule movement.

Locks are full remaining-task locks, including all segments for a split task. Partial locking is deliberately unsupported and rejected through the duration checks. Previous locks are inherited automatically; omitting the new locks field cannot silently unlock work. If a locked time is no longer available, the draft reports a conflict. Explicit unlocking with a reviewed preview remains a future feature. Once the caller explicitly marks a task completed, its previous planned intervals move to completed history, without consuming future capacity. Planned history is not measured actual study time. Completed history cannot be reopened silently.

Every generated assignment set is checked by a separate validator: identity, exact total duration, free-window containment, overlap, release/deadline dates, dependencies, approved splitting, unresolved page allocation and locks. Passing allocation plus complete validation establishes feasibility for the modeled inputs only. No real-world completion or exam readiness is implied.

Plan output includes `plan_id`, `input_fingerprint`, `parent_plan_id`, `algorithm_version`, assignments, locked assignments, retained history, unplaced work, validation results and per-task before/after changes with reasons. IDs are content-derived and drafts are always `accepted:false`. Repeating identical inputs produces identical output. Input array order does not change the result. Old plans are not modified.

Feasibility graph ordering is now iterative rather than recursive so full-curriculum dependency chains do not exceed the Python recursion limit.

## Status and limitations

- `complete_draft`: every remaining task has a validated modeled assignment.
- `partial_draft`: the heuristic left work unplaced, but its retained assignments validate. This is not proof that a complete schedule is impossible.
- `blocked_constraints`: necessary bounds or locked-assignment checks found a conflict; no usable assignment proposal is generated.
- `needs_page_allocation`: unresolved page workloads prevent generation; no duration is invented.
- `validator_rejected`: a generated partial proposal fails the independent validator and must not be applied.

Dates are local date labels and windows are integer minutes within one day. The caller supplies windows already net of commitments/buffers and, for replanning, only the still-available future time. Overnight windows must be split into local dates. Timezone/DST conversion from calendar instants belongs in the later desktop service. No background clock or implicit date cutoff is used here.

The seven First Aid page-allocation flags remain unresolved. Do not clear those flags merely to obtain a schedule. The prototype and installed app have not changed. No accepted-plan database persistence, calibration persistence, UI, external AI import, AnkiWeb or MedMaster integration is delivered by this checkpoint. The standalone JSON format is an internal planner request, not yet the promised external-AI schema or desktop backup format.

## Local usage

From the combined project's `desktop` directory:

```powershell
python -m data_foundation.planner request.json --out draft-plan.json
```

For a First Aid selection:

```powershell
python -m data_foundation.planner request.json --firstaid-db "C:\path\study-atlas-data.sqlite" --out draft-plan.json
```

The request uses `schema_version: "study-atlas-planning-request/v1"`, `windows`, and exactly one of `tasks` or `firstaid_selection`. Selection fields are `topic_ids`, `deadline`, optional `progress` (fractions of estimated work completed) and `pace_multiplier`. Optional `locks` and `previous_plan` enable locked work and replanning. Explicit task fields match `feasibility.py`. The command refuses to overwrite an existing output file. It writes a new draft snapshot only, never applies a plan to the app.

## Evidence

79 Python tests pass on Windows, including 22 scheduler tests. Coverage includes deterministic ordering, deadline/prerequisite enforcement, continuous sessions and approved splits, lock conflicts/inheritance, completion history, preservation after disruption, fallback allocation, validator tampering, genuine greedy counterexamples, 60 seeded randomized cases and a reversed 1,405-task dependency chain with a locked final task.

Local demonstration: `C:\Users\GC\Documents\Codex\2026-11-17\we\outputs\Schedule-Generator-Demo`. Twelve current cardiovascular topics total 211 workbook-estimated reading minutes. Initial and revised drafts validated; the fixture marked one task completed, removed one day and preserved a locked session. Five remaining tasks changed. Availability/progress are synthetic, not the owner's actual calendar or activity. The request, initial draft, replanning request, revised draft and summary are saved. Proprietary source data stays local.

## Next work

Resolve the seven page-allocation cases through explicit reviewed time allocations; persist calibration and selected progress; implement accepted-plan version storage and a preview/apply service; then build six-step onboarding and connect the allocator to the existing desktop calendar and tasks. Reconcile the feature branch with main before app integration, preserving main's Electron code. Keep the detailed Claude Cowork handoff current.
