# 05-03-dashboard-charts Planning Document

> **Summary**: 대시보드 차트 섹션 — 일별 잔고 + 월별 손익 + 월별 수익 추이 (Wave 2)
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

대시보드의 메인 차트 구역 3개를 구현한다.
일별 잔고 추이(에어리어), 월별 손익 현황(그룹 바), 월별 수익 추이(상하 바 + 기간 필터 + 연간 요약)로 구성된다.

### 1.2 Related Documents

- Parent Plan: `docs/01-plan/features/05-dashboard.plan.md`
- **Depends on**: `05-01-dashboard-infra` (chart-data API 완료 필요)
- Parallel with: `05-02-dashboard-kpi`

---

## 2. Scope

### 2.1 In Scope

**섹션 3: 일별 잔고 추이**
- [ ] `DailyBalanceChart.tsx` — Recharts AreaChart + LinearGradient

**섹션 4: 월별 손익 현황**
- [ ] `MonthlyBreakdownChart.tsx` — Recharts BarChart 3색 그룹 바 (BUY/SELL/DIVIDEND)

**섹션 6: 월별 수익 추이**
- [ ] `MonthlyProfitChart.tsx` — 양수/음수 상하 바차트 + ReferenceLine(y=0)
- [ ] `PeriodFilter.tsx` — 3M/6M/1Y/전체 토글 버튼
- [ ] `YearlySummary.tsx` — 연간 요약 사이드바 (총수익, 최고수익월, 손실월 수, 배당수익률)

### 2.2 Out of Scope

- KPI / 포트폴리오 / 최근 거래 (→ 05-02)
- 주식별 수익 추이 (→ 05-04)
- 실시간 갱신 (→ 05-04)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Component | Status |
|----|-------------|----------|-----------|--------|
| FR-01 | 일별 잔고 추이: x축 날짜, y축 누적 잔고 금액, 에어리어 그래디언트 | High | `DailyBalanceChart.tsx` | Pending |
| FR-02 | 일별 잔고 추이: hover 툴팁 날짜 + 잔고 표시 | High | `DailyBalanceChart.tsx` | Pending |
| FR-03 | 월별 손익: 월별 BUY(dark green)/SELL(gold-brown)/DIVIDEND(blue) 그룹 바 | High | `MonthlyBreakdownChart.tsx` | Pending |
| FR-04 | 월별 손익: 범례, hover 툴팁 월 + 각 유형 금액 | High | `MonthlyBreakdownChart.tsx` | Pending |
| FR-05 | 월별 수익 추이: 양수 바 green, 음수 바 red, y=0 기준선 | High | `MonthlyProfitChart.tsx` | Pending |
| FR-06 | 월별 수익 추이: 기간 필터 3M/6M/1Y/전체 토글 | High | `PeriodFilter.tsx` | Pending |
| FR-07 | 기간 필터 선택 시 차트 데이터 슬라이싱 | High | `MonthlyProfitChart.tsx` | Pending |
| FR-08 | 연간 요약: 연간 총수익, 최고수익월, 손실월 수, 배당포함 수익률 | High | `YearlySummary.tsx` | Pending |
| FR-09 | 데이터 없을 때 각 차트 빈 상태 UI | Medium | 각 차트 컴포넌트 | Pending |
| FR-10 | 모든 차트 `ResponsiveContainer` 반응형 | High | 각 차트 컴포넌트 | Pending |

### 3.2 Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-01 | 일별 잔고 추이 차트: 거래 날짜 순서대로 x축 표시 |
| AC-02 | 월별 손익 바차트: 3색 그룹 바 올바른 색상 + 범례 표시 |
| AC-03 | 월별 수익 추이: 3M 선택 시 최근 3개월 데이터만 표시 |
| AC-04 | 월별 수익 추이: 양수 월 green, 음수 월 red, y=0 기준선 표시 |
| AC-05 | 연간 요약 사이드바: 총수익/최고수익월/손실월 수 표시 |
| AC-06 | 화면 너비 변화 시 차트 크기 반응형 조정 |

---

## 4. Architecture

### 4.1 컴포넌트 트리 (DashboardClientShell 내부)

```
DashboardClientShell
  ├─ DailyBalanceChart      (AreaChart, ResponsiveContainer)
  ├─ MonthlyBreakdownChart  (BarChart 3 Bar groups)
  └─ MonthlyProfitSection
       ├─ PeriodFilter      (useState: '3M'|'6M'|'1Y'|'ALL')
       ├─ MonthlyProfitChart (BarChart + ReferenceLine y=0)
       └─ YearlySummary
```

### 4.2 신규 파일 목록

```
src/components/dashboard/
  DailyBalanceChart.tsx          ← 신규
  MonthlyBreakdownChart.tsx      ← 신규
  MonthlyProfitChart.tsx         ← 신규
  PeriodFilter.tsx               ← 신규
  YearlySummary.tsx              ← 신규
src/__tests__/components/dashboard/
  DailyBalanceChart.test.tsx     ← 신규
  MonthlyBreakdownChart.test.tsx ← 신규
  MonthlyProfitChart.test.tsx    ← 신규
  PeriodFilter.test.tsx          ← 신규
```

### 4.3 Recharts 컴포넌트 상세

| 차트 | Recharts | 주요 설정 |
|------|----------|---------|
| 일별 잔고 | `AreaChart` + `Area` | `LinearGradient` fill, `stroke="#c8a96e"` |
| 월별 손익 | `BarChart` + `Bar` × 3 | 나란히 배치, `Cell` 컬러 |
| 월별 수익 추이 | `BarChart` + `Bar` + `ReferenceLine` | `y={0}`, 양수/음수 `Cell` 분기 |

---

## 5. Next Steps

1. [ ] `05-01-dashboard-infra` 완료 후 착수 (05-02와 병렬 가능)
2. [ ] `/pdca design 05-03-dashboard-charts`
