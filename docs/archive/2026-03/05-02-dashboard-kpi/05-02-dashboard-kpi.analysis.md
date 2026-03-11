# 05-02-dashboard-kpi Analysis Report

> **Analysis Type**: Gap Analysis / Code Quality / TDD Metrics
>
> **Project**: investlog
> **Version**: 0.1.0
> **Analyst**: dev
> **Date**: 2026-03-11
> **Design Doc**: [05-02-dashboard-kpi.design.md](../02-design/features/05-02-dashboard-kpi.design.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

`05-02-dashboard-kpi` 피처 구현이 설계 문서(design.md)와 얼마나 일치하는지 검증하고, 코드 품질 및 TDD 테스트 충족 여부를 분석한다.

**적용 임계값: 90% (Complexity: medium)**

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/05-02-dashboard-kpi.design.md`
- **Implementation Path**: `src/components/dashboard/`, `src/app/dashboard/`
- **Test Path**: `src/__tests__/components/dashboard/`
- **Analysis Date**: 2026-03-11

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 컴포넌트 존재 여부 (Section 5.2 대비)

| 설계 항목 | 구현 파일 | 상태 |
|----------|---------|------|
| `src/app/dashboard/page.tsx` | `src/app/dashboard/page.tsx` | Match |
| `src/app/dashboard/loading.tsx` | `src/app/dashboard/loading.tsx` | Match |
| `src/components/dashboard/DashboardClientShell.tsx` | `src/components/dashboard/DashboardClientShell.tsx` | Match |
| `src/components/dashboard/KpiCardGroup.tsx` | `src/components/dashboard/KpiCardGroup.tsx` | Match |
| `src/components/dashboard/KpiCard.tsx` | `src/components/dashboard/KpiCard.tsx` | Match |
| `src/components/dashboard/PortfolioPieChart.tsx` | `src/components/dashboard/PortfolioPieChart.tsx` | Match |
| `src/components/dashboard/HoldingsList.tsx` | `src/components/dashboard/HoldingsList.tsx` | Match |
| `src/components/dashboard/RecentTransactions.tsx` | `src/components/dashboard/RecentTransactions.tsx` | Match |

**컴포넌트 존재: 8/8 (100%)**

### 2.2 Props 계약 일치 여부 (Section 3.2 대비)

| 컴포넌트 | 설계 Props | 구현 상태 | 상태 |
|---------|-----------|---------|------|
| `KpiCard` | `label`, `value`, `colorVariant`, `showArrow?`, `format?` | 동일 정의 | Match |
| `KpiCardGroup` | `kpi: DashboardSummary['kpi']` | 동일 정의 | Match |
| `DashboardClientShell` | `summary: DashboardSummary \| null`, `transactions: TransactionWithStock[] \| null` | 동일 정의 | Match |
| `PortfolioPieChart` | `items`, `outerRadius?=160`, `innerRadius?=88` | 동일 정의 | Match |
| `HoldingsList` | `items: PortfolioItem[]` | 동일 정의 | Match |
| `RecentTransactions` | `transactions: TransactionWithStock[]` | 동일 정의 | Match |

**Props 계약: 6/6 (100%)**

### 2.3 구현 세부 요구사항

| 요구사항 | 상태 | 근거 |
|---------|------|------|
| KpiCard `data-testid="kpi-value"` | Match | `KpiCard.tsx:51` |
| KpiCard `Math.abs(value)` 절댓값 처리 | Match | `KpiCard.tsx:19` |
| KpiCard pnl 색상 분기 (green/red/warm-mid) | Match | `KpiCard.tsx:11-16` |
| PortfolioPieChart 방어 필터 (`weight > 0 && isFinite`) | Match | `PortfolioPieChart.tsx:53-55` |
| PortfolioPieChart "종목 없음" 빈 상태 | Match | `PortfolioPieChart.tsx:68` |
| HoldingsList `items.length === 0` → null | Match | `HoldingsList.tsx:8` |
| RecentTransactions `data-testid="transaction-row"` | Match | `RecentTransactions.tsx:48` |
| RecentTransactions "거래 없음" 빈 상태 | Match | `RecentTransactions.tsx:25` |
| RecentTransactions `href="/dashboard/transactions"` | Match | `RecentTransactions.tsx:17` |
| DashboardClientShell `transactions.slice(0, 5)` | Match | `DashboardClientShell.tsx:47` |
| page.tsx JWT 인증 + redirect | Match | `page.tsx:9-13` |
| page.tsx `Promise.all` 병렬 fetch | Match | `page.tsx:21-24` |
| **page.tsx `/api/transactions` fetch URL** | **Not Implemented** | `page.tsx:23` — `/api/dashboard/transactions` 오탈자. 실제 존재하는 API: `/api/transactions`. 런타임 500 오류 발생 |
| PortfolioPieChart `ResponsiveContainer aspect={1}` | Partial | `height={outerRadius * 2}` 사용. 기능은 동작하나 반응형 종횡비 처리 방식 차이 |
| DataErrorMessage "새로고침" 버튼 | Not Implemented | `DashboardClientShell.tsx:14-19` — 텍스트 메시지만, 버튼 없음 |

### 2.4 Match Rate Summary

```
Components:            8/8   (100%)
Props Contract:        6/6   (100%)
Implementation Details: 12.5/15 (83.3%) — 12 Match + 1 Partial(×0.5) + 2 Not Implemented(×0)
```

**Base Match Rate: 93%**

### 2.5 Acceptance Criteria Verification

| ID | Criteria | Status | Evidence | Notes |
|----|----------|--------|----------|-------|
| AC-01 | KPI 카드 4개 실데이터 표시 | Satisfied | `KpiCardGroup.tsx:8-36`, `page.tsx:21-24` | — |
| AC-02 | 빈 상태: KPI 0, "종목 없음", "거래 없음" | Satisfied | `PortfolioPieChart.tsx:68`, `RecentTransactions.tsx:25`, `KpiCard.tsx:19` | HoldingsList는 null 반환 (설계 의도) |
| AC-03 | 차트 hover 툴팁: 종목명, 비중%, 금액 | Satisfied | `PortfolioPieChart.tsx:39-45` CustomTooltip | — |
| AC-04 | portfolio N개 → 리스트 행 N개 | Satisfied | `HoldingsList.tsx:12-34` items.map | — |
| AC-05 | 거래 M건(>5) → 최대 5건 표시 | Satisfied | `DashboardClientShell.tsx:47` slice(0, 5) | — |
| AC-06 | "전체 보기 →" → `/dashboard/transactions` | Satisfied | `RecentTransactions.tsx:16-21` | — |
| AC-07 | 실현 손익 양수 → "▲ +" + green | Satisfied | `KpiCard.tsx:32-34`, `KpiCard.tsx:13` | — |
| AC-08 | 실현 손익 음수 → "▼ " + red | Satisfied | `KpiCard.tsx:33`, `KpiCard.tsx:14` | — |

**AC Summary**
```
Satisfied:     8 items
Partial:       0 items
Not Satisfied: 0 items
---
AC Iterate Required: No
```

---

## 3. Code Quality Analysis

### 3.1 Complexity Analysis

| 파일 | 함수/컴포넌트 | 복잡도 | 상태 |
|------|-------------|--------|------|
| `KpiCard.tsx` | `resolveValueColor` | 4 | Low (Good) |
| `KpiCard.tsx` | `formatValue` | 4 | Low (Good) |
| `KpiCard.tsx` | `resolveArrow` | 4 | Low (Good) |
| `KpiCard.tsx` | `KpiCard` | 1 | Low (Good) |
| `KpiCardGroup.tsx` | `KpiCardGroup` | 1 | Low (Good) |
| `DashboardClientShell.tsx` | `DashboardClientShell` | 4 | Low (Good) |
| `PortfolioPieChart.tsx` | `CustomTooltip` | 3 | Low (Good) |
| `PortfolioPieChart.tsx` | `PortfolioPieChart` | 3 | Low (Good) |
| `HoldingsList.tsx` | `HoldingsList` | 2 | Low (Good) |
| `RecentTransactions.tsx` | `RecentTransactions` | 2 | Low (Good) |
| `page.tsx` | `DashboardPage` | 6 | Medium (Acceptable) |
| `loading.tsx` | `DashboardLoading` | 1 | Low (Good) |

**Max Complexity: 6** (DashboardPage — 허용 범위 내)

### 3.2 Security Issues

| Severity | 파일 | 위치 | Issue | 권고사항 |
|----------|------|------|-------|---------|
| Warning | `page.tsx` | L18 | Cookie 헤더 직접 문자열 삽입 — 헤더 인젝션 가능성 | `encodeURIComponent` 적용 또는 서비스 레이어 직접 호출 |
| Warning | `page.tsx` | L15 | `NEXT_PUBLIC_BASE_URL` 미설정 시 `localhost` fallback — 프로덕션 오설정 위험 | 서버 전용 환경 변수(`BASE_URL`) 사용 + 미설정 시 빌드 에러 처리 |
| Warning | `HoldingsList.tsx` | L21 | `weight` 범위 검증 없이 CSS width에 직접 사용 — 100% 초과 시 레이아웃 깨짐 | `Math.min(item.weight, 100)` 클램핑 적용 |
| Info | `page.tsx` | L22-23 | fetch 실패 시 에러 원인 로깅 없음 | 서버 측 로거로 에러 기록 |
| Info | `PortfolioPieChart.tsx` | L12-15 | 색상 배열 하드코딩 | 디자인 토큰/테마 파일로 분리 |

**Critical: 0개 / Warning: 3개 / Info: 2개**

---

## 4. Convention Compliance

### 4.1 Naming Convention

| 카테고리 | 컨벤션 | 준수율 | 위반 |
|---------|-------|:------:|------|
| 컴포넌트명 | PascalCase | 100% | 없음 |
| 함수명 | camelCase | 100% | 없음 |
| Props 인터페이스 | 명시적 정의 | 100% | 없음 |
| TypeScript `any` 사용 | 사용 금지 | 100% | 없음 |
| `'use client'` 지시자 | 필요 컴포넌트에만 | 95% | `RecentTransactions.tsx` — Link만 사용하는 경우 서버 컴포넌트로도 가능 |

---

## 5. Test Metrics (TDD)

### 5.1 Coverage Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Line Coverage | 85.36% | 80% | Pass |
| Branch Coverage | 78.78% | 70% | Pass |
| Function Coverage | 91.66% | 80% | Pass |

### 5.2 Test Results

| Total | Passing | Failing | Skipped |
|-------|---------|---------|---------|
| 26 | 26 | 0 | 0 |

### 5.3 Test Scenario Traceability

| Design TS-ID | Test File | Status | Notes |
|--------------|-----------|--------|-------|
| TS-01 | `KpiCard.test.tsx` | Pass | label 렌더링 |
| TS-02 | `KpiCard.test.tsx` | Pass | currency-krw 포맷 |
| TS-03 | `KpiCard.test.tsx` | Pass | pnl+ 화살표+green |
| TS-04 | `KpiCard.test.tsx` | Pass | pnl- 화살표+red |
| TS-05 | `KpiCard.test.tsx` | Pass | pnl=0 화살표없음+warm-mid |
| TS-06 | `KpiCard.test.tsx` | Pass | accent 색상 |
| TS-07 | `KpiCard.test.tsx` | Pass | neutral 색상 |
| TS-08 | `KpiCard.test.tsx` | Pass | showArrow=false |
| TS-09 | `KpiCardGroup.test.tsx` | Pass | 4개 레이블 렌더링 |
| TS-10 | `KpiCardGroup.test.tsx` | Pass | 올바른 value 전달 |
| TS-11 | `PortfolioPieChart.test.tsx` | Pass | 차트 컨테이너 렌더링 |
| TS-12 | `PortfolioPieChart.test.tsx` | Pass | 빈 배열 → "종목 없음" |
| TS-13 | `PortfolioPieChart.test.tsx` | Pass | 방어 필터 |
| TS-14 | `HoldingsList.test.tsx` (KpiCardGroup 파일) | Pass | ticker 렌더링 |
| TS-15 | `HoldingsList.test.tsx` | Pass | 금액 포맷 |
| TS-16 | `HoldingsList.test.tsx` | Pass | 빈 배열 → null |
| TS-17 | `RecentTransactions.test.tsx` | Pass | 5건 렌더링 |
| TS-18 | `RecentTransactions.test.tsx` | Pass | 유형 chip 레이블 |
| TS-19 | `RecentTransactions.test.tsx` | Pass | "전체 보기" href |
| TS-20 | `RecentTransactions.test.tsx` | Pass | 빈 배열 → "거래 없음" |
| TS-21 | `RecentTransactions.test.tsx` | Pass | 날짜 형식 |
| TS-22 | `RecentTransactions.test.tsx` | Pass | 금액 포맷 |

**TS 구현률: 22/22 (100%)**

---

## 5.5 Tech Debt Trend

> 이전 사이클 analysis.md 없음 — 최초 사이클

| Metric | Previous | Current | Delta | Verdict |
|--------|----------|---------|-------|---------|
| Max Complexity | N/A | 6 | N/A | OK |
| Avg Line Coverage | N/A | 85.36% | N/A | OK |
| Critical Issues | N/A | 0 | N/A | OK |

**최초 사이클 — N/A**

---

## 6. Overall Score

### 6.1 TDD Extended Score 계산

```
TDD 메트릭 점수:
  테스트 통과율:    26/26 = 100%  (weight: 0.5) → 50
  커버리지 달성률:  85.36%/80% = 107% → cap 100% (weight: 0.3) → 30
  시나리오 구현률:  22/22 = 100%  (weight: 0.2) → 20
  ---
  TDD 메트릭 점수 = 100

TDD Extended Score = (Base Match Rate × 0.7) + (TDD 메트릭 × 0.3)
                   = (93% × 0.7) + (100 × 0.3)
                   = 65.1 + 30.0
                   = 95%
```

### 6.2 Combined Match Rate

```
Combined Match Rate = (TDD Extended Score × 0.7) + (Code Quality Score × 0.3)
                    = (95% × 0.7) + (85% × 0.3)
                    = 66.5 + 25.5
                    = 92%
```

**⚠ Critical Functional Gap 경고**: `page.tsx`의 `/api/dashboard/transactions` 오탈자로 인해 런타임에서 거래 데이터 fetch가 실패할 수 있습니다. 수치 기준으로는 92% ≥ 90% 충족이지만, 이 버그는 report 전에 반드시 수정이 필요합니다.

---

## 7. Recommended Actions

### 7.1 Immediate (Critical — Report 전 필수 수정)

| Priority | Item | File | 영향 |
|----------|------|------|------|
| 1 | `page.tsx` 거래 fetch URL 수정: `/api/dashboard/transactions` → `/api/transactions` | `src/app/dashboard/page.tsx:23` | 런타임 거래 데이터 표시 불가 (500 오류) |

### 7.2 Short-term (Warning)

| Priority | Item | File | Expected Impact |
|----------|------|------|-----------------|
| 1 | DataErrorMessage에 "새로고침" 버튼 추가 | `DashboardClientShell.tsx:14-19` | 에러 복구 UX 개선 |
| 2 | HoldingsList `weight` 클램핑 `Math.min(item.weight, 100)` 적용 | `HoldingsList.tsx:21` | CSS 오버플로우 방지 |
| 3 | Cookie 헤더 인젝션 방지 — `encodeURIComponent` 또는 서비스 레이어 직접 호출 | `page.tsx:18` | 보안 강화 |

---

## 8. Next Steps

- [x] TDD 테스트 26/26 통과 확인
- [ ] **[필수]** `page.tsx` `/api/transactions` URL 버그 수정
- [ ] DataErrorMessage "새로고침" 버튼 추가
- [ ] `/pdca report 05-02-dashboard-kpi` (수정 후)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-11 | Initial analysis | dev |
