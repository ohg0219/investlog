# 05-04-dashboard-stock-realtime Planning Document

> **Summary**: 주식별 수익 추이 + 실시간 주가 갱신 (Wave 3)
>
> **Project**: investlog
> **Version**: 0.1.0
> **Author**: dev
> **Date**: 2026-03-11
> **Status**: Draft
> **Parent**: [05-dashboard.plan.md](05-dashboard.plan.md)

---

## 1. Overview

### 1.1 Purpose

대시보드의 마지막 구역인 주식별 수익 추이 멀티라인 차트와 실시간 주가 갱신 기능을 구현한다.
Yahoo Finance Historical API로 과거 월말 종가를 조회하고, 60초 interval로 현재가를 갱신한다.

### 1.2 Related Documents

- Parent Plan: `docs/01-plan/features/05-dashboard.plan.md`
- **Depends on**: `05-01-dashboard-infra` (history API + calcStockCumulativeReturn 완료 필요)
- **Depends on**: `05-02-dashboard-kpi` (DashboardClientShell 기반 구조 완료 필요)

---

## 2. Scope

### 2.1 In Scope

**섹션 7: 주식별 수익 추이**
- [ ] `StockProfitChart.tsx` — Recharts LineChart 멀티라인 (종목별 고유 색상)
- [ ] `StockTab.tsx` — 종목 탭 (전체 / 개별 종목 선택)
- [ ] `StockPnLCard.tsx` — 종목별 평가손익 카드 (수익률%, 평가손익 금액)

**실시간 갱신**
- [ ] `DashboardClientShell.tsx` 완성 — 60초 interval `setInterval` + `priceMap` 상태 갱신
- [ ] REALTIME 배지 + 마지막 갱신 시각 표시
- [ ] 진입 시 1회 즉시 조회

### 2.2 Out of Scope

- 차트 섹션 1~4 (→ 05-02, 05-03)
- Historical API 구현 (→ 05-01)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Component | Status |
|----|-------------|----------|-----------|--------|
| FR-01 | 주식별 수익 추이: 종목 탭 (전체/개별 종목) | High | `StockTab.tsx` | Pending |
| FR-02 | 주식별 수익 추이: 기간 필터 6M/1Y/전체 | High | `PeriodFilter.tsx` (재사용) | Pending |
| FR-03 | 멀티라인 차트: 전체 탭 시 모든 종목 라인 표시 | High | `StockProfitChart.tsx` | Pending |
| FR-04 | 멀티라인 차트: 개별 탭 시 해당 종목만 표시 | High | `StockProfitChart.tsx` | Pending |
| FR-05 | 멀티라인 차트: 종목별 고유 색상, dot={false}, hover 툴팁 | High | `StockProfitChart.tsx` | Pending |
| FR-06 | 평균단가 기준선 ReferenceLine y=0 (수익률 기준) | Medium | `StockProfitChart.tsx` | Pending |
| FR-07 | 종목별 평가손익 카드: 수익률%, 평가손익 금액 (3열 그리드) | High | `StockPnLCard.tsx` | Pending |
| FR-08 | 실시간 갱신: 페이지 진입 즉시 1회 현재가 조회 | Medium | `DashboardClientShell.tsx` | Pending |
| FR-09 | 실시간 갱신: 60초 interval setInterval | Medium | `DashboardClientShell.tsx` | Pending |
| FR-10 | REALTIME 배지 + 마지막 갱신 시각 표시 | Medium | `DashboardClientShell.tsx` | Pending |
| FR-11 | 갱신된 priceMap → KpiCardGroup, StockPnLCard, MonthlyProfitChart에 전달 | High | `DashboardClientShell.tsx` | Pending |

### 3.2 Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-01 | 주식별 탭 "전체" → 모든 종목 라인 표시 |
| AC-02 | 개별 종목 탭 선택 → 해당 종목 라인만 표시 |
| AC-03 | 기간 필터 6M 선택 → 최근 6개월 데이터만 표시 |
| AC-04 | StockPnLCard: 수익률%, 평가손익 금액 정확히 표시 |
| AC-05 | 페이지 진입 시 현재가 로딩 → KPI 수치 갱신 |
| AC-06 | 60초 후 현재가 재조회 → REALTIME 배지 시각 업데이트 |
| AC-07 | 보유 종목 없을 때 빈 상태 UI 표시 |

---

## 4. Architecture

### 4.1 컴포넌트 트리

```
DashboardClientShell (완성)
  ├─ priceMap: Record<ticker, number>  ← setInterval 갱신
  ├─ (KpiCardGroup props에 priceMap 전달)
  └─ StockProfitSection
       ├─ StockTab        (useState: 'ALL' | ticker)
       ├─ PeriodFilter    (재사용)
       ├─ StockProfitChart (LineChart 멀티라인)
       └─ StockPnLCard × N (3열 그리드)
```

### 4.2 신규 파일 목록

```
src/components/dashboard/
  StockTab.tsx                   ← 신규
  StockProfitChart.tsx           ← 신규
  StockPnLCard.tsx               ← 신규
  DashboardClientShell.tsx       ← 05-02에서 skeleton → 여기서 완성
src/__tests__/components/dashboard/
  StockProfitChart.test.tsx      ← 신규
  StockPnLCard.test.tsx          ← 신규
  DashboardClientShell.test.tsx  ← 신규 (실시간 갱신 mock 포함)
```

### 4.3 실시간 갱신 패턴

```typescript
// DashboardClientShell.tsx
useEffect(() => {
  const fetchPrices = async () => {
    const res = await fetch('/api/prices')
    const data = await res.json()
    setPriceMap(data.prices)
    setLastUpdated(new Date())
  }
  fetchPrices()  // 진입 즉시 1회
  const interval = setInterval(fetchPrices, 60_000)
  return () => clearInterval(interval)
}, [])
```

### 4.4 Recharts 컴포넌트 상세

| 차트 | Recharts | 주요 설정 |
|------|----------|---------|
| 주식별 수익 추이 | `LineChart` + `Line` × N | 종목별 stroke 색상, `dot={false}`, `ReferenceLine y={0}` |

---

## 5. Next Steps

1. [ ] `05-01-dashboard-infra`, `05-02-dashboard-kpi` 완료 후 착수
2. [ ] `/pdca design 05-04-dashboard-stock-realtime`
