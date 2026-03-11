# 05-01-dashboard-infra Design Document

> **Summary**: 대시보드 기반 인프라 — 계산 함수 4개, TypeScript 타입 7개, API 엔드포인트 3개
>
> **Project**: investlog
> **Version**: 0.1.0
> **Author**: dev
> **Date**: 2026-03-11
> **Status**: Draft
> **Complexity**: medium
> **Planning Doc**: [05-01-dashboard-infra.plan.md](../../01-plan/features/05-01-dashboard-infra.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 대시보드 UI(05-02~05-04)가 의존하는 계산 로직, 타입, API 엔드포인트를 먼저 구현한다
- 기존 `calcRealizedPnL`의 평균단가법(Average Cost Method)을 월별·미실현 손익 계산으로 확장한다
- Next.js App Router Route Handler 패턴을 유지하며 JWT cookie 인증을 적용한다
- Yahoo Finance `getHistorical` 함수를 활용해 종목별 월말 종가 이력을 제공한다

### 1.2 Design Principles

- **기존 패턴 일관성**: `verifyJwt` 쿠키 인증, `NextResponse.json({ data })` 응답 포맷 유지
- **순수 함수 우선**: 계산 함수는 부수 효과 없이 입력 → 출력으로 구성, 단위 테스트 용이
- **명시적 타입**: 모든 반환값에 TypeScript 인터페이스 선언

---

## 2. Architecture

### 2.1 Component Diagram

```
Browser / Dashboard UI
        │
        │ GET /api/dashboard/summary
        │ GET /api/dashboard/chart-data
        │ GET /api/stocks/[ticker]/history
        ▼
Next.js App Router (Route Handlers)
   ├── src/app/api/dashboard/summary/route.ts
   ├── src/app/api/dashboard/chart-data/route.ts
   └── src/app/api/stocks/[ticker]/history/route.ts
        │                          │
        ▼                          ▼
src/lib/transactions.ts      src/lib/yahoo.ts
src/lib/calculations.ts      getHistorical()
(신규 함수 4개 추가)
        │
        ▼
Supabase (transactions, stocks 테이블)
```

### 2.2 Data Flow

```
GET /api/dashboard/summary:
  verifyJwt → getTransactions() → calc*(transactions) → stocks JOIN → DashboardSummary 응답

GET /api/dashboard/chart-data:
  verifyJwt → getTransactions() → calcDailyBalance + calcMonthlyBreakdown + calcMonthlyPnL → 통합 응답

GET /api/stocks/[ticker]/history:
  verifyJwt → period 검증 → getHistorical(ticker, from, to, '1mo') → StockHistoryPoint[] 응답
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| summary/route.ts | `lib/transactions`, `lib/calculations`, `lib/auth` | KPI + 포트폴리오 비중 |
| chart-data/route.ts | `lib/transactions`, `lib/calculations`, `lib/auth` | 차트 데이터 통합 |
| history/route.ts | `lib/yahoo`, `lib/auth` | Yahoo Finance 월별 종가 |
| calculations.ts (신규) | `src/types` (Transaction, Stock, PriceMap) | 순수 계산 함수 |

---

## 3. Data Model

### 3.1 신규 타입 정의 (src/types/index.ts 추가)

```typescript
// ============================================================
// 05-01-dashboard-infra 추가 타입
// ============================================================

/** GET /api/dashboard/summary 응답 최상위 구조 */
export interface DashboardSummary {
  kpi: {
    totalInvested: number;    // 누적 매수 총액 (BUY amount 합계)
    realizedPnL: number;      // 실현 손익 (평균단가법)
    dividendIncome: number;   // 누적 배당 수입 (DIVIDEND amount 합계)
    totalReturn: number;      // 실현손익 + 배당 합계
  };
  portfolio: PortfolioItem[]; // 보유 종목별 비중 배열
}

/** 포트폴리오 비중 항목 (DashboardSummary.portfolio 원소) */
export interface PortfolioItem {
  stock_id: string;   // UUID (stocks.id FK)
  ticker: string;     // Yahoo Finance 티커
  name: string;       // 종목명
  weight: number;     // 투자 비중 (%) — 소수점 2자리
  amount: number;     // 해당 종목 현재 보유 평가액 (매수 누적 - 매도 누적)
}

/**
 * 일별 잔고 포인트 (대시보드 차트용)
 * 기존 DailyBalance와 동일 구조이나 대시보드 도메인 의미를 명시하기 위해 별도 선언.
 */
export interface DailyBalancePoint {
  date: string;    // YYYY-MM-DD (KST 기준)
  balance: number; // 해당일 누적 잔고 (매수 누적 - 매도 누적)
}

/** 월별 거래 유형별 금액 집계 (calcMonthlyBreakdown 반환 원소) */
export interface MonthlyBreakdown {
  month: string;     // YYYY-MM
  buy: number;       // 해당 월 BUY amount 합계
  sell: number;      // 해당 월 SELL amount 합계
  dividend: number;  // 해당 월 DIVIDEND amount 합계
}

/** 월별 손익 집계 (calcMonthlyPnL 반환 원소) */
export interface MonthlyPnL {
  month: string;    // YYYY-MM
  pnl: number;      // 해당 월 실현 손익 (평균단가법)
  dividend: number; // 해당 월 배당 수입
}

/** 종목 월말 종가 포인트 (차트용) */
export interface StockHistoryPoint {
  month: string;      // YYYY-MM
  closePrice: number; // 해당 월 말일 수정 종가 (Stock.currency 기준)
}

/** 종목별 미실현 평가손익 (calcUnrealizedPnL 반환 원소) */
export interface UnrealizedPnL {
  stock_id: string;      // UUID (stocks.id FK)
  ticker: string;        // Yahoo Finance 티커
  avgBuyPrice: number;   // 평균 매수단가 (평균단가법, Stock.currency 기준)
  currentPrice: number;  // 현재가 (PriceMap에서 취득, Stock.currency 기준)
  quantity: number;      // 잔여 보유 수량 (BUY 누계 - SELL 누계)
  unrealizedPnL: number; // (currentPrice - avgBuyPrice) × quantity
  returnRate: number;    // (currentPrice - avgBuyPrice) / avgBuyPrice × 100 (%, 소수점 2자리)
}
```

### 3.2 신규 계산 함수 시그니처 (src/lib/calculations.ts 추가)

```typescript
/**
 * FR-01: 월별 거래 유형별 금액 집계
 * - transactions를 date 필드 기준 YYYY-MM로 그루핑
 * - 각 월의 BUY / SELL / DIVIDEND amount 합산
 * - 결과는 month 오름차순 정렬
 */
export function calcMonthlyBreakdown(transactions: Transaction[]): MonthlyBreakdown[]

/**
 * FR-02: 월별 실현손익 + 배당 집계
 * - 월 단위로 슬라이싱한 거래 배열에 평균단가법 적용
 *   (주의: 전체 누계 컨텍스트에서 해당 월 매도분만 추출)
 * - 해당 월 DIVIDEND amount 합산
 * - 결과는 month 오름차순 정렬
 */
export function calcMonthlyPnL(transactions: Transaction[]): MonthlyPnL[]

/**
 * FR-03: 종목별 미실현 평가손익 계산
 * - priceMap에서 ticker별 현재가 취득 (null이면 해당 종목 결과에서 제외)
 * - 잔여수량 = BUY 누계 - SELL 누계 (0 이하인 종목 제외)
 * - stocks 배열을 외부에서 주입받아 ticker 매핑에 사용
 */
export function calcUnrealizedPnL(
  transactions: Transaction[],
  stocks: Stock[],
  priceMap: PriceMap
): UnrealizedPnL[]

/**
 * FR-04: 종목의 월별 누적 수익률 시계열 생성
 * - returnRate = (closePrice - avgBuyPrice) / avgBuyPrice × 100
 * - avgBuyPrice = 0 인 경우 returnRate = 0 (division by zero 방어)
 */
export function calcStockCumulativeReturn(
  historicalPrices: StockHistoryPoint[],
  avgBuyPrice: number
): Array<{ month: string; returnRate: number }>
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/dashboard/summary` | KPI 4개 + 포트폴리오 비중 | Required |
| GET | `/api/dashboard/chart-data` | 일별잔고 + 월별집계 + 월별손익 | Required |
| GET | `/api/stocks/[ticker]/history` | 종목별 월말 종가 이력 | Required |

### 4.2 GET /api/dashboard/summary

#### 개요

| 항목 | 값 |
|------|-----|
| 경로 | `/api/dashboard/summary` |
| 메서드 | `GET` |
| 인증 | Cookie 기반 JWT (`token` 쿠키) — `verifyJwt` 패턴 적용 |
| 캐싱 | `no-store` (매 요청마다 최신 거래 기준 계산) |
| 구현 파일 | `src/app/api/dashboard/summary/route.ts` |

#### 로직 흐름

```
1. 인증 확인
   cookieStore.get('token') → verifyJwt(token)
   실패 시 → 401 UNAUTHORIZED 반환

2. 거래 데이터 조회
   getTransactions() → Transaction[] (전체)

3. KPI 계산 (기구현 함수 사용)
   totalInvested   = calcTotalInvested(transactions)
   realizedPnL     = calcRealizedPnL(transactions)
   dividendIncome  = calcDividendIncome(transactions)
   totalReturn     = calcTotalReturn(transactions)

4. 포트폴리오 비중 계산
   weightByStock = calcWeightByStock(transactions)
   → Record<stock_id, weight%>

5. stocks JOIN으로 ticker / name 보강
   stock_id 목록 추출 → DB에서 stocks 레코드 조회
   (weight > 0 인 stock_id만 포함 — 전량 매도된 종목 제외)

6. PortfolioItem 배열 조합
   amount = totalInvested × (weight / 100)
   weight 내림차순 정렬

7. DashboardSummary 응답 반환 (200)
```

#### Response 200 OK

```json
{
  "kpi": {
    "totalInvested": 15000000,
    "realizedPnL": 320000,
    "dividendIncome": 85000,
    "totalReturn": 405000
  },
  "portfolio": [
    {
      "stock_id": "a1b2c3d4-0000-0000-0000-000000000001",
      "ticker": "005930.KS",
      "name": "삼성전자",
      "weight": 42.5,
      "amount": 6375000
    },
    {
      "stock_id": "a1b2c3d4-0000-0000-0000-000000000002",
      "ticker": "AAPL",
      "name": "Apple Inc.",
      "weight": 35.0,
      "amount": 5250000
    }
  ]
}
```

#### 에러 응답

| HTTP | Error Code | 발생 조건 |
|------|-----------|-----------|
| `401` | `UNAUTHORIZED` | 쿠키 없음 또는 JWT 검증 실패 |
| `500` | `INTERNAL_ERROR` | DB 조회 실패, 계산 중 예외 |

### 4.3 GET /api/dashboard/chart-data

#### 개요

| 항목 | 내용 |
|------|------|
| 경로 | `GET /api/dashboard/chart-data` |
| 인증 | Cookie JWT, `verifyJwt()` |
| 캐싱 | 없음 (동적 렌더링) |
| 구현 파일 | `src/app/api/dashboard/chart-data/route.ts` |

#### 로직 흐름

```
1. verifyJwt(token) 실패 → 401 반환
2. getTransactions() → Transaction[]
3. calcDailyBalance(transactions)     → DailyBalancePoint[]
4. calcMonthlyBreakdown(transactions) → MonthlyBreakdown[]
5. calcMonthlyPnL(transactions)       → MonthlyPnL[]
6. NextResponse.json({ data: { dailyBalance, monthlyBreakdown, monthlyPnL } }, { status: 200 })
```

#### Response 200 OK

```json
{
  "data": {
    "dailyBalance": [
      { "date": "2025-01-15", "balance": 1500000 },
      { "date": "2025-02-03", "balance": 2300000 }
    ],
    "monthlyBreakdown": [
      { "month": "2025-01", "buy": 1500000, "sell": 0, "dividend": 0 },
      { "month": "2025-02", "buy": 800000, "sell": 0, "dividend": 15000 }
    ],
    "monthlyPnL": [
      { "month": "2025-01", "pnl": 0, "dividend": 0 },
      { "month": "2025-02", "pnl": 0, "dividend": 15000 }
    ]
  }
}
```

#### 에러 응답

| HTTP | Error Code | 발생 조건 |
|------|-----------|-----------|
| `401` | `UNAUTHORIZED` | 쿠키 없음 또는 JWT 검증 실패 |
| `500` | `INTERNAL_ERROR` | DB 조회 실패, 계산 함수 예외 |

### 4.4 GET /api/stocks/[ticker]/history

#### 개요

| 항목 | 내용 |
|------|------|
| 경로 | `GET /api/stocks/[ticker]/history` |
| Path Parameter | `ticker` — Yahoo Finance 티커 심볼 |
| 인증 | Cookie JWT, `verifyJwt()` |
| 캐싱 | `export const revalidate = 3600;` (Next.js ISR, 1시간) |
| 구현 파일 | `src/app/api/stocks/[ticker]/history/route.ts` |

#### Query Parameter

| 파라미터 | 기본값 | 허용값 | 설명 |
|----------|--------|--------|------|
| `period` | `1Y` | `6M`, `1Y`, `ALL` | 조회 기간 |

| period | from | to |
|--------|------|----|
| `6M` | 오늘 기준 6개월 전 | 오늘 |
| `1Y` | 오늘 기준 1년 전 | 오늘 |
| `ALL` | 오늘 기준 5년 전 | 오늘 |

#### 로직 흐름

```
1. verifyJwt(token) 실패 → 401 반환
2. searchParams에서 period 추출 (기본값: '1Y')
3. period가 6M|1Y|ALL이 아닌 경우 → 400 INVALID_PERIOD 반환
4. period → { from, to } 날짜 범위 계산
5. getHistorical(ticker, from, to, '1mo') 호출
   - yahoo-finance2 '1mo' interval → 월별 OHLCV (adjClose 우선)
6. 빈 배열 반환 시 → 404 TICKER_NOT_FOUND 반환
7. HistoricalData[] → StockHistoryPoint[] 변환
   - { month: date.slice(0, 7), closePrice: close }
8. NextResponse.json({ data: { ticker, period, history } }, { status: 200 })
```

#### Response 200 OK

```json
{
  "data": {
    "ticker": "AAPL",
    "period": "1Y",
    "history": [
      { "month": "2024-03", "closePrice": 171.20 },
      { "month": "2024-04", "closePrice": 165.00 },
      { "month": "2025-02", "closePrice": 212.44 }
    ]
  }
}
```

#### 에러 응답

| HTTP | Error Code | 발생 조건 |
|------|-----------|-----------|
| `401` | `UNAUTHORIZED` | 쿠키 없음 또는 JWT 검증 실패 |
| `400` | `INVALID_PERIOD` | period가 `6M\|1Y\|ALL` 외의 값 |
| `404` | `TICKER_NOT_FOUND` | `getHistorical()` 빈 배열 반환 |
| `500` | `INTERNAL_ERROR` | Yahoo Finance 네트워크 오류, 서버 예외 |

---

## 5. UI/UX Design

해당 없음 — 이 피처는 Backend-only (API + 계산 함수 + 타입)

---

## 6. Error Handling

### 6.1 에러 응답 포맷

```json
{ "error": "ERROR_CODE", "message": "사람이 읽을 수 있는 설명" }
// 500 서버 오류
{ "error": "INTERNAL_ERROR" }
```

### 6.2 에러 코드 전체 목록

| HTTP | Error Code | 발생 API | 원인 | 클라이언트 처리 |
|------|-----------|---------|------|----------------|
| 401 | `UNAUTHORIZED` | 전체 | `token` 쿠키 없음 또는 만료·변조 | 로그인 페이지 리다이렉트 |
| 400 | `INVALID_PERIOD` | `/api/stocks/[ticker]/history` | period 쿼리가 `6M\|1Y\|ALL` 이외 | 기본값 `1Y`로 재요청 |
| 404 | `TICKER_NOT_FOUND` | `/api/stocks/[ticker]/history` | `getHistorical()` 빈 배열 | "데이터 없음" 안내, 차트 미렌더링 |
| 500 | `INTERNAL_ERROR` | 전체 | DB 오류, Yahoo Finance 네트워크 오류 | 에러 토스트 + 재시도 버튼 |

### 6.3 history API 설계 노트

`getHistorical()`의 현재 구현이 내부 try-catch로 예외를 빈 배열로 변환하기 때문에, 빈 배열 = ticker 없음으로 간주한다. 구현자가 이 동작에 의존함을 인지해야 한다.

---

## 7. Security Considerations

- [x] 모든 엔드포인트에 `verifyJwt` 쿠키 인증 적용 (FR-10)
- [x] ticker path parameter는 Yahoo Finance로 전달 전 별도 이스케이프 불필요 (yahoo-finance2 라이브러리 처리)
- [x] period 쿼리 파라미터는 허용값 whitelist로 검증
- [ ] HTTPS 강제 적용 (Next.js 배포 설정에서 처리)

---

## 8. Acceptance Criteria

### 8.1 Functional Acceptance Criteria

| ID | Criteria | Verification Method | Priority |
|-------|----------|---------------------|----------|
| AC-01 | Given 2개월 거래 데이터 / When `calcMonthlyBreakdown` 호출 / Then 월별 BUY/SELL/DIVIDEND 금액이 정확히 집계됨 | 단위 테스트 (Vitest) | Must |
| AC-02 | Given BUY 후 SELL 거래 / When `calcMonthlyPnL` 호출 / Then 평균단가법 기준 월별 실현손익 + 배당이 정확히 반환됨 | 단위 테스트 (Vitest) | Must |
| AC-03 | Given BUY 10주 평균가 100, 현재가 120 / When `calcUnrealizedPnL` 호출 / Then unrealizedPnL=200, returnRate=20.00 반환 | 단위 테스트 (Vitest) | Must |
| AC-04 | Given 유효한 JWT / When GET /api/dashboard/summary / Then 200과 함께 kpi 4개(totalInvested, realizedPnL, dividendIncome, totalReturn) + portfolio 배열 반환 | API 통합 테스트 | Must |
| AC-05 | Given 유효한 JWT / When GET /api/dashboard/chart-data / Then 200과 함께 dailyBalance + monthlyBreakdown + monthlyPnL 필드 반환 | API 통합 테스트 | Must |
| AC-06 | Given 유효한 JWT, 유효한 ticker / When GET /api/stocks/AAPL/history?period=1Y / Then 200과 함께 history 배열 반환 | API 통합 테스트 | Must |
| AC-07 | Given JWT 없음 / When 임의 API 접근 / Then 401 UNAUTHORIZED 반환 | API 통합 테스트 | Must |

### 8.2 Non-Functional Acceptance Criteria

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 계산 함수(calcMonthlyBreakdown 등)가 거래 1000건 기준 10ms 이내 처리 | Vitest benchmark |
| Security | JWT 없이 모든 엔드포인트 접근 시 401 반환 | 통합 테스트 |
| Reliability | `getHistorical()` 빈 배열 반환 시 500이 아닌 404로 정확히 응답 | 통합 테스트 |
| Caching | `/api/stocks/[ticker]/history` revalidate=3600 설정 확인 | 코드 리뷰 |

### 8.3 Edge Cases

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| EC-01 | 동일 날짜 여러 거래 | 같은 월(YYYY-MM)로 집계 — buy/sell/dividend 합산 |
| EC-02 | `calcUnrealizedPnL`에서 priceMap 값이 null인 종목 | 해당 종목 결과 배열에서 제외 |
| EC-03 | `calcStockCumulativeReturn`에서 avgBuyPrice=0 | returnRate=0 반환 (division by zero 방어) |
| EC-04 | period=ALL | 5년 range로 `getHistorical` 호출 |
| EC-05 | 같은 종목 여러 달에 걸쳐 분할 매도 | 평균단가법 연속 적용 — 매도 시점마다 잔여 평균단가 기준 손익 계산 |

---

## 9. TDD Test Scenarios

### 9.1 Test Strategy

| 항목 | 내용 |
|------|------|
| Approach | TDD — 계산 함수 구현 전 테스트 먼저 작성 |
| Scope | 계산 함수 단위 테스트 중심, API 엔드포인트 통합 테스트 포함 |
| Coverage Target | 80%+ (계산 함수 100%, API 핸들러 70%+) |
| Test Framework | Vitest |
| 구현 파일 (계산 함수) | `src/__tests__/lib/calculations-dashboard.test.ts` |
| 구현 파일 (API) | `src/__tests__/api/dashboard.test.ts`, `src/__tests__/api/stocks-history.test.ts` |

### 9.2 Test Scenario List

| ID | Target | Description | Input | Expected Output | Priority |
|----|--------|-------------|-------|-----------------|----------|
| TS-01 | `calcMonthlyBreakdown` | 정상 케이스 — 2개월 거래 집계 | 2025-01 BUY 100, SELL 80 / 2025-02 DIVIDEND 10 | `[{month:"2025-01", buy:100, sell:80, dividend:0}, {month:"2025-02", buy:0, sell:0, dividend:10}]` | Critical |
| TS-02 | `calcMonthlyBreakdown` | 빈 배열 입력 | `[]` | `[]` | High |
| TS-03 | `calcMonthlyBreakdown` | DIVIDEND만 있는 거래 | 2025-01 DIVIDEND 50 | `[{month:"2025-01", buy:0, sell:0, dividend:50}]` | High |
| TS-04 | `calcMonthlyPnL` | 정상 케이스 — 매수 후 매도 월별 실현손익 | 2025-01 BUY 10주@100 / 2025-02 SELL 5주@120 | `[{month:"2025-02", pnl:100, dividend:0}]` (pnl=(120-100)×5) | Critical |
| TS-05 | `calcMonthlyPnL` | 배당만 있는 월 | 2025-01 DIVIDEND 30 | `[{month:"2025-01", pnl:0, dividend:30}]` | High |
| TS-06 | `calcMonthlyPnL` | 빈 배열 입력 | `[]` | `[]` | High |
| TS-07 | `calcUnrealizedPnL` | 정상 케이스 — BUY 10주 평균가 100, 현재가 120 | transactions(BUY 10@100), priceMap(AAPL:120) | `[{ticker:"AAPL", avgBuyPrice:100, currentPrice:120, quantity:10, unrealizedPnL:200, returnRate:20.00}]` | Critical |
| TS-08 | `calcUnrealizedPnL` | priceMap에 null 값인 ticker | priceMap(AAPL:null) | 해당 종목 결과 배열에서 제외 | High |
| TS-09 | `calcUnrealizedPnL` | 잔여수량 0인 종목 (전량 매도) | BUY 10주 후 SELL 10주 | 결과 배열에서 제외 | High |
| TS-10 | `calcStockCumulativeReturn` | 정상 케이스 — 3개월 종가 시계열 | avgBuyPrice=100, closePrice=[110,90,120] | `[{returnRate:10}, {returnRate:-10}, {returnRate:20}]` | Critical |
| TS-11 | `calcStockCumulativeReturn` | avgBuyPrice=0 division by zero 방어 | avgBuyPrice=0 | 모든 항목 `returnRate:0` | High |
| TS-12 | `calcStockCumulativeReturn` | 빈 historicalPrices | `[]`, avgBuyPrice=100 | `[]` | Medium |
| TS-13 | `GET /api/dashboard/summary` | 정상 인증 → 200 | 유효 JWT cookie | 200, kpi 4개 필드 + portfolio 배열 존재 | Critical |
| TS-14 | `GET /api/dashboard/summary` | 인증 없음 → 401 | 쿠키 없음 | `{error:"UNAUTHORIZED"}` | Critical |
| TS-15 | `GET /api/dashboard/chart-data` | 정상 인증 → 200 | 유효 JWT cookie | 200, dailyBalance/monthlyBreakdown/monthlyPnL 필드 존재 | Critical |
| TS-16 | `GET /api/dashboard/chart-data` | 인증 없음 → 401 | 쿠키 없음 | `{error:"UNAUTHORIZED"}` | Critical |
| TS-17 | `GET /api/stocks/AAPL/history?period=1Y` | 정상 → 200 | 유효 JWT, 유효 ticker | 200, `{ticker:"AAPL", period:"1Y", history:[...]}` | Critical |
| TS-18 | `GET /api/stocks/AAPL/history?period=INVALID` | 잘못된 period → 400 | period="INVALID" | `{error:"INVALID_PERIOD"}` | High |
| TS-19 | `GET /api/stocks/AAPL/history` | 인증 없음 → 401 | 쿠키 없음 | `{error:"UNAUTHORIZED"}` | Critical |

### 9.3 Edge Cases

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| EC-01 | 동일 날짜 여러 거래 | 같은 월(YYYY-MM)로 집계, buy/sell/dividend 합산 |
| EC-02 | 미래 날짜 거래 포함 | 필터 없이 포함하여 정상 집계 |
| EC-03 | `period=ALL` | 5년 range로 `getHistorical` 호출, 전체 history 반환 |
| EC-04 | 유효하지 않은 ticker, history 빈 배열 | 404 `TICKER_NOT_FOUND` |
| EC-05 | `calcMonthlyPnL` — 같은 종목 분할 매도 (여러 달) | 평균단가법 연속 적용, 매도 시점마다 잔여 평균단가 기준 손익 계산 |

### 9.4 Test Implementation Order

| 순서 | 대상 | 관련 AC | 이유 |
|------|------|---------|------|
| 1 | `calcMonthlyBreakdown` (TS-01~03) | AC-01 | 순수 함수, 의존성 없음, 가장 단순한 집계 |
| 2 | `calcMonthlyPnL` (TS-04~06) | AC-02 | 순수 함수, 평균단가법 핵심 로직 |
| 3 | `calcUnrealizedPnL` (TS-07~09) | AC-03 | 순수 함수, priceMap mock 단순 |
| 4 | `calcStockCumulativeReturn` (TS-10~12) | — | 순수 함수, division by zero 방어 포함 |
| 5 | `GET /api/dashboard/summary` (TS-13~14) | AC-04 | 계산 함수 완료 후 API 테스트 |
| 6 | `GET /api/dashboard/chart-data` (TS-15~16) | AC-05 | summary 패턴 재사용 |
| 7 | `GET /api/stocks/[ticker]/history` (TS-17~19) | AC-06, AC-07 | 독립 엔드포인트, 마지막 검증 |

---

## 10. Implementation Guide

### 10.1 File Structure

```
src/
  types/
    index.ts                     ← 타입 7개 추가 (DashboardSummary 등)
  lib/
    calculations.ts              ← 함수 4개 추가 (calcMonthlyBreakdown 등)
  app/api/
    dashboard/
      summary/route.ts           ← 신규 (GET)
      chart-data/route.ts        ← 신규 (GET)
    stocks/[ticker]/
      history/route.ts           ← 신규 (GET, revalidate=3600)
  __tests__/
    lib/
      calculations-dashboard.test.ts  ← 신규 (TS-01~TS-12)
    api/
      dashboard.test.ts               ← 신규 (TS-13~TS-16)
      stocks-history.test.ts          ← 신규 (TS-17~TS-19)
```

### 10.2 Implementation Order

1. [ ] `src/types/index.ts` — 타입 7개 추가 (FR-05)
2. [ ] `src/__tests__/lib/calculations-dashboard.test.ts` — 단위 테스트 먼저 작성 (TDD)
3. [ ] `src/lib/calculations.ts` — 함수 4개 추가 (FR-01~04)
4. [ ] `src/app/api/dashboard/summary/route.ts` — 신규 (FR-06)
5. [ ] `src/app/api/dashboard/chart-data/route.ts` — 신규 (FR-07)
6. [ ] `src/app/api/stocks/[ticker]/history/route.ts` — 신규 (FR-08, FR-09)
7. [ ] API 통합 테스트 작성 (TS-13~19)

### 10.3 주요 구현 노트

- `calcMonthlyPnL`은 전체 거래 배열을 받아 월별로 분리하되, **평균단가는 전체 누계 컨텍스트**를 유지해야 한다. 월별로 단순 슬라이싱 후 `calcRealizedPnL` 재호출 방식은 평균단가 오류를 야기한다.
- `summary/route.ts`의 portfolio `amount` 필드는 현재가 기반 평가액이 아닌 **매수 기준 금액** (totalInvested × weight / 100)임을 주석으로 명시한다.
- `history/route.ts`는 파일 최상단에 `export const revalidate = 3600;`을 선언한다 (FR-09).

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-11 | Initial draft | dev |
