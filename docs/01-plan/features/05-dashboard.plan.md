# 05-dashboard Planning Document

> **Summary**: 투자 대시보드 — KPI 카드, 파이차트, 라인차트, 수익 바차트, 주식별 차트, 최근 거래
>
> **Project**: investlog
> **Version**: 0.2.0
> **Author**: dev
> **Date**: 2026-03-11
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

투자 내역의 전체 현황을 시각화하는 메인 대시보드를 구현한다.
실시간 주가 반영, 수익률 계산, 멀티 차트로 투자 성과를 한눈에 파악할 수 있다.

### 1.2 Background

와이어프레임의 대시보드는 다크 배경(--ink)에 에디토리얼 타이포그래피와
금색(--accent) 포인트 컬러로 구성된 고급스러운 UI이다.
Recharts 라이브러리를 사용하되 wireframe의 커스텀 SVG 차트 스타일을 최대한 재현한다.
모든 차트 데이터는 `lib/calculations.ts`의 계산 함수에서 도출된다.

### 1.3 Related Documents

- Prerequisites: `01-foundation`, `03-stocks`, `04-transactions` (구현 완료)
- References: `references/PLAN.md § 4-2, § 10`, `references/wireframe.html #screen-dashboard`

---

## 2. Scope

### 2.1 In Scope

- [ ] `/dashboard` 페이지 — 대시보드 메인 (인증 보호)
- [ ] **섹션 1: 요약 KPI 카드** (4개)
  - 총 투자금 (BUY.amount 합계)
  - 실현 손익 (SELL - 매입원가, 평균법)
  - 배당 수익 (DIVIDEND.amount 합계)
  - 총 수익률 ((실현손익 + 배당) / 총투자금 × 100)
- [ ] **섹션 2: 포트폴리오 비중** — 도넛 파이차트 + 종목별 리스트
- [ ] **섹션 3: 일별 잔고 추이** — 에어리어 라인차트 (누적 BUY - SELL)
- [ ] **섹션 4: 월별 손익 현황** — 매수/매도/배당 그룹 바차트
- [ ] **섹션 5: 최근 거래** — 미니 테이블 최근 5건 + "전체 보기 →"
- [ ] **섹션 6: 월별 수익 추이** — 실시간 배지 + 기간 필터 (3M/6M/1Y/전체) + 수익/손실 상하 바차트 + 연간 요약 사이드바
- [ ] **섹션 7: 주식별 수익 추이** — 종목 탭 + 기간 필터 + 멀티라인 차트 + 종목별 평가손익 카드
- [ ] 실시간 주가 갱신: 진입 시 1회 + 60초 interval
- [ ] Nav 바: 대시보드/주식상품/거래내역/로그아웃

### 2.2 Out of Scope

- 포트폴리오 시뮬레이션
- 종목별 상세 분석 페이지
- 알림 / 목표 수익률 설정
- 다중 포트폴리오

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Implementation File(s) | Calc Function | Status |
|----|-------------|----------|----------------------|---------------|--------|
| FR-01 | KPI: 총 투자금 = SUM(BUY.amount) | High | `KpiCard.tsx` | `calcTotalInvested` | Pending |
| FR-02 | KPI: 실현 손익 = SUM(SELL.amount) - SUM(SELL 시점 평균매입원가 × 수량) | High | `KpiCard.tsx` | `calcRealizedPnL` | Pending |
| FR-03 | KPI: 배당 수익 = SUM(DIVIDEND.amount) | High | `KpiCard.tsx` | `calcDividendIncome` | Pending |
| FR-04 | KPI: 총 수익률 = (실현손익 + 배당) / 총투자금 × 100 | High | `KpiCard.tsx` | `calcTotalReturn` | Pending |
| FR-05 | 포트폴리오 파이차트: 종목별 보유금액 비중, 도넛 형태 SVG | High | `PortfolioPieChart.tsx` | `calcWeightByStock` | Pending |
| FR-06 | 파이차트 하단 리스트: 종목명, 비중(%), 보유금액 | High | `HoldingsList.tsx` | `calcWeightByStock` | Pending |
| FR-07 | 일별 잔고 추이: 날짜 정렬 후 누적 BUY - SELL 계산, 에어리어 그래디언트 | High | `DailyBalanceChart.tsx` | `calcDailyBalance` | Pending |
| FR-08 | 월별 손익 바차트: 월별 BUY/SELL/DIVIDEND 금액 그룹 바, 범례 | High | `MonthlyBreakdownChart.tsx` | `calcMonthlyBreakdown` (신규) | Pending |
| FR-09 | 최근 거래 미니 테이블: 날짜/유형chip/종목/금액, 최근 5건 | High | `RecentTransactions.tsx` | — (API 직접) | Pending |
| FR-10 | 월별 수익 추이: 실현손익 + 배당 수익 상하 바차트 (양수↑ / 음수↓) | High | `MonthlyProfitChart.tsx` | `calcMonthlyPnL` (신규) | Pending |
| FR-11 | 월별 수익 추이: 기간 필터 3M/6M/1Y/전체 토글 버튼 | High | `PeriodFilter.tsx` | — | Pending |
| FR-12a | 월별 수익 추이: 과거 월별 실현손익 + 배당 집계 | High | `MonthlyProfitChart.tsx` | `calcMonthlyPnL` | Pending |
| FR-12b | 월별 수익 추이: 현재월 미실현 수익 = (현재가 - 평균매수가) × 보유수량 | High | `MonthlyProfitChart.tsx` | `calcUnrealizedPnL` (신규) | Pending |
| FR-13 | 월별 수익 추이: REALTIME 배지 + 60초 자동 갱신 | Medium | `MonthlyProfitChart.tsx` | — (useEffect/setInterval) | Pending |
| FR-14 | 월별 수익 추이: 연간 요약 사이드바 (연간 총수익, 최고수익월, 손실월 수, 배당포함 수익률) | High | `YearlySummary.tsx` | `calcMonthlyPnL` | Pending |
| FR-15 | 주식별 수익 추이: 종목 탭 (전체/개별 종목) + 기간 필터 6M/1Y/전체 | High | `StockTab.tsx`, `PeriodFilter.tsx` | — | Pending |
| FR-16a | 주식별 수익 추이: 멀티라인 차트 렌더링 (종목별 고유 색상 Line) | High | `StockProfitChart.tsx` | — (Recharts LineChart) | Pending |
| FR-16b | 주식별 수익 추이: 종목별 월말 종가 기반 누적 수익률 데이터 변환 | High | `StockProfitChart.tsx` | `calcStockCumulativeReturn` (신규) | Pending |
| FR-16c | 주식별 수익 추이: 종목 탭 선택 시 해당 종목만 필터링 | High | `StockProfitChart.tsx` | — (useState) | Pending |
| FR-17a | 주식별 수익 추이: `/api/stocks/[ticker]/history` 엔드포인트 구현 | High | `src/app/api/stocks/[ticker]/history/route.ts` | `getHistorical` (yahoo.ts) | Pending |
| FR-17b | 주식별 수익 추이: historical API 응답 캐싱 (revalidate: 3600) | Medium | `src/app/api/stocks/[ticker]/history/route.ts` | — | Pending |
| FR-18 | 주식별 수익 추이: 매수 평균단가 기준선 (zero line = 매수가) | Medium | `StockProfitChart.tsx` | — (ReferenceLine y=0) | Pending |
| FR-19 | 주식별 수익 추이: 종목별 평가손익 카드 (수익률%, 평가손익 금액) | High | `StockPnLCard.tsx` | `calcUnrealizedPnL` | Pending |
| FR-20 | 실시간 주가: 진입 시 1회 조회 + 60초 interval 갱신 | Medium | `DashboardClientShell.tsx` | — (setInterval) | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 대시보드 초기 로딩 3초 이내 | 브라우저 Performance 탭 |
| Performance | 차트 데이터 서버 컴포넌트에서 초기 계산 | 코드 리뷰 |
| Performance | Yahoo Historical API revalidate: 3600 캐싱 | Next.js 응답 헤더 확인 |
| Design | wireframe.html 대시보드 화면 95% 이상 재현 | 시각 비교 |
| Design | 다크 배경 (#0a0a08), 금색 포인트 (#c8a96e), 에디토리얼 타이포 | 시각 비교 |
| UX | 차트 hover 툴팁 표시 | 수동 테스트 |
| UX | 데이터 없을 때 각 섹션 빈 상태 UI 표시 | 수동 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] KPI 카드 4개 실제 데이터 표시
- [ ] 파이차트 종목별 비중 정확
- [ ] 일별 잔고 추이 차트 동작
- [ ] 월별 손익 바차트 동작
- [ ] 월별 수익 추이 기간 필터 동작
- [ ] 주식별 멀티라인 차트 동작
- [ ] 실시간 갱신 동작

### 4.2 Quality Criteria

- [ ] Zero lint errors
- [ ] Recharts 반응형 (ResponsiveContainer 사용)
- [ ] 데이터 없을 때 빈 상태 UI

### 4.3 Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-01 | 로그인 후 `/dashboard` 진입 → KPI 카드 4개 모두 실제 DB 데이터 기반 수치 표시 |
| AC-02 | 거래 내역이 없을 때 KPI 값 모두 0 표시, 빈 상태 메시지 표시 |
| AC-03 | 파이차트 hover → 해당 종목 비중(%), 금액 툴팁 표시 |
| AC-04 | 파이차트 하단 리스트 종목 수 = 보유 종목 수 |
| AC-05 | 일별 잔고 추이 차트 x축: 날짜, y축: 누적 잔고 금액 표시 |
| AC-06 | 월별 손익 바차트: BUY(dark green), SELL(gold-brown), DIVIDEND(blue) 3색 그룹 바 |
| AC-07 | 최근 거래 테이블 5건 이하 표시, "전체 보기 →" 클릭 시 `/dashboard/transactions` 이동 |
| AC-08 | 월별 수익 추이: 기간 필터 버튼(3M/6M/1Y/전체) 선택 시 차트 데이터 필터링 |
| AC-09 | 월별 수익 추이: 양수 바 = green, 음수 바 = red, y=0 기준선 표시 |
| AC-10 | 월별 수익 추이: 연간 요약 사이드바 — 연간 총수익/최고수익월/손실월 수 표시 |
| AC-11 | 주식별 수익 추이: 종목 탭 "전체" 선택 시 모든 종목 라인 표시 |
| AC-12 | 주식별 수익 추이: 개별 종목 탭 선택 시 해당 종목 라인만 표시 |
| AC-13 | 주식별 수익 추이: 평가손익 카드 — 수익률(%), 평가손익 금액 표시 |
| AC-14 | 실시간 갱신: 페이지 진입 1회 + 60초마다 현재가 재조회, KPI/차트 반영 |
| AC-15 | REALTIME 배지: 마지막 갱신 시각 표시 |

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Yahoo Historical API 속도 느림 | Medium | High | `next: { revalidate: 3600 }` 캐싱, 로딩 스켈레톤 |
| Recharts 스타일 커스터마이징 한계 | Medium | Medium | SVG 직접 렌더링 혼용, className 오버라이드 |
| 실현 손익 계산 복잡성 (평균법) | High | Medium | `calculations.ts` 단위 테스트, FIFO 대신 평균법 선택 |
| 복수 통화 환산 | Medium | High | 이번 버전: 원화 기준 환산 생략, 통화별 분리 표시 |
| 차트 컴포넌트 수 많음 (14개+) | Medium | Medium | Wave별 구현, 독립 단위로 분리 |

---

## 6. Architecture Considerations

### 6.1 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 차트 라이브러리 | Recharts / Chart.js / D3 | Recharts | React 친화적, 반응형, 커스터마이징 |
| 데이터 페칭 | Server Component / Client SWR | 혼합 | 초기 데이터 서버, 실시간 갱신 클라이언트 |
| 실시간 갱신 | SWR / React Query / setInterval | setInterval + useState | 의존성 최소화, 단순 구현 |
| 손익 계산 위치 | 클라이언트 / 서버 | 서버 | DB 데이터 직접 계산, 클라이언트 부담 감소 |

### 6.2 대시보드 레이아웃 구조

```
DASHBOARD (page.tsx — Server Component)
└── DashboardClientShell (Client — 실시간 갱신 허브)
    ├── KpiCardGroup
    │   └── KpiCard × 4 (총투자금, 실현손익, 배당수익, 총수익률)
    ├── dash-grid (1fr + 360px)
    │   ├── DailyBalanceChart (AreaChart)
    │   └── PortfolioSection
    │       ├── PortfolioPieChart (PieChart 도넛)
    │       └── HoldingsList
    ├── dash-grid2 (1fr + 1fr)
    │   ├── MonthlyBreakdownChart (BarChart 그룹)
    │   └── RecentTransactions (미니 테이블)
    ├── MonthlyProfitSection (full width)
    │   ├── PeriodFilter (3M/6M/1Y/전체)
    │   ├── MonthlyProfitChart (BarChart 상하)
    │   └── YearlySummary (사이드바)
    └── StockProfitSection (full width)
        ├── StockTab + PeriodFilter
        ├── StockProfitChart (LineChart 멀티라인)
        └── StockPnLCard × N (3열 그리드)
```

### 6.3 컬러 시스템 (wireframe 기반)

| 용도 | 색상 |
|------|------|
| 수익/양수 | `#6bba8a` (green) |
| 손실/음수 | `#d07070` (red) |
| 배당 | `#6898cc` (blue) |
| 매수 | `#3d6b4f` (dark green) |
| 매도 | `#8a7248` (gold-brown) |
| 포인트 | `#c8a96e` (accent) |
| 배경 | `#0a0a08` (ink) |

### 6.4 서버/클라이언트 컴포넌트 분류

| 컴포넌트 | 타입 | 이유 |
|---------|------|------|
| `src/app/dashboard/page.tsx` | Server | 초기 데이터 fetch (DB 직접) |
| `DashboardClientShell.tsx` | Client | 실시간 갱신 setInterval |
| `KpiCardGroup.tsx` | Client | 실시간 주가 반영 |
| `KpiCard.tsx` | Client | props 표시 |
| `PortfolioPieChart.tsx` | Client | Recharts (브라우저 전용) |
| `HoldingsList.tsx` | Client | Recharts 연동 |
| `DailyBalanceChart.tsx` | Client | Recharts AreaChart |
| `MonthlyBreakdownChart.tsx` | Client | Recharts BarChart |
| `RecentTransactions.tsx` | Client | "전체 보기" router.push |
| `PeriodFilter.tsx` | Client | useState 선택 상태 |
| `MonthlyProfitChart.tsx` | Client | Recharts + setInterval |
| `YearlySummary.tsx` | Client | 계산된 props 표시 |
| `StockTab.tsx` | Client | useState 탭 상태 |
| `StockProfitChart.tsx` | Client | Recharts LineChart |
| `StockPnLCard.tsx` | Client | props 표시 |

---

## 7. 계산 로직 상세

### 7.1 기존 함수 (calculations.ts — 재사용)

```
# calcTotalInvested(transactions) → number
= SUM(BUY.amount)

# calcRealizedPnL(transactions) → number
= SUM(SELL.amount - SELL.quantity × 평균매수가[ticker])

# calcDividendIncome(transactions) → number
= SUM(DIVIDEND.amount)

# calcTotalReturn(transactions) → number
= (실현손익 + 배당) / 총투자금 × 100

# calcWeightByStock(transactions) → Record<stock_id, number>
= 종목별 BUY.amount 비중 (%)

# calcDailyBalance(transactions) → { date, balance }[]
= 날짜순 누적 BUY - SELL
```

### 7.2 신규 함수 (calculations.ts에 추가)

```
# calcMonthlyBreakdown(transactions) → { month, buy, sell, dividend }[]
= 월별 BUY/SELL/DIVIDEND 금액 집계 (FR-08 용)

# calcMonthlyPnL(transactions) → { month, pnl, dividend }[]
= 월별 실현손익 + 배당 (FR-10, FR-12a 용)

# calcUnrealizedPnL(transactions, priceMap) → { stock_id, pnl, pnlRate }
= (현재가 - 평균매수가) × 잔여수량 (FR-12b, FR-19 용)

# calcStockCumulativeReturn(historicalPrices, avgBuyPrice) → { month, returnRate }[]
= (월말종가 - 평균매수가) / 평균매수가 × 100 (FR-16b 용)
```

---

## 8. API Requirements

### 8.1 GET `/api/dashboard/summary`

**목적**: KPI 4개 값 + 포트폴리오 비중 서버사이드 일괄 계산

**Query Parameters**: 없음 (JWT 인증 필요)

**Response Schema**:
```json
{
  "kpi": {
    "totalInvested": number,
    "realizedPnL": number,
    "dividendIncome": number,
    "totalReturn": number
  },
  "portfolio": [
    { "stock_id": string, "ticker": string, "name": string, "weight": number, "amount": number }
  ]
}
```

**Error Codes**: `401 UNAUTHORIZED`, `500 INTERNAL_ERROR`

**사용 함수**: `calcTotalInvested`, `calcRealizedPnL`, `calcDividendIncome`, `calcTotalReturn`, `calcWeightByStock`

---

### 8.2 GET `/api/dashboard/chart-data`

**목적**: 일별 잔고, 월별 손익 현황, 월별 수익 추이 통합 데이터

**Query Parameters**: 없음 (JWT 인증 필요)

**Response Schema**:
```json
{
  "dailyBalance": [{ "date": string, "balance": number }],
  "monthlyBreakdown": [{ "month": string, "buy": number, "sell": number, "dividend": number }],
  "monthlyPnL": [{ "month": string, "pnl": number, "dividend": number }]
}
```

**Error Codes**: `401 UNAUTHORIZED`, `500 INTERNAL_ERROR`

**사용 함수**: `calcDailyBalance`, `calcMonthlyBreakdown`, `calcMonthlyPnL`

---

### 8.3 GET `/api/stocks/[ticker]/history`

**목적**: 종목별 과거 월말 종가 조회 (Yahoo Finance historical)

**Query Parameters**:
- `period`: `"6M"` | `"1Y"` | `"ALL"` (기본값: `"1Y"`)

**Response Schema**:
```json
{
  "ticker": string,
  "history": [{ "month": string, "closePrice": number }]
}
```

**Error Codes**: `400 INVALID_TICKER`, `404 NOT_FOUND`, `500 YAHOO_API_ERROR`

**캐싱**: `next: { revalidate: 3600 }` (1시간)

**사용 함수**: `getHistorical(ticker, from, to, 'monthly')` (yahoo.ts)

---

## 9. Implementation Units & Wave Plan

### 9.1 구현 단위 (U1~U7)

| Unit | 섹션 | 컴포넌트 파일 | 데이터 소스 | 신규 계산 함수 |
|------|------|------------|-----------|-------------|
| U1 | KPI 카드 | `KpiCardGroup.tsx`, `KpiCard.tsx` | `/api/dashboard/summary` | — |
| U2 | 포트폴리오 비중 | `PortfolioPieChart.tsx`, `HoldingsList.tsx` | `/api/dashboard/summary` | — |
| U3 | 최근 거래 | `RecentTransactions.tsx` | `/api/transactions?limit=5` | — |
| U4 | 일별 잔고 추이 | `DailyBalanceChart.tsx` | `/api/dashboard/chart-data` | — |
| U5 | 월별 손익 현황 | `MonthlyBreakdownChart.tsx` | `/api/dashboard/chart-data` | `calcMonthlyBreakdown` |
| U6 | 월별 수익 추이 | `MonthlyProfitChart.tsx`, `YearlySummary.tsx`, `PeriodFilter.tsx` | `/api/dashboard/chart-data` | `calcMonthlyPnL`, `calcUnrealizedPnL` |
| U7 | 주식별 수익 추이 | `StockProfitChart.tsx`, `StockTab.tsx`, `StockPnLCard.tsx` | `/api/stocks/[ticker]/history` | `calcStockCumulativeReturn`, `calcUnrealizedPnL` |

### 9.2 Wave Plan (의존성 기반)

```
Wave 1 (병렬 구현):
  Backend:  /api/dashboard/summary + /api/dashboard/chart-data + calculations 신규 함수
  Frontend: U1(KPI) + U2(파이차트) + U3(최근거래)
  → 독립적, 공통 API 1개로 커버

Wave 2 (Wave 1 완료 후, 병렬):
  Frontend: U4(일별잔고차트) + U5(월별손익차트) + U6(월별수익추이)
  → chart-data API 필요 (Wave 1 Backend 완료 전제)

Wave 3 (Wave 2 완료 후):
  Backend:  /api/stocks/[ticker]/history
  Frontend: U7(주식별수익추이) + 실시간갱신(DashboardClientShell setInterval)
  → Yahoo Historical API 필요
```

### 9.3 의존성 그래프

```
[calculations 신규 함수] ──→ [/api/dashboard/summary] ──→ [U1, U2]
                         └──→ [/api/dashboard/chart-data] ──→ [U4, U5, U6]
[yahoo.ts.getHistorical]  ──→ [/api/stocks/[ticker]/history] ──→ [U7]
[/api/transactions]        ──→ [U3]
[/api/stocks]              ──→ [DashboardClientShell 실시간 갱신]
```

---

## 10. Technical Details

### 10.1 Recharts 컴포넌트 매핑

| 섹션 | Recharts 컴포넌트 | 주요 설정 |
|------|-----------------|---------|
| 포트폴리오 비중 | `PieChart` + `Pie` | `innerRadius={60}` (도넛), `Cell` 커스텀 컬러 |
| 일별 잔고 추이 | `AreaChart` + `Area` | `LinearGradient` fill, `stroke="#c8a96e"` |
| 월별 손익 현황 | `BarChart` + `Bar` × 3 | 나란히 배치 (stackId 없음), 범례 |
| 월별 수익 추이 | `BarChart` + `Bar` + `ReferenceLine` | `y={0}` 기준선, 양수/음수 `Cell` 색상 분기 |
| 주식별 수익 추이 | `LineChart` + `Line` × N | 종목별 고유 색상, `dot={false}` |

공통: 모든 차트 `<ResponsiveContainer width="100%" height={N}>`으로 래핑

### 10.2 상태 관리 패턴

```
DashboardClientShell (최상위 Client Component)
├── priceMap: Record<ticker, number>  ← setInterval 60초 갱신
├── isLoading: boolean
└── Props로 하위 컴포넌트에 전달

PeriodFilter (독립 상태)
└── selectedPeriod: '3M' | '6M' | '1Y' | 'ALL'  ← useState

StockTab (독립 상태)
└── selectedStock: string  ← useState ('ALL' 또는 ticker)
```

### 10.3 신규 TypeScript 타입 (types/index.ts 추가)

```typescript
type DashboardSummary = {
  kpi: { totalInvested: number; realizedPnL: number; dividendIncome: number; totalReturn: number }
  portfolio: PortfolioItem[]
}
type PortfolioItem = { stock_id: string; ticker: string; name: string; weight: number; amount: number }
type DailyBalancePoint = { date: string; balance: number }
type MonthlyBreakdown = { month: string; buy: number; sell: number; dividend: number }
type MonthlyPnL = { month: string; pnl: number; dividend: number }
type StockHistoryPoint = { month: string; closePrice: number }
type UnrealizedPnL = { stock_id: string; ticker: string; pnl: number; pnlRate: number }
```

---

## 11. Next Steps

1. [ ] Write design document (`05-dashboard.design.md`)
2. [ ] `calculations.ts`에 신규 4개 함수 추가 + 단위 테스트
3. [ ] Recharts 설치 확인 (`npm list recharts`)
4. [ ] Wave 1 → Wave 2 → Wave 3 순서로 구현

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-10 | Initial draft | dev |
| 0.2 | 2026-03-11 | FR 세분화, AC 추가, API 스펙, Wave Plan, 기술 상세화 | dev |
