# PDCA Iteration Report: 05-02-dashboard-kpi

## Overview

| Item | Value |
|------|-------|
| Feature | 05-02-dashboard-kpi |
| Date | 2026-03-11 |
| Total Iterations | 1 |
| Final Status | SUCCESS (92% → 95%) |

## Iteration Configuration

```
Evaluators: gap-detector, code-analyzer
Thresholds:
  gap_analysis: 90% (Complexity: medium)
  code_quality: 85
Limits:
  max_iterations: 5
```

## Score Progression

| Iteration | Base Match | TDD Extended | Code Quality | Combined |
|-----------|-----------|--------------|-------------|---------|
| Initial (Check) | 93% | 95% | 85% | 92% |
| **1 (Act)** | **96%** | **97%** | **87%** | **95%** |

## Issues Fixed

### By Severity

| Severity | Initial | Fixed | Remaining |
|----------|---------|-------|-----------|
| Critical | 1 | 1 | 0 |
| Warning | 3 | 2 | 1 |
| Info | 2 | 0 | 2 |

### By Category

| Category | Initial | Fixed | Remaining |
|----------|---------|-------|-----------|
| Design-Impl Gap (API URL) | 1 | 1 | 0 |
| Error Handling UX | 1 | 1 | 0 |
| Code Quality (CSS clamp) | 1 | 1 | 0 |
| Security (Cookie header) | 1 | 0 | 1 |
| Architecture (self-loop) | 1 | 0 | 1 |

## Iteration Details

### Iteration 1

**Scores:** Combined 92% → 95%

**Issues Addressed:**

- [Critical] `page.tsx` 거래 fetch URL 오탈자 수정
  - Location: `src/app/dashboard/page.tsx:23`
  - Fix: `/api/dashboard/transactions` → `/api/transactions` (존재하는 실제 API 경로로 수정)

- [Warning] DataErrorMessage에 "새로고침" 버튼 추가
  - Location: `src/components/dashboard/DashboardClientShell.tsx:14-20`
  - Fix: `<button onClick={() => window.location.reload()}>새로고침</button>` 추가

- [Warning] HoldingsList progress bar `weight` 클램핑 적용
  - Location: `src/components/dashboard/HoldingsList.tsx:21`
  - Fix: `${item.weight}%` → `${Math.min(item.weight, 100)}%` (100% 초과 레이아웃 깨짐 방지)

**Files Modified:**
- Modified: `src/app/dashboard/page.tsx`
- Modified: `src/components/dashboard/DashboardClientShell.tsx`
- Modified: `src/components/dashboard/HoldingsList.tsx`

---

## Changes Summary

### Modified Files
- `src/app/dashboard/page.tsx` — 거래 API URL 수정 (`/api/transactions`)
- `src/components/dashboard/DashboardClientShell.tsx` — 에러 배너에 새로고침 버튼 추가
- `src/components/dashboard/HoldingsList.tsx` — weight 클램핑 `Math.min(weight, 100)` 적용

## Remaining Issues

| Severity | Item | File | 비고 |
|----------|------|------|------|
| Warning | Cookie 헤더 직접 삽입 (`Cookie: \`token=${token}\``) | `page.tsx:18` | 헤더 인젝션 가능성. 서비스 레이어 직접 호출 리팩터링은 아키텍처 변경 범위로 향후 개선 |
| Info | 색상 배열 하드코딩 | `PortfolioPieChart.tsx` | 디자인 토큰 분리 — 향후 개선 |
| Info | Self-loop fetch 구조 | `page.tsx` | 서비스 레이어 직접 호출 리팩터링 — 향후 개선 |

## Quality Metrics

### Before/After Comparison

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Combined Match Rate | 92% | 95% | +3% |
| Critical Issues | 1 | 0 | -1 |
| Warning (해결) | 3 | 1 | -2 |
| Test Results | 26/26 PASS | 26/26 PASS | 유지 |

## Next Steps

1. `/pdca report 05-02-dashboard-kpi`
