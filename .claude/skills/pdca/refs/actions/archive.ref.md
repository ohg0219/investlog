# archive (Archive Phase)

1. **Prerequisite**: `phase` = `"completed"` or `matchRate` >= 90%
2. Create `docs/archive/YYYY-MM/{feature}/` directory
3. Move documents using Read → Write → Bash rm (per file):
   각 파일에 대해 순서대로 실행:
   a. Read 원본 파일
   b. Write to `docs/archive/YYYY-MM/{feature}/{filename}`
   c. Bash `rm "{original_path}"` (Write 성공 후에만)

   대상 파일:
   - `docs/01-plan/features/{feature}.plan.md`
   - `docs/02-design/features/{feature}.design.md`
   - `docs/03-analysis/{feature}.analysis.md`
   - `docs/04-report/features/{feature}.report.md`

   **CRITICAL**: Bash mv/cp 사용 금지. Read+Write만 사용할 것.
   Write 완료 확인 전에 절대 rm 실행하지 말 것.

4. Update or create `docs/archive/YYYY-MM/_INDEX.md`:
   - 파일이 없으면 새로 생성 (헤더 포함)
   - 파일이 있으면 Read 후 항목 추가
   - 헤더 행이 없으면 먼저 생성:
     ```
     | Feature | Archived At | Match Rate | Location |
     |---------|-------------|------------|----------|
     ```
   - 항목 추가 형식:
     ```
     | {feature} | {archivedAt (YYYY-MM-DD)} | {matchRate}% | docs/archive/YYYY-MM/{feature}/ |
     ```

5. Update status:
   - Default: Delete feature from `features` object AND remove from `activeFeatures`
   - `--summary` flag: Convert to lightweight summary in `features`:
     ```json
     { "phase": "archived", "matchRate": N, "iterationCount": N,
       "startedAt": "...", "archivedAt": "...", "archivedTo": "docs/archive/..." }
     ```
   - If archived feature was `primaryFeature`: set `primaryFeature` to `null` or `activeFeatures[0]` (if others remain)

6. Add to history: `"archived"` with `archivedTo`

7. **완료 안내** (커밋 제안 없이 다음 단계 안내):
   - 출력: "Archive 완료. 다음 단계: `/pdca cleanup` → `/pdca commit`"

**Output**: `docs/archive/YYYY-MM/{feature}/`

> Action completed -> save snapshot. Procedure: see `refs/snapshot.ref.md`.
