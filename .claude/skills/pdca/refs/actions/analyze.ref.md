# analyze (Check Phase)

1. **Prerequisite**: Implementation code should exist (Do phase started)
2. Verify Design document exists
3. Find implementation code paths (search `src/`, `app/`, `lib/`, `components/`, etc.)
4. **Call gap-detector Agent** using Task tool:
   - Provide Design document path
   - Provide implementation code paths
   - Agent compares design vs implementation and returns Base Match Rate + Gap list
5. **If `tdd.enabled` is true in status (TDD mode)**:
   a. Collect test results (run test command, parse output for pass/fail counts)
   b. Collect coverage data (parse coverage report for line/branch/function %)
   c. Build Test Scenario Traceability (map TS-xx to test files and status)
   d. Calculate extended Match Rate:
      ```
      Match Rate = (design match * 0.7) + (test metrics * 0.3)
      test metrics = (pass rate * 0.5) + (coverage * 0.3) + (scenario impl rate * 0.2)
      ```
   e. Update status: `tdd.testsPassing`, `tdd.testsFailing`, `tdd.coverage`
   f. If test data collection fails, fall back to base Match Rate only (warn user)
6. **If TDD is not enabled**: Use base Match Rate as-is
7. Read [analysis.template.md](../../templates/analysis.template.md) and create `docs/03-analysis/{feature}.analysis.md`
   - Fill in Match Rate, Gap items, scores
   - Include Section 5 (Test Metrics) if TDD mode
8. Update status: `phase` = `"check"`, `phaseNumber` = `4`, `matchRate` = result
9. Create Task: `[Check] {feature}` with `addBlockedBy` referencing Do task
10. Add to history: `"check_completed"` with `matchRate`
11. Guide based on Match Rate:
    - **>= 90%**: "Design-implementation aligned. Run `/pdca report {feature}`"
    - **70-89%**: "Some gaps found. Run `/pdca iterate {feature}` recommended"
    - **< 70%**: "Significant gaps. Run `/pdca iterate {feature}` required"

**Output**: `docs/03-analysis/{feature}.analysis.md`

> Action completed -> save snapshot. Procedure: see `refs/snapshot.ref.md`.
