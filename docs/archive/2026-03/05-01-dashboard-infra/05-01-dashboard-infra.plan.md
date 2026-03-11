# 05-01-dashboard-infra Planning Document

> **Summary**: 대시보드 기반 인프라 — 신규 계산 함수, TypeScript 타입, API 엔드포인트
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

대시보드 UI(05-02~05-04)가 사용할 계산 로직, 타입 정의, API 엔드포인트를 먼저 구현한다.
이 피처가 완료되어야 나머지 대시보드 서브 피처 구현이 가능하다.

### 1.2 Related Documents

- Parent Plan: `docs/01-plan/features/05-dashboard.plan.md`
- Required by: `05-02`, `05-03`, `05-04`
- Depends on: `src/lib/transactions.ts`, `src/lib/yahoo.ts`, `src/types/index.ts` (기구현)

---

## 2. Scope

### 2.1 In Scope

**A. calculations.ts 신규 함수 (4개)**
- [ ] `calcMonthlyBreakdown(transactions)` — 월별 BUY/SELL/DIVIDEND 금액 집계
- [ ] `calcMonthlyPnL(transactions)` — 월별 실현손익 + 배당 집계
- [ ] `calcUnrealizedPnL(transactions, priceMap)` — 미실현 평가손익 계산
- [ ] `calcStockCumulativeReturn(historicalPrices, avgBuyPrice)` — 주식별 누적 수익률

**B. TypeScript 타입 추가 (types/index.ts)**
- [ ] `DashboardSummary`, `PortfolioItem`
- [ ] `DailyBalancePoint`, `MonthlyBreakdown`, `MonthlyPnL`
- [ ] `StockHistoryPoint`, `UnrealizedPnL`

**C. API 엔드포인트 (3개)**
- [ ] `GET /api/dashboard/summary` — KPI + 포트폴리오 비중
- [ ] `GET /api/dashboard/chart-data` — 일별잔고 + 월별손익 + 월별수익추이 통합
- [ ] `GET /api/stocks/[ticker]/history` — 종목별 과거 월말 종가 (Yahoo Historical)

### 2.2 Out of Scope

- UI 컴포넌트 (→ 05-02, 05-03, 05-04)
- 실시간 갱신 로직 (→ 05-04)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | File | Status |
|----|-------------|----------|------|--------|
| FR-01 | `calcMonthlyBreakdown`: 월별 BUY/SELL/DIVIDEND 금액 집계 반환 | High | `src/lib/calculations.ts` | Pending |
| FR-02 | `calcMonthlyPnL`: 월별 (실현손익 + 배당) 반환 | High | `src/lib/calculations.ts` | Pending |
| FR-03 | `calcUnrealizedPnL`: (현재가 - 평균매수가) × 잔여수량 계산 | High | `src/lib/calculations.ts` | Pending |
| FR-04 | `calcStockCumulativeReturn`: (월말종가 - 평균매수가) / 평균매수가 × 100 | High | `src/lib/calculations.ts` | Pending |
| FR-05 | Dashboard 관련 TypeScript 타입 7개 정의 | High | `src/types/index.ts` | Pending |
| FR-06 | `GET /api/dashboard/summary` — KPI 4개 + 포트폴리오 비중 배열 반환 | High | `src/app/api/dashboard/summary/route.ts` | Pending |
| FR-07 | `GET /api/dashboard/chart-data` — dailyBalance + monthlyBreakdown + monthlyPnL 통합 | High | `src/app/api/dashboard/chart-data/route.ts` | Pending |
| FR-08 | `GET /api/stocks/[ticker]/history?period=1Y` — 월말 종가 배열 반환 | High | `src/app/api/stocks/[ticker]/history/route.ts` | Pending |
| FR-09 | `/api/stocks/[ticker]/history` revalidate: 3600 캐싱 | Medium | 위와 동일 | Pending |
| FR-10 | 모든 API에 JWT 인증 (기존 `verifyJwt` 패턴 적용) | High | API routes | Pending |

### 3.2 Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-01 | `calcMonthlyBreakdown` 단위 테스트 통과 — 월별 집계 정확 |
| AC-02 | `calcMonthlyPnL` 단위 테스트 통과 — 실현손익 + 배당 합계 정확 |
| AC-03 | `calcUnrealizedPnL` 단위 테스트 통과 — 잔여수량 × (현재가 - 평균가) 정확 |
| AC-04 | `GET /api/dashboard/summary` 200 응답: kpi 4개 + portfolio 배열 |
| AC-05 | `GET /api/dashboard/chart-data` 200 응답: dailyBalance + monthlyBreakdown + monthlyPnL |
| AC-06 | `GET /api/stocks/[ticker]/history?period=1Y` 200 응답: history 배열 |
| AC-07 | 인증 없이 API 접근 시 401 반환 |

---

## 4. Architecture

### 4.1 신규 파일 목록

```
src/lib/calculations.ts          ← 기존 파일에 함수 추가
src/types/index.ts               ← 기존 파일에 타입 추가
src/app/api/dashboard/
  summary/route.ts               ← 신규
  chart-data/route.ts            ← 신규
src/app/api/stocks/[ticker]/
  history/route.ts               ← 신규
src/__tests__/
  lib/calculations-dashboard.test.ts  ← 신규 (신규 함수 단위 테스트)
```

### 4.2 API 스펙 요약

**GET /api/dashboard/summary**
```json
{ "kpi": { "totalInvested": N, "realizedPnL": N, "dividendIncome": N, "totalReturn": N },
  "portfolio": [{ "stock_id": "", "ticker": "", "name": "", "weight": N, "amount": N }] }
```

**GET /api/dashboard/chart-data**
```json
{ "dailyBalance": [{ "date": "", "balance": N }],
  "monthlyBreakdown": [{ "month": "", "buy": N, "sell": N, "dividend": N }],
  "monthlyPnL": [{ "month": "", "pnl": N, "dividend": N }] }
```

**GET /api/stocks/[ticker]/history?period=6M|1Y|ALL**
```json
{ "ticker": "", "history": [{ "month": "", "closePrice": N }] }
```

---

## 5. Next Steps

1. [ ] `/pdca design 05-01-dashboard-infra`
2. [ ] 구현 완료 후 05-02 착수 가능
