# 05-04-dashboard-stock-realtime Analysis Report

> **Analysis Type**: Gap Analysis / Code Quality / TDD Test Metrics
>
> **Project**: investlog
> **Version**: 0.1.0
> **Analyst**: dev
> **Date**: 2026-03-12
> **Design Doc**: [05-04-dashboard-stock-realtime.design.md](../02-design/features/05-04-dashboard-stock-realtime.design.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

05-04-dashboard-stock-realtime 피처의 구현이 설계 문서와 얼마나 일치하는지 검증하고, 코드 품질 및 TDD 테스트 결과를 종합하여 Combined Match Rate를 산출한다.

**적용 임계값: 90% (Complexity: medium)**

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/05-04-dashboard-stock-realtime.design.md`
- **Implementation Path**: `src/components/dashboard/`, `src/app/dashboard/`, `src/types/`
- **Analysis Date**: 2026-03-12

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 API Endpoints

| Design | Implementation | Status | Notes |
|--------|---------------|--------|-------|
| GET /api/prices (useEffect client fetch) | `DashboardClientShell.tsx:52` | Match | |
| GET /api/dashboard/history (server fetch) | `page.tsx:25` historyRes fetch | Match | |
| Response `{ prices: PriceMap }` | `DashboardClientShell.tsx:56` `data.prices ?? prev` | Match | |
| Response `{ data: Record<ticker, StockHistoryPoint[]> }` | `page.tsx:58` `.data` destructure | Match | |

### 2.2 Data Model

| Field | Design Type | Impl Type | Status |
|-------|-------------|-----------|--------|
| `PriceMap` | `Record<string, PriceQuote\|null>` | `types/index.ts:144` | Match |
| `StockHistoryPoint` | `{ month, closePrice }` | `types/index.ts:217-220` | Match |
| `UnrealizedPnL` | 7 fields | `types/index.ts:223-231` | Match |
| `StockReturnPoint` | `{ month, returnRate }` | `types/index.ts:237-241` | Match |
| `StockChartLine` | `{ ticker, name, color, data }` | `types/index.ts:247-252` | Match |
| `historyData` prop added to Shell | `DashboardClientShell.tsx:19` | Match | |

### 2.3 Component Structure

| Design Component | Implementation File | Status |
|------------------|---------------------|--------|
| `StockPnLCard.tsx` | `src/components/dashboard/StockPnLCard.tsx` | Match |
| `StockProfitChart.tsx` | `src/components/dashboard/StockProfitChart.tsx` | Match |
| `StockTab.tsx` | `src/components/dashboard/StockTab.tsx` | Match |
| `StockProfitSection.tsx` | `src/components/dashboard/StockProfitSection.tsx` | Match |
| `DashboardClientShell.tsx` (realtime logic) | `src/components/dashboard/DashboardClientShell.tsx` | Match |
| `StockPnLCard.test.tsx` | `src/__tests__/components/dashboard/StockPnLCard.test.tsx` | Match |
| `StockProfitChart.test.tsx` | `src/__tests__/components/dashboard/StockProfitChart.test.tsx` | Match |
| `StockTab.test.tsx` | `src/__tests__/components/dashboard/StockTab.test.tsx` | Match |
| `DashboardClientShell.test.tsx` | `src/__tests__/components/dashboard/DashboardClientShell.test.tsx` | Match |
| `StockProfitSection.test.tsx` | NOT FOUND | **Missing** |

### 2.4 State Management

| State | Design | Implementation | Status |
|-------|--------|---------------|--------|
| `priceMap: PriceMap` init `{}` | Section 3.1 | `DashboardClientShell.tsx:42` | Match |
| `lastUpdated: Date\|null` init `null` | Section 3.1 | `DashboardClientShell.tsx:43` | Match |
| `isLoading: boolean` init `true` | Section 3.1 | `DashboardClientShell.tsx:44` | Match |
| `priceError: boolean` init `false` | Section 3.1 | `DashboardClientShell.tsx:45` | Match |
| `activeTicker: string` init `'ALL'` | Section 3.1 | `StockProfitSection.tsx:29` | Match |
| `period: Period` init `'ALL'` | Section 3.1 | `StockProfitSection.tsx:30` | Match |

### 2.5 Acceptance Criteria Verification

| ID | Criteria | Status | Evidence | Notes |
|----|----------|--------|----------|-------|
| AC-01 | activeTicker='ALL' → 모든 종목 라인 표시 | Satisfied | `StockProfitSection.tsx:65-68` visibleLines=allLines when ALL | |
| AC-02 | 개별 종목 탭 선택 → 해당 종목 라인만 표시 | Satisfied | `StockProfitSection.tsx:66-67` filter by ticker | |
| AC-03 | 기간 필터 6M → 최근 6개월 데이터만 표시 | Partial | Period filter 구현됨; TS-16 테스트 미작성 (data-count 검증 없음) | |
| AC-04 | StockPnLCard 수익률%, 평가손익 정확히 표시 | Satisfied | `StockPnLCard.tsx:11-27`; TS-01~TS-07 통과 | |
| AC-05 | 페이지 진입 시 현재가 로딩 → KPI 수치 갱신 | Not Satisfied | `DashboardClientShell.tsx:114` — `<KpiCardGroup kpi={summary.kpi} />` priceMap prop 미전달 | Critical gap |
| AC-06 | 60초 후 재조회 → REALTIME 배지 시각 업데이트 | Satisfied | `DashboardClientShell.tsx:70` setInterval(60_000); TS-22 통과 | |
| AC-07 | 보유 종목 없을 때 빈 상태 UI 표시 | Satisfied | `StockProfitSection.tsx:115-119` empty state message | |

**AC Summary**
```
Satisfied:     5 items
Partial:       1 items (AC-03)
Not Satisfied: 1 items (AC-05)
---
Iterate Required: Yes
```

### 2.6 UI/UX Gap 상세

| 항목 | 설계 | 구현 | 상태 |
|------|------|------|------|
| REALTIME 배지 + 갱신 시각 | `flex items-baseline gap-3` 내 배치 | `DashboardClientShell.tsx:97-110` | Match |
| 배지 정상 색상 | `bg-accent/20 text-accent` | `DashboardClientShell.tsx:103` | Match |
| 배지 오류 색상 | `bg-red-bright/20 text-red-bright` | `DashboardClientShell.tsx:102` | Match |
| REALTIME 배지 `aria-live="polite"` 래퍼 | Section 7 | **미구현** | Missing |
| `KpiCardGroup` priceMap prop 전달 | Section 5.5 | `DashboardClientShell.tsx:114` — priceMap 미전달 | **Missing** |
| StockTab + PeriodFilter 같은 행 (`flex items-center gap-4`) | Section 5.3 | 탭과 필터가 별도 행으로 분리 | Partial |
| Legend: activeTicker='ALL'일 때만 표시 | Section 5.7 | `StockProfitChart.tsx:50-55` 항상 렌더링 | Partial |
| `StockProfitChart` aria-label="주식별 수익 추이 차트" | Section 7 | **미구현** | Missing |
| `StockPnLCard` priceMap[ticker]=null → "가격 조회 중" + 0% | Section 6.4, EC-09 | **미구현** | Missing |
| historyData=null → `DataErrorMessage` 컴포넌트 재사용 | Section 6.3 | 인라인 div 사용 | Partial |
| `StockTab` aria-controls | Section 7 | **미구현** | Missing |
| 색상 구분 보조 aria-label "수익"/"손실" | Section 7 | **미구현** | Missing |

### 2.7 Match Rate Summary

```
Base Match Rate: 78%
---
  Match:           ~22 items (73%)
  Partial:          ~5 items (10%)
  Missing:          ~7 items (17%)

Gap Items:
  Critical (AC-05):  KpiCardGroup priceMap prop 미전달
  Warning (7개):     StockPnLCard null-price fallback, Legend 조건부 표시,
                     StockProfitSection.test.tsx 미생성, TS-16 미작성,
                     StockTab aria-controls, REALTIME aria-live, aria-label 3개
```

---

## 3. Code Quality Analysis

### 3.1 Complexity Analysis

| File | Function | Complexity | Status | Recommendation |
|------|----------|------------|--------|----------------|
| StockPnLCard.tsx | `StockPnLCard` | 3 | Good | — |
| StockProfitChart.tsx | `StockProfitChart` | 2 | Good | — |
| StockTab.tsx | `StockTab` | 2 | Good | — |
| StockProfitSection.tsx | `StockProfitSection` | 4 | Good | — |
| StockProfitSection.tsx | `allLines` (useMemo) | 5 | Good | — |
| DashboardClientShell.tsx | `DashboardClientShell` | 6 | Good | — |
| DashboardClientShell.tsx | `fetchPrices` (inner async) | 4 | Good | — |

최대 복잡도 6 — 임계치(10) 이내. 전체 Good.

### 3.2 Security Issues

| Severity | File | Location | Issue | Recommendation |
|----------|------|----------|-------|----------------|
| Warning | `DashboardClientShell.tsx` | L54 | `/api/prices` 응답 shape 미검증 | 런타임 shape check 추가 (`typeof data?.prices === 'object'`) |
| Warning | `StockProfitSection.tsx` | L21 | `priceMap` prop 선언 후 미사용 (dead interface) | prop 제거 또는 사용 |
| Warning | `DashboardClientShell.tsx` | L93 | `void isLoading` — 로딩 UI 미연결 dead state | isLoading 상태를 skeleton UI에 연결하거나 제거 |
| Info | `StockProfitChart.tsx` | L33, L47-48 | 차트 테마 hex 색상 하드코딩 | 공유 `chartTheme` 상수로 분리 |

**Critical 이슈: 0개**

---

## 4. Convention Compliance

### 4.1 Naming Convention Check

| Category | Convention | Compliance | Violations |
|----------|-----------|:----------:|------------|
| Components | PascalCase | 100% | 없음 |
| Functions/hooks | camelCase | 100% | 없음 |
| TypeScript interfaces | `...Props` suffix | 100% | 없음 |
| File names | PascalCase.tsx | 100% | 없음 |
| 'use client' 위치 | 파일 최상단 | 100% | 없음 |
| Unused declaration | — | Fail | `StockProfitSection.tsx:21` priceMap prop unused |

---

## 5. Test Metrics (TDD)

### 5.1 Test Results

| Total | Passing | Failing | Skipped |
|-------|---------|---------|---------|
| 263 (전체 suite) | 263 | 0 | 0 |

**Feature-specific 신규 테스트**: StockPnLCard, StockTab, StockProfitChart, DashboardClientShell 테스트 파일 (약 35개 케이스)

### 5.2 Test Scenario Traceability

| Design TS-ID | Test File | Status | Notes |
|--------------|-----------|--------|-------|
| TS-01 | StockPnLCard.test.tsx | Pass | |
| TS-02 | StockPnLCard.test.tsx | Pass | |
| TS-03 | StockPnLCard.test.tsx | Pass | |
| TS-04 | StockPnLCard.test.tsx | Pass | |
| TS-05 | StockPnLCard.test.tsx | Pass | |
| TS-06 | StockPnLCard.test.tsx | Pass | |
| TS-07 | StockPnLCard.test.tsx | Pass | |
| TS-08 | StockTab.test.tsx | Pass | |
| TS-09 | StockTab.test.tsx | Pass | |
| TS-10 | StockTab.test.tsx | Pass | |
| TS-11 | StockTab.test.tsx | Pass | |
| TS-12 | StockProfitChart.test.tsx | Pass | |
| TS-13 | StockProfitChart.test.tsx | Pass | |
| TS-14 | StockProfitChart.test.tsx | Pass | |
| TS-15 | StockProfitChart.test.tsx | Pass | |
| TS-16 | — | **Missing** | data-count 기반 period 검증 미작성 |
| TS-17 | DashboardClientShell.test.tsx | Pass | |
| TS-18 | DashboardClientShell.test.tsx | Pass | |
| TS-19 | DashboardClientShell.test.tsx | Pass | |
| TS-20 | DashboardClientShell.test.tsx | Pass | |
| TS-21 | DashboardClientShell.test.tsx | Pass | |
| TS-22 | DashboardClientShell.test.tsx | Pass | |
| TS-23 | DashboardClientShell.test.tsx | Pass | |
| TS-24 | — | **Missing** | StockProfitSection.test.tsx 미생성 |
| TS-25 | — | **Missing** | StockProfitSection.test.tsx 미생성 |

**Scenario Implementation Rate**: 22/25 = **88%**

---

## 5.5 Tech Debt Trend

최초 사이클 — N/A (이전 분석 문서 없음)

| Metric | Previous | Current | Delta | Verdict |
|--------|----------|---------|-------|---------|
| Max Complexity | N/A | 6 | N/A | OK |
| Avg Line Coverage | N/A | N/A | N/A | N/A |
| Critical Issues | N/A | 0 | N/A | OK |

---

## 6. Overall Score

### 6.1 Base Score Calculation

```
Gap Match Rate (gap-detector):    78%
Code Quality Score (code-analyzer): 84/100

Combined Match Rate = (gap_match_rate × 0.7) + (code_quality_score × 0.3)
                    = (78 × 0.7) + (84 × 0.3)
                    = 54.6 + 25.2
                    = 79.8% → 80%
```

**TDD Note**: 테스트 통과율 100% (263/263), 시나리오 구현률 88% (22/25). 커버리지 미측정으로 TDD extended score 적용 생략, base rate 사용.

### 6.2 Combined Match Rate

```
Combined Match Rate: 80%
Threshold:          90% (Complexity: medium)
Status:             BELOW THRESHOLD → iterate required
```

---

## 7. Recommended Actions

### 7.1 Immediate (Critical)

| Priority | Item | File | Notes |
|----------|------|------|-------|
| 1 | KpiCardGroup에 priceMap prop 전달 | `DashboardClientShell.tsx:114` | AC-05 Not Satisfied |

### 7.2 Short-term (Warning)

| Priority | Item | File | Expected Impact |
|----------|------|------|-----------------|
| 1 | StockPnLCard: priceMap[ticker]=null 시 "가격 조회 중" + 0% fallback 구현 | `StockPnLCard.tsx` | Section 6.4, EC-09 |
| 2 | StockProfitChart: activeTicker!='ALL'일 때 Legend 숨김 처리 | `StockProfitChart.tsx` | Section 5.7 |
| 3 | StockProfitSection.test.tsx 생성 (TS-24, TS-25, EC-10) | `src/__tests__/` | TDD 커버리지 +3 scenarios |
| 4 | StockProfitChart.test.tsx에 TS-16 추가 (period 6M data-count) | `StockProfitChart.test.tsx` | AC-03 검증 |
| 5 | REALTIME 배지 aria-live="polite" 래퍼 추가 | `DashboardClientShell.tsx` | Section 7 |
| 6 | StockTab aria-controls 속성 추가 | `StockTab.tsx` | Section 7 |
| 7 | StockProfitChart aria-label="주식별 수익 추이 차트" 추가 | `StockProfitChart.tsx` | Section 7 |

---

## 8. Next Steps

- [x] Gap 분석 완료
- [ ] `/pdca iterate 05-04-dashboard-stock-realtime` 실행 (iterate 강력 권고)
- [ ] iterate 후 match rate ≥ 90% 달성 시 report 작성

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-12 | Initial analysis | dev |
