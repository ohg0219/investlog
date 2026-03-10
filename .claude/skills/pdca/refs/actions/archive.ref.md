# archive (Archive Phase)

1. **Prerequisite**: `phase` = `"completed"` or `matchRate` >= 90%
2. Create `docs/archive/YYYY-MM/{feature}/` directory
3. Move documents:
   - `docs/01-plan/features/{feature}.plan.md`
   - `docs/02-design/features/{feature}.design.md`
   - `docs/03-analysis/{feature}.analysis.md`
   - `docs/04-report/features/{feature}.report.md`
4. Update or create `docs/archive/YYYY-MM/_INDEX.md`
5. Update status based on argument:
   - Default: Delete feature from `features` object
   - `--summary` flag: Convert to lightweight summary:
     ```json
     { "phase": "archived", "matchRate": N, "iterationCount": N,
       "startedAt": "...", "archivedAt": "...", "archivedTo": "docs/archive/..." }
     ```
6. Remove from `activeFeatures`
7. Add to history: `"archived"` with `archivedTo`
8. **Commit suggestion**: Check `git status` for uncommitted changes
   - If changes exist, ask user: "Commit changes?"
   - If approved, **follow `refs/actions/commit.ref.md` exactly** (사용자 확인, body 형식, Co-Authored-By 금지)
   - If declined, finish without commit

**Output**: `docs/archive/YYYY-MM/{feature}/`

> Action completed -> save snapshot. Procedure: see `refs/snapshot.ref.md`.
