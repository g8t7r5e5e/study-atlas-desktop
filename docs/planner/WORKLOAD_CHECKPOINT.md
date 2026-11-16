# Workload calculation checkpoint

Implemented pure minute estimates for video playback plus overhead, remaining reading with pace multiplier, questions plus review, and card events/new learning. Aggregate assessment deduplicates explicit occurrences, excludes completed work, flags missing estimates, rejects invalid values, subtracts commitments and buffer once, reports shortfalls and alternatives. Aggregate fit does not prove schedule feasibility. 48 tests pass, including six workload tests.

Next: connect the First Aid workbook estimates to activity selection; add calibration persistence, deadline/window/dependency feasibility and the deterministic allocator. No automatic FSRS forecast, calendar scheduling or UI integration is claimed.
