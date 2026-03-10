# CLAUDE.md — pdca-develop Project Instructions

This file is automatically read by Claude Code at the start of every session.

---

## Project Overview

This project (`investlog`) is a PDCA (Plan-Do-Check-Act) workflow automation system for Claude Code.
It provides skills, hooks, templates, and ref files to manage iterative software development cycles.

---

## PDCA Invariants

> **CRITICAL**: All PDCA agents and skill executions MUST comply with the following invariants.
> These rules are enforced globally across all sessions.

### Quality Thresholds

| Rule | Value | Description |
|------|-------|-------------|
| Minimum Match Rate to skip iterate | 90% (기본값) | design.md `**Complexity**` 필드로 동적 조정: high=95%, medium=90%, low=85%. 필드 없으면 90% 유지 |
| Maximum iterate count | 5 | If iterationCount >= 5, escalate to user regardless of matchRate |
| Critical Issues | 0 | Report phase cannot start if Critical security issues remain |
| Minimum Match Rate for Report | 90% (기본값) | Complexity 동적 임계값과 동일한 threshold 적용 |

### Document Prerequisite Principle

- **plan → design → do order is MANDATORY**
- `do` phase requires `docs/02-design/features/{feature}.design.md` to exist
- `design` phase requires `docs/01-plan/features/{feature}.plan.md` to exist
- If a prerequisite document is missing: STOP and instruct user to create it first
- Do NOT skip phases or create pseudo-documents to bypass prerequisites

### Timestamp Rules (UTC+09:00 KST 엄격 적용)

- **모든 타임스탬프는 KST (UTC+09:00) 기준**으로 작성한다
- `docs/.pdca-status.json` history/timestamps: ISO 8601 형식, `+09:00` suffix 사용 예: `"2026-03-10T16:30:00.000+09:00"`
- 문서(plan.md, design.md 등) 날짜 필드: `YYYY-MM-DD` (KST 기준 날짜)
- hook 코드(`common.js`)의 타임스탬프 생성 함수는 반드시 UTC+9 오프셋을 명시적으로 적용
- UTC+00:00 (`Z` suffix) 사용 **금지** — 실수로 UTC로 기록하면 작업 순서가 틀어짐
- AI 에이전트가 직접 작성하는 모든 날짜/시간 값: KST 기준 적용, 현재 세션의 `currentDate` 참고
- **타임스탬프를 직접 기록할 때는 반드시 `date +"%Y-%m-%dT%H:%M:%S.000+09:00"` 를 실행한 후 실제 값을 사용** (추측·임의 값 입력 절대 금지)

### State Consistency Rules

- `docs/.pdca-status.json` MUST be updated after EVERY phase transition
- When a feature is archived: remove from `features` object AND `activeFeatures`
- When `primaryFeature` is archived: set `primaryFeature` to `activeFeatures[0]` or `null`
- history entries MUST be added in chronological order
- history array: if length > 50, apply `slice(-50)` (sliding window)

### Agent Role Boundaries

| Agent | Allowed Actions | NOT Allowed |
|-------|----------------|-------------|
| gap-detector | Read design + implementation files, calculate Match Rate | Modify any files |
| frontend-developer | Modify frontend source files (src/, components/, pages/, app/) | Modify backend API, DB, ref files |
| backend-developer | Modify backend source files (api/, services/, lib/, db/) | Modify frontend components, ref files |
| report-generator | Write docs/04-report/ files | Modify implementation source files |
| pdca-iterator | Modify implementation source files based on gap list | Modify design documents |

### AC (Acceptance Criteria) Processing Rules

- If `docs/02-design/features/{feature}.design.md` contains **Section 8 (Acceptance Criteria)**:
  - gap-detector MUST verify each AC item individually
  - AC verification results MUST appear in analysis.md Section 2.5
  - AC `Not Satisfied` items MUST be included in the gap list
- If design.md has NO Section 8: skip AC verification, use structural gap analysis only
- **AC items take priority** over structural gap items when calculating Match Rate

---
