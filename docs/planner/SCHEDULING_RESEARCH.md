# Study Atlas: scheduling approach comparison

Research checkpoint: 17 November 2026. Scope: algorithm comparison and proposed architecture only. No production scheduler, onboarding, solver benchmark, or medical-outcome validation was implemented in this checkpoint.

## Recommendation

Start with a deterministic, capacity-aware list scheduler, explicit reading-order and prerequisite constraints, a separate card-review workload interface, and conservative replanning. Treat CP-SAT as a later optional optimizer and benchmark reference. This is an engineering recommendation for this project, not a published claim that this combination improves USMLE scores.

The current First Aid source contains 1,405 topics and 7,017 subtopics across 16 systems. Use its stable IDs, original text and printed pages. The earlier 334-unit editorial draft is not the authoritative inventory. A topic is not automatically a day, and a subtopic is not automatically a flashcard. The workbook time estimates are initial assumptions, not measured personal performance.

## Comparison

| Approach | Appropriate role | Strength | Limitation / counterexample | Decision |
|---|---|---|---|---|
| Capacity-aware deterministic list scheduling | Allocate eligible activities to available daily minutes | Transparent, reproducible, easy to explain and implement offline | A greedy placement can miss a feasible arrangement; aggregate time fit is not proof | Primary v1 engine |
| Deadline ordering plus prerequisite graph | Decide which activities are eligible and urgent | Explicit dependencies and deadline checks | Deadline order alone can violate prerequisites or First Aid sequence; cycles must be rejected | Combine with capacity engine |
| CP-SAT | Jointly solve discrete assignments and competing constraints | Can model capacity, dependencies, locks and preferences together | More modeling, packaging and troubleshooting; time limits may leave feasibility unknown | Defer until comparative trials justify it |
| SM-2 | Schedule repetition of individual learning items | Small state and simple update rules | Does not allocate whole-course reading, videos and exam preparation | Reference comparator, not Atlas's calendar engine |
| FSRS | Model card memory and schedule card reviews | History-based personalization and configurable retention | Requires card-level inputs for personal forecasts; cannot establish clinical mastery or exam readiness | Prefer existing Anki scheduling; consume forecasts |
| Adaptive workload estimates | Adjust expected activity durations | Can learn a student's pace | Sparse, interrupted or poorly logged sessions can mislead | Add with visible uncertainty and sample counts |
| Predictive-reactive replanning | Repair a plan after changes | Can balance finishing work against unnecessary movement | Frequent full regeneration can destabilize the user's plan | Repair affected future work first |

Capacity scheduling is a proposed policy assembled from list scheduling, precedence and calendar constraints, not a uniquely specified named algorithm. No runtime superiority claim is made here.

## What the sources establish

**Deadline order.** Earliest-deadline ordering minimizes maximum lateness in the classic single-machine setting with jobs available initially and without the additional constraints Atlas needs. That result does not establish optimality for varying calendars, prerequisites, locked work and interruptions. Use deadlines among eligible tasks, not as permission to break reading order. [Princeton algorithm materials](https://www.cs.princeton.edu/~wayne/cs423/lectures/greed-4up.pdf)

**Constraint programming.** OR-Tools documents integer CP-SAT models and distinguishes OPTIMAL, FEASIBLE, INFEASIBLE, MODEL_INVALID and UNKNOWN. Its job-shop example demonstrates precedence and non-overlap constraints. Atlas could use integer-minute durations and daily assignments, plus optional intervals for actual clock-time sessions. UNKNOWN must never be displayed as impossible. An infeasibility claim applies only to the specified model and inputs. [CP-SAT documentation](https://developers.google.com/optimization/cp/cp_solver), [job-shop example](https://developers.google.com/optimization/scheduling/job_shop)

**SM-2.** Wozniak's original description updates item-specific intervals using recall ratings and an easiness factor. Its first two intervals are one and six days, followed by ease-dependent intervals; failed recall changes the repetition process. These are memory-review rules, not a complete study-calendar allocation policy. Original SM-2 should not be treated as identical to every application's modified implementation. [Original SM-2 description](https://super-memory.com/english/ol/sm2.htm)

**FSRS.** The project separates scheduling from parameter optimization using review history. Anki documents a retention/workload tradeoff and a simulator that estimates review counts or study minutes using card states and parameters. This supports a workload interface; it does not provide a guaranteed USMLE performance forecast. Existing Anki users should retain their scheduler rather than have Atlas independently assign conflicting due dates. [FSRS project](https://github.com/open-spaced-repetition/fsrs4anki), [Anki deck options and simulator](https://docs.ankiweb.net/manual/deck-options)

**Adaptation.** Exponential smoothing gives more weight to recent observations. Applying it to a student's activity times is our design proposal, not a validation reported by NIST. Calibrate separate activity types; record sample counts and avoid treating idle timer time as active study. [NIST explanation](https://itl.nist.gov/div898/handbook/pmc/section4/pmc43.htm)

**Replanning.** Scheduling research distinguishes generating an initial plan from revising it after disturbances, and discusses the tradeoff between efficiency and stability. That literature concerns manufacturing, not medical students. The transferable engineering idea is to preserve unaffected assignments and measure changes; its educational value needs user testing. [Vieira, Herrmann and Lin, 2003](https://akturk.bilkent.edu.tr/IE561/reschedule.pdf)

## Proposed v1 architecture

1. **Resource selection and identity:** include only selected resources and remaining work. Deduplicate the same video/card/question by scoped stable ID, not a similar title. An intentional repeat is a separate activity occurrence. Shared reading pages require explicit ownership to avoid charging each topic a full-page reading time.
2. **Workload model:** estimate each activity's remaining minutes with provenance, confidence and calibration status. Keep missing values distinct from zero.
3. **Feasibility checks:** compare work with capacity, including intermediate deadlines, continuous-session requirements and dependency paths. Detect contradictory locks and cycles before scheduling.
4. **Deterministic allocator:** reserve fixed commitments and approved review workload; allocate eligible new work without exceeding available minutes. Stable tie-breaks use deadline, declared priority, page order and ID. Never use medical importance inferred from a title as a hidden priority.
5. **Plan validator:** independently check all assignments, dates, dependencies, capacities, duplicate work and preserved locks. A valid constructed plan establishes feasibility for its modeled estimates, not a guarantee about real behavior.
6. **Versioned replanner:** compare old and new plans, retain completed work, protect locked work and show reasons and costs of proposed changes before applying.

Suggested priority of decisions: satisfy hard constraints first; complete the required selected scope by its target where possible; minimize disruption to the accepted plan; then improve daily balance and preferences. Do not use arbitrary weighted penalties to silently trade away a hard constraint.

### First Aid reading order

Apply forward printed-page order to new first-pass reading. Separate review activities may revisit earlier material; otherwise spaced repetition is incompatible with an absolute never-go-back rule. This separation is a proposed product interpretation to make visible in onboarding.

Use the current page-bucket sequence. A topic with references on pages 100 and 104 cannot pull page 104 before intervening required pages. Preserve source row order for same-page topics. Do not assume a heading's start page proves an exact reading span. If a topic estimate must be divided across pages, ask for or explicitly label the allocation assumption; never repeat its entire estimate on every page.

Resource prerequisites must be explicit and reviewed. If an asserted prerequisite contradicts forward reading order, show the conflict. Do not silently relax either requirement. Detect both graph cycles and conflicts with locks.

## Workload and capacity contract for the next implementation step

The following are proposed calculations, not implemented features:

- Video minutes = remaining recorded runtime / playback speed + expected pause, replay and note-taking overhead. Keep overhead separate so it is not counted twice through a calibration multiplier.
- Reading minutes = remaining selected workload × calibrated pace. Initially use workbook estimates with their original units; do not also add a second page-based estimate for the same reading.
- Question minutes = planned attempts × attempt-time estimate + expected review minutes. Split review estimates by relevant outcomes only when data supports it. Repeated practice counts toward time but not unique bank coverage.
- Card minutes = forecast review events × seconds/event + new-card learning and relearning costs, divided by 60. Unique cards and review events are different quantities. Future forecasts depend on new-card introduction, so re-evaluate them when that plan changes.
- Daily usable capacity = stated availability minus existing commitments, fixed sessions and explicit contingency. If the user already supplied net free study time, do not subtract commitments again. Reserve review demand once, either as tasks or a deduction, never both.

Maintain baseline and conservative estimates, clearly labeled assumptions rather than invented statistical percentiles. Initially, missing Anki history can support a manually chosen review budget or scenario range, not a personalized FSRS forecast. Buffers are adjustable product settings, not scientifically prescribed universal percentages.

Calibration should use active minutes and comparable completed work. A robust starting estimate followed by a visible exponential update is a reasonable v1 candidate. Show the smoothing parameter, observations and effective date. Avoid automatic recalibration from partial, interrupted or implausible sessions without handling those cases explicitly.

## Small, reproducible worked scenarios

These are analytical fixtures, not an implemented engine or a CP-SAT/FSRS benchmark. Minutes are synthetic, not estimates of this user's ability.

| Scenario | Inputs | Expected conclusion |
|---|---|---|
| Ordinary week | 5 × 180 available minutes; 150 review; 150 contingency; 500 new work | 600 new-work capacity; 100 minutes remain after allocation, subject to ordering/slot checks |
| Unrealistic deadline | Same capacity; 750 new work | 150-minute deficit; offer more time, a later date or less optional scope; never shorten tasks invisibly |
| Missed day | Above 500-minute plan; one 180-minute day lost; keep 150 review and 150 contingency totals | Capacity for new work becomes 420; deficit 80. Using 80 contingency minutes is an explicit alternative, not automatic |
| Pace increases | 300 video + 200 estimated reading minutes; reading calibration becomes 1.5× | New workload 600, exactly the original new-work budget. Review and contingency remain reserved |
| Locked conflict | 120-minute available day; 100 locked study + 40 required review | 20-minute conflict; do not move the lock or erase reviews silently |
| Aggregate fit fails | A 90-minute indivisible session; only two separate 60-minute windows | 120 total minutes still cannot fit the session; offer an approved split or longer window |
| Greedy counterexample | Two 60-minute days; A needs 60 by day 2, B needs 60 by day 1; both eligible | A-first fails, B-first succeeds. A failed greedy attempt is not proof of infeasibility |
| Order conflict | Page 100 reading requires page 104 reading first; both declared hard | Report contradictory requirements rather than generate a false-valid plan |

Before production, automate these plus partial completion, duplicate resources, missing durations, DST/local dates, month ends, new-card forecast changes, identical-input reproducibility and disruptions near the exam. Preserve 3/6/12 **calendar-month** semantics rather than substituting 90/180/360 days.

## Complexity, dependencies and licensing

- A basic priority queue gives efficient task selection, but full runtime depends on the placement, dependency and repair strategy. Do not claim the complete planner is O(n log n) without its implementation.
- CP-SAT introduces a native solver/runtime boundary for the Electron app. Benchmark packaging, startup, memory and solve time before adoption. Use fixed model ordering, a pinned version and reproducibility settings; storing accepted results is safer than promising identical solutions across solver upgrades.
- OR-Tools is Apache-2.0; ts-fsrs is MIT. Preserve required notices and review the exact pinned dependency graph before distribution. No dependency was installed or selected for shipping at this checkpoint. [OR-Tools license](https://raw.githubusercontent.com/google/or-tools/stable/LICENSE), [ts-fsrs license](https://raw.githubusercontent.com/open-spaced-repetition/ts-fsrs/main/LICENSE)
- Do not assume a web explanation of SM-2 grants permission to copy any third-party implementation. If needed, select and inspect a separately licensed implementation. Consuming Anki forecasts does not require embedding Anki's code.
- Local scheduling needs no paid AI API. External-AI JSON, later, should be an untrusted proposal passed through the same validator and preview.

## Decision and next checkpoint

Proceed next with workload/feasibility calculations and their data contract. Build the deterministic baseline only after those inputs and checks are sound. Compare it with CP-SAT later on identical fixtures using feasibility rate, runtime, unscheduled work, moved-task count and days moved; do not select by an unmeasured claim of optimality.

Research comparison is complete at a practical architecture level. Runtime performance, clinical outcomes, personalized review forecasts, production scheduling, onboarding and desktop integration remain unverified or unimplemented. No user records, installed app, hosted site or existing plan were changed.
