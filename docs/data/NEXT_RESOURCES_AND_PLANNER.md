# Next resources and planner research

This is the saved roadmap requested by the user, not completed research or a
claim that every scheduling algorithm has been evaluated.

## When another resource arrives

1. Preserve the original privately and identify its provider, product, edition,
   stable item identifiers, format, ownership and redistribution status.
2. Profile actual rows and missing values. Prefer title/module/duration metadata
   over lesson content. The generic CSV/JSON/XLSX `videos --resource sketchy`
   adapter already accepts Sketchy metadata when stable IDs are supplied.
3. Add a dedicated adapter for a new PDF layout; do not reuse First Aid geometry
   or infer resource identities from similarly named lessons.
4. Import a versioned catalog; retain progress and old snapshots. Generate exact
   and fuzzy title candidates against the shared source-topic labels and review
   ambiguous, unmatched and conflicting relationships.
5. Import directly supported QID/tag crosswalk evidence where available. Preserve
   product scope, confidence, source/version and validation state. Co-tag or title
   overlap is not equivalence. Regenerate coverage after each source.
6. Extend topic/subtopic browsing and the selection DTO to the new resource.
   A student's selected resources, not all overlapping resources, determine work.

Current command contract (from desktop/):

```sh
python -m data_foundation --db private-data/verified.sqlite videos '/path/sketchy.csv' --resource sketchy --columns '/path/columns.json'
python -m data_foundation --db private-data/verified.sqlite map
python -m data_foundation --db private-data/verified.sqlite report --out private-data/coverage.json
```

Expected video keys: source_key, title, module, section, duration_seconds or
duration_minutes. No Sketchy rows are included until a real source is supplied.

## Subsequent algorithm comparison

Research the principal relevant families using original papers, official
documentation, reproducible implementations and license checks. Record evidence,
assumptions and counterexamples rather than claiming an exhaustive survey of all
known algorithms. Candidate families to evaluate:

- Capacity-based deterministic scheduling, deadline ordering, priority queues and
  prerequisite-aware topological ordering.
- Resource-constrained project scheduling, bin-packing heuristics, constraint
  programming/CP-SAT and mixed-integer optimization.
- Spaced-repetition scheduling and review-load forecasts, including SM-2/FSRS;
  distinguish card due-state models from whole-curriculum calendar allocation.
- Adaptive workload estimation from planned versus actual time; uncertainty and
  contingency allocation; disruption-minimizing replanning with locked tasks.

Compare feasibility, explainability, determinism, complexity, licensing, missing
metadata handling and ability to preserve completed/locked work. First implement
a small deterministic baseline and validate it before selecting heavier solvers.

## Eventual student workflow

Questionnaire → remaining-work estimate → capacity/feasibility preview → student
approval → versioned plan → calendar/tasks throughout the existing application.
Collect exam/start dates, hours by weekday, days off, commitments, resources,
existing progress, study pace and preferences. Integrate 3/6/12 calendar-month
templates, assessments, review and buffers. Missing durations need calibration;
infeasible plans must explain alternatives. External-AI JSON plans need strict
validation, real IDs, preview and approval; no paid AI API is required.

No calendar activation, automatic rescheduling, UI or Windows release is
implemented by this checkpoint. Preserve the approved prototype and integrate
through the future Electron SQLite service and narrow preload bridge.

## Immediate next iteration after compact-unit review

1. Review the 334-unit curriculum and fill missing First Aid pointers with real
   evidence. Review candidate QID links and import authorized Anki crosswalks;
   expose shortages instead of guaranteeing a daily quota. New resources attach
   to stable units through versioned evidence, not new duplicate daily topics.
2. Compare the algorithm families above against small reproducible scheduling
   scenarios. Choose a deterministic baseline using actual resource workload,
   available minutes, prerequisites, buffers and locked/completed work.
3. Implement workload = adjusted video time + calibrated reading time + question
   attempt/review time + new-card/review forecasts. Deduplicate shared resources.
   Unknown inputs require calibration; infeasible targets show time/resource
   tradeoffs before a plan is accepted. Test time zones, days off and disruptions.
4. Deliver the prompt's six-step onboarding: timeline, availability, resources,
   progress, preferences and feasibility preview. Generate 3/6/12 calendar-month
   templates through the same engine, not separate hard-coded daily assignments.
5. Define the versioned real-ID plan schema and external-AI prompt/export. Reject
   unknown IDs and impossible dates; preview conflicts and proposed changes;
   apply only after the student's approval. Integrate calendar, tasks and progress
   through the desktop persistence service while preserving the approved design.
