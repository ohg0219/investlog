# 05-04-dashboard-stock-realtime Design Document

> **Summary**: 주식별 수익 추이 + 실시간 주가 갱신 (Wave 3)
>
> **Project**: investlog
> **Version**: 0.1.0
> **Author**: dev
> **Date**: 2026-03-11
> **Status**: Draft
> **Complexity**: medium
> **Planning Doc**: [05-04-dashboard-stock-realtime.plan.md](../../01-plan/features/05-04-dashboard-stock-realtime.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- `DashboardClientShell`에 실시간 현재가 갱신 로직(setInterval)을 추가하여 KPI·평가손익 수치를 60초마다 갱신
- `StockPnLCard` — 종목별 평가손익 카드(수익률%, 평가손익 금액)를 3열 그리드로 표시
- `StockProfitChart` — 종목별 수익 추이 멀티라인 차트(Recharts LineChart)
- `StockTab` — 전체/개별 종목 탭 선택 UI
- 실시간 갱신 실패 시 이전 priceMap 유지 + 경고 배지로 사용자 피드백

### 1.2 Design Principles

- **단방향 데이터 흐름**: priceMap은 `DashboardClientShell`에서 생성·관리하고 하위 컴포넌트에 props로 전달
- **점진적 개선**: priceMap이 아직 로드되지 않은 경우 skeleton 상태로 렌더링, 완료 시 실제 값 표시
- **에러 격리**: 실시간 갱신 실패가 기존 정적 섹션(포트폴리오, 차트)에 영향을 주지 않음
- **관심사 분리**: 탭/기간 필터 상태는 `StockProfitSection`이 캡슐화, Shell은 priceMap·lastUpdated만 관리

---

## 2. Architecture

### 2.1 Component Diagram

```
page.tsx (Server Component)
  │
  ├─ fetch /api/dashboard/summary       → summary: DashboardSummary | null
  ├─ fetch /api/transactions            → transactions: TransactionWithStock[] | null
  ├─ fetch /api/dashboard/chart-data   → chartData: ChartData | null
  └─ fetch /api/dashboard/history      → historyData: Record<string, StockHistoryPoint[]> | null
        │
        ▼
DashboardClientShell (Client Component)
  state: priceMap, lastUpdated, isLoading, priceError
  props: { summary, transactions, chartData, historyData }
        │
        ├─ KpiCardGroup
        │     props: { kpi, priceMap }          ← priceMap 추가
        │
        ├─ PortfolioPieChart / HoldingsList
        │
        ├─ DailyBalanceChart / MonthlyBreakdownChart
        │
        ├─ RecentTransactions
        │
        ├─ MonthlyProfitSection
        │
        └─ StockProfitSection  (Client Component, 신규)
              │
              ├─ StockTab
              │     props: { tickers: string[]; value: string; onChange: (t: string) => void }
              │
              ├─ PeriodFilter (재사용)
              │     props: { value: Period; onChange: (p: Period) => void }
              │
              ├─ StockProfitChart (신규)
              │     props: { historyData: Record<string, StockHistoryPoint[]>; activeTicker: string; period: Period }
              │     renders: LineChart + Line×N + ReferenceLine(y=0) + Tooltip + Legend
              │
              └─ div.grid-cols-3
                    └─ StockPnLCard × N  (신규)
                          props: { item: UnrealizedPnL }
```

### 2.2 Data Flow

```
[page.tsx] Promise.all([summaryFetch, transactionsFetch, chartDataFetch, historyFetch])
    │
    │  historyData shape: Record<ticker, StockHistoryPoint[]>
    │
    ▼
DashboardClientShell
    │  useEffect → fetch('/api/prices') → setPriceMap / setLastUpdated
    │            → setInterval(60_000)  → 반복 갱신
    │
    ├─ priceMap  ───► KpiCardGroup (평가손익 KPI 갱신)
    │            ───► StockProfitSection → StockPnLCard (실시간 수익률/평가손익)
    │
    └─ historyData ─► StockProfitSection → StockProfitChart (월말 종가 추이)
```

### 2.3 신규 파일 목록

| 파일 경로 | 역할 |
|-----------|------|
| `src/components/dashboard/StockPnLCard.tsx` | 종목별 평가손익 카드 |
| `src/components/dashboard/StockProfitChart.tsx` | 멀티라인 수익 추이 차트 |
| `src/components/dashboard/StockTab.tsx` | 종목 탭 선택 UI |
| `src/components/dashboard/StockProfitSection.tsx` | 섹션 컨테이너 (탭+필터+차트+카드 그리드) |
| `src/components/dashboard/DashboardClientShell.tsx` | 기존 파일 완성 (실시간 갱신 로직 추가) |
| `src/__tests__/components/dashboard/StockPnLCard.test.tsx` | 단위 테스트 |
| `src/__tests__/components/dashboard/StockProfitChart.test.tsx` | 단위 테스트 |
| `src/__tests__/components/dashboard/DashboardClientShell.test.tsx` | 실시간 갱신 mock 테스트 |

---

## 3. State Management

### 3.1 상태 분류

| 상태 | 위치 | 타입 | 설명 |
|------|------|------|------|
| `priceMap` | `DashboardClientShell` | `PriceMap` | 실시간 현재가 맵 (ticker → PriceQuote\|null) |
| `lastUpdated` | `DashboardClientShell` | `Date \| null` | 마지막 갱신 시각 |
| `isLoading` | `DashboardClientShell` | `boolean` | 최초 1회 로딩 여부 (skeleton 표시용) |
| `priceError` | `DashboardClientShell` | `boolean` | 현재가 갱신 실패 여부 (배지 색상 변경용) |
| `activeTicker` | `StockProfitSection` | `string` | 현재 선택된 탭 ('ALL' \| ticker) |
| `period` | `StockProfitSection` | `Period` | 기간 필터 ('3M' \| '6M' \| '1Y' \| 'ALL') |

### 3.2 초기값

| 상태 | 초기값 |
|------|--------|
| `priceMap` | `{}` |
| `lastUpdated` | `null` |
| `isLoading` | `true` |
| `priceError` | `false` |
| `activeTicker` | `'ALL'` |
| `period` | `'ALL'` |

---

## 4. API Contract

### 4.1 GET /api/prices (기존)

- 응답: `{ prices: PriceMap }` — `Record<ticker, PriceQuote | null>`
- `PriceQuote`: `{ price, currency, changePercent, name }`
- 실패 시: HTTP 4xx/5xx 또는 네트워크 오류

### 4.2 GET /api/dashboard/history (05-01 구현)

- 응답: `{ data: Record<ticker, StockHistoryPoint[]> }`
- `StockHistoryPoint`: `{ month: string; closePrice: number }`
- page.tsx에서 Server Component fetch로 처리, `historyData` prop으로 전달

---

## 5. UI/UX Design

### 5.1 레이아웃 전체 구조 (DashboardClientShell)

기존 섹션 순서 뒤에 `StockProfitSection`을 추가한다.

```
p-6 lg:p-8 space-y-8
  ├─ h1 "대시보드"  + REALTIME 배지 (우측)
  ├─ KpiCardGroup
  ├─ 포트폴리오 그리드 (PortfolioPieChart + HoldingsList)
  ├─ 일별 잔고 추이
  ├─ 월별 손익 현황
  ├─ 최근 거래
  ├─ 월별 수익 추이
  └─ StockProfitSection  ← 신규 추가 (최하단)
```

### 5.2 REALTIME 배지

- 위치: `h1` 우측에 `flex items-baseline gap-3`으로 배치
- 정상 상태: `bg-accent/20 text-accent font-mono text-xs px-2 py-0.5 rounded`에 "REALTIME" 텍스트
- 오류 상태(`priceError === true`): `bg-red-bright/20 text-red-bright` (색상만 변경, 텍스트 동일)
- 갱신 시각: 배지 우측에 `font-mono text-xs text-warm-mid` — `HH:MM:SS` 포맷 (`lastUpdated.toLocaleTimeString('ko-KR')`)
- `isLoading === true`이고 `lastUpdated === null`인 경우: 시각 자리에 `--:--:--` 표시

### 5.3 StockProfitSection 레이아웃

```
bg-surface rounded-lg p-6 space-y-4
  ├─ h2 "주식별 수익 추이"  (font-mono text-xs text-warm-mid uppercase tracking-wider)
  ├─ flex items-center gap-4
  │     ├─ StockTab
  │     └─ PeriodFilter
  ├─ h-64  StockProfitChart
  └─ grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
        └─ StockPnLCard × N
```

보유 종목이 없을 때: `StockProfitSection` 전체를 빈 상태 UI로 교체 (5.6 참고)

### 5.4 StockPnLCard 설계

**책임**: 종목 1개의 평가손익 정보를 카드 형태로 표시한다. 그리드 배치는 부모(`StockProfitSection`)가 담당한다.

**Props 인터페이스**

| prop | 타입 | 설명 |
|------|------|------|
| `item` | `UnrealizedPnL` | `{ stock_id, ticker, avgBuyPrice, currentPrice, quantity, unrealizedPnL, returnRate }` |
| `name` | `string` | 종목명 (portfolio에서 조회하여 전달) |

> `UnrealizedPnL` 타입에 `name` 필드가 없으므로, `StockProfitSection`에서 `summary.portfolio`를 참조하여 `name`을 별도 prop으로 전달한다.

**레이아웃 구조**

```
bg-surface rounded-lg p-4 space-y-2
  ├─ 상단: flex justify-between items-baseline
  │     ├─ 종목명  font-display text-paper text-sm
  │     └─ 티커   font-mono text-xs text-warm-mid
  ├─ 중간: 수익률
  │     returnRate ≥ 0  → text-accent  font-mono text-xl font-bold
  │     returnRate < 0  → text-red-bright font-mono text-xl font-bold
  │     포맷: "+12.34%" / "-5.67%"  (양수 앞에 "+" 명시)
  └─ 하단: flex justify-between items-baseline
        ├─ "평가손익"  font-mono text-xs text-warm-mid
        └─ unrealizedPnL 금액
               ≥ 0 → text-accent  font-mono text-sm
               < 0 → text-red-bright font-mono text-sm
               포맷: "+₩1,234,567" / "-₩1,234,567"  (통화 기호는 currency에 따라 동적)
```

**조건부 색상 규칙**

| 조건 | 색상 클래스 |
|------|------------|
| `returnRate >= 0` | `text-accent` |
| `returnRate < 0` | `text-red-bright` |
| `unrealizedPnL >= 0` | `text-accent` |
| `unrealizedPnL < 0` | `text-red-bright` |

**수익률 포맷 함수 시그니처** (구현 시 참고)

```
formatReturnRate(rate: number): string
  // rate >= 0 → "+12.34%"
  // rate < 0  → "-5.67%"
```

**평가손익 금액 포맷**: `Intl.NumberFormat`을 사용하되 통화 기호는 KRW → "₩", USD → "$", JPY → "¥" 매핑

### 5.5 DashboardClientShell 완성 설계

**추가 Props**

| prop | 타입 | 설명 |
|------|------|------|
| `historyData` | `Record<string, StockHistoryPoint[]> \| null` | 종목별 월말 종가 데이터 |

**추가 State**

| state | 타입 | 초기값 |
|-------|------|--------|
| `priceMap` | `PriceMap` | `{}` |
| `lastUpdated` | `Date \| null` | `null` |
| `isLoading` | `boolean` | `true` |
| `priceError` | `boolean` | `false` |

**useEffect 구조 (cleanup 포함)**

```
useEffect(() => {
  let cancelled = false

  const fetchPrices = async () => {
    try {
      const res = await fetch('/api/prices')
      if (!res.ok) throw new Error('price fetch failed')
      const data = await res.json()
      if (!cancelled) {
        setPriceMap(prev => data.prices ?? prev)   // 실패 시 이전 값 유지
        setLastUpdated(new Date())
        setIsLoading(false)
        setPriceError(false)
      }
    } catch {
      if (!cancelled) {
        setPriceError(true)
        setIsLoading(false)
        // priceMap은 이전 값 그대로 유지 (setState 호출 없음)
      }
    }
  }

  fetchPrices()   // 진입 즉시 1회
  const interval = setInterval(fetchPrices, 60_000)

  return () => {
    cancelled = true
    clearInterval(interval)
  }
}, [])
```

`cancelled` 플래그는 컴포넌트 언마운트 후 비동기 응답이 도착했을 때 setState 호출을 방지하는 안전 장치다.

**h1 영역 마크업 구조**

```
flex items-baseline gap-3
  ├─ h1 "대시보드"  (font-display text-paper text-4xl)
  ├─ span REALTIME 배지  (조건부 색상: 5.2 참고)
  └─ span 갱신 시각  (font-mono text-xs text-warm-mid)
        lastUpdated ? lastUpdated.toLocaleTimeString('ko-KR') : '--:--:--'
```

**StockProfitSection 추가 위치**: 기존 "월별 수익 추이" 섹션 바로 아래 (`space-y-8` 내 마지막 항목)

```tsx
{/* 주식별 수익 추이 섹션 */}
{summary !== null && (
  <StockProfitSection
    portfolio={summary.portfolio}
    historyData={historyData}
    priceMap={priceMap}
    isLoading={isLoading}
    totalInvested={summary.kpi.totalInvested}
  />
)}
```

**KpiCardGroup props 변경**: `priceMap` prop 추가

```tsx
<KpiCardGroup kpi={summary.kpi} priceMap={priceMap} />
```

`KpiCardGroup`은 `priceMap`을 받아 평가손익 KPI 수치를 현재가 기준으로 계산하여 표시한다. `priceMap`이 비어 있으면 기존 `kpi.totalInvested` 기반 정적 값을 표시한다.

### 5.6 StockTab 설계

**책임**: 전체/개별 종목 탭을 렌더링하고 선택값을 부모에 전달한다.

**Props**

| prop | 타입 | 설명 |
|------|------|------|
| `tickers` | `string[]` | 보유 종목 티커 배열 |
| `value` | `string` | 현재 선택값 ('ALL' 또는 ticker) |
| `onChange` | `(ticker: string) => void` | 탭 선택 콜백 |

**레이아웃**: `flex gap-2` 내 탭 버튼 나열

- 첫 번째 탭: "전체" (value='ALL')
- 이후: 각 ticker 문자열
- 활성 탭: `bg-accent/20 text-accent font-mono text-xs px-3 py-1 rounded`
- 비활성 탭: `text-warm-mid font-mono text-xs px-3 py-1 rounded hover:text-paper`

### 5.7 StockProfitChart 설계

**책임**: 종목별 월말 수익률 추이를 멀티라인 차트로 표시한다.

**Props**

| prop | 타입 | 설명 |
|------|------|------|
| `historyData` | `Record<string, StockHistoryPoint[]>` | 종목별 월말 종가 |
| `activeTicker` | `string` | 'ALL' 또는 특정 ticker |
| `period` | `Period` | 기간 필터 |

**Recharts 구성**

| 요소 | 설정 |
|------|------|
| `ResponsiveContainer` | `width="100%" height="100%"` |
| `LineChart` | `data` = 병합된 월 배열 (x축: month) |
| `Line` × N | 종목별 1개씩, `dot={false}`, `strokeWidth={2}`, 고유 `stroke` 색상 |
| `ReferenceLine` | `y={0}` 기준선, `stroke="rgba(255,255,255,0.2)"` |
| `XAxis` | `dataKey="month"`, `tickLine={false}`, `axisLine={false}` |
| `YAxis` | `tickFormatter={(v) => \`${v}%\`}`, `width={48}` |
| `Tooltip` | 커스텀 포맷 — 월 + 종목별 수익률% |
| `Legend` | 종목명 범례 (activeTicker='ALL'일 때만 표시) |

**종목별 색상 팔레트** (index 순서, 최대 8종목 상정)

```
['#00D8A8', '#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#F472B6', '#60A5FA', '#FB923C']
```

첫 번째 색상(`#00D8A8`)은 `text-accent`와 동일 계열로 기존 디자인 시스템과 일관성을 유지한다.

**데이터 변환**: x축 공통 월 배열 생성 후 각 종목의 `closePrice`를 수익률로 환산

```
cumulativeReturn[month] = (closePrice - firstClosePrice) / firstClosePrice × 100
```

기간 필터는 `period` 값에 따라 월 배열을 slice하여 적용한다.

**빈 데이터 처리**: `historyData`가 비어 있거나 종목 데이터 없으면 `EmptyState` 컴포넌트 표시

---

## 6. Error Handling

### 6.1 /api/prices 실패 처리

| 상황 | 처리 방식 |
|------|-----------|
| 네트워크 오류 또는 HTTP 오류 응답 | `priceError = true` 설정, `priceMap` 이전 값 유지 |
| 최초 로딩 중 실패 | `isLoading = false` 설정, 이후 60초마다 재시도 지속 |
| 연속 실패 | `priceError` 상태 유지 → REALTIME 배지 `text-red-bright`로 시각적 경고 |
| 갱신 성공 | `priceError = false` 복구, 배지 정상 색상(`text-accent`) 복원 |

**핵심 원칙**: 현재가 갱신 실패는 페이지 전체를 깨지 않는다. `priceMap`이 이전 값을 보유하는 한 KpiCardGroup, StockPnLCard는 마지막 성공 시점의 수치를 유지하여 표시한다.

### 6.2 연속 실패 시 배지 동작

```
priceError === false  →  bg-accent/20 text-accent      "REALTIME"  (정상)
priceError === true   →  bg-red-bright/20 text-red-bright  "REALTIME"  (경고)
```

별도 팝업이나 토스트 없이 배지 색상 변경만으로 비간섭적 경고를 제공한다. 사용자가 원하면 수동 새로고침 버튼(`DataErrorMessage` 패턴 재사용)을 통해 페이지 전체를 재로드할 수 있다.

### 6.3 historyData null 처리

| 상황 | 처리 방식 |
|------|-----------|
| `historyData === null` | `StockProfitSection` 전체를 `DataErrorMessage` 컴포넌트로 교체 |
| `historyData`가 빈 객체 `{}` | `StockProfitSection` 렌더링하되 차트 및 카드 영역에 빈 상태 UI 표시 |
| 특정 ticker의 history 배열이 비어 있음 | 해당 종목 라인 생략, 나머지 종목 정상 렌더링 |

**빈 상태 UI 구조**

```
flex flex-col items-center justify-center h-32 gap-2
  ├─ p "보유 종목 데이터가 없습니다."  (font-mono text-xs text-warm-mid)
  └─ (카드 그리드 미표시)
```

### 6.4 UnrealizedPnL 계산 실패

`priceMap[ticker] === null`인 경우 해당 `StockPnLCard`에서:
- `currentPrice`: `avgBuyPrice` 값으로 폴백 (수익률 0% 표시)
- `unrealizedPnL`: `0` 표시
- 카드 우측 상단에 `font-mono text-xs text-warm-mid "가격 조회 중"` 텍스트 표시

---

## 7. Accessibility

- `StockTab` 탭 버튼: `role="tab"`, `aria-selected`, `aria-controls` 적용
- REALTIME 배지: `aria-live="polite"` 영역 내 갱신 시각 텍스트 포함
- `StockProfitChart`: `aria-label="주식별 수익 추이 차트"` 추가
- 색상만으로 수익률 구분 시 `aria-label`에 "수익" / "손실" 텍스트 포함

---

## 8. Acceptance Criteria

| ID | Criteria | 검증 방법 |
|----|----------|-----------|
| AC-01 | 주식별 탭 "전체" → 모든 종목 라인 표시 | StockProfitChart 렌더링 Line 수 확인 |
| AC-02 | 개별 종목 탭 선택 → 해당 종목 라인만 표시 | activeTicker 변경 후 Line 수 = 1 확인 |
| AC-03 | 기간 필터 6M 선택 → 최근 6개월 데이터만 표시 | 차트 x축 tick 수 확인 |
| AC-04 | StockPnLCard: 수익률%, 평가손익 금액 정확히 표시 | item props 기반 텍스트 렌더링 확인 |
| AC-05 | 페이지 진입 시 현재가 로딩 → KPI 수치 갱신 | fetch mock → priceMap 상태 변경 확인 |
| AC-06 | 60초 후 현재가 재조회 → REALTIME 배지 시각 업데이트 | vi.useFakeTimers + advanceTimersByTime(60000) |
| AC-07 | 보유 종목 없을 때 빈 상태 UI 표시 | historyData={} 전달 시 빈 상태 메시지 확인 |

---

## 9. Implementation Guide

### 9.1 구현 순서

1. `StockPnLCard.tsx` — props·레이아웃·조건부 색상 (의존성 없음)
2. `StockTab.tsx` — 탭 버튼 목록 렌더링
3. `StockProfitChart.tsx` — Recharts LineChart 멀티라인
4. `StockProfitSection.tsx` — 탭+필터 상태 관리, 3열 그리드 조합
5. `DashboardClientShell.tsx` — useEffect 실시간 갱신 로직 추가, historyData prop 추가
6. `KpiCardGroup.tsx` — priceMap prop 추가 및 평가손익 계산 반영
7. `page.tsx` — history fetch 추가, historyData prop 전달
8. 테스트 파일 작성

### 9.2 KpiCardGroup priceMap 반영 전략

`KpiCardGroup`에 `priceMap` prop을 추가하되, 평가손익(미실현) 계산은 `KpiCardGroup` 내부가 아니라 `DashboardClientShell`에서 수행 후 계산된 값을 내려보내는 방식을 권장한다. 이는 `KpiCardGroup`의 props 계약을 최소화하고 계산 로직을 Shell에 집중시키기 위함이다.

구체적으로:

```
DashboardClientShell
  │  priceMap 갱신 시 → calcUnrealizedPnL(portfolio, priceMap) 호출
  │                    → unrealizedTotal 계산
  └─ KpiCardGroup에 kpi + unrealizedTotal 전달
```

`calcUnrealizedPnL`은 `src/lib/calculations.ts`에 기존 정의된 함수를 재사용하거나, 없으면 Shell 내 useMemo로 인라인 계산한다.

### 9.3 StockProfitChart 데이터 변환 알고리즘

```
입력: historyData = { 'AAPL': [{month:'2024-01', closePrice:150}, ...], ... }
      activeTicker = 'ALL' | ticker
      period = '6M' | ...

1. activeTickers = activeTicker === 'ALL' ? Object.keys(historyData) : [activeTicker]
2. 공통 월 배열 = 모든 ticker history의 month 합집합 → 정렬
3. period 필터 적용 → 최근 N개월 slice
4. 각 ticker별 첫 달 closePrice를 기준(100%) 으로 설정
5. chartRows = months.map(month => ({
     month,
     [ticker1]: cumulativeReturn1,
     [ticker2]: cumulativeReturn2,
     ...
   }))
6. LineChart data={chartRows}
```

### 9.4 테스트 전략

| 컴포넌트 | 핵심 테스트 케이스 |
|----------|--------------------|
| `StockPnLCard` | returnRate 양수 → text-accent 클래스, 음수 → text-red-bright 클래스 |
| `StockPnLCard` | 수익률 포맷 "+12.34%" / "-5.67%" |
| `StockProfitChart` | activeTicker='ALL' → Line N개 렌더링 |
| `StockProfitChart` | activeTicker=ticker → Line 1개 렌더링 |
| `DashboardClientShell` | 진입 즉시 fetch('/api/prices') 1회 호출 |
| `DashboardClientShell` | 60초 경과 후 fetch 재호출 (vi.useFakeTimers) |
| `DashboardClientShell` | fetch 실패 시 priceError=true, priceMap 유지 |
| `DashboardClientShell` | 언마운트 후 clearInterval 호출 (cleanup 검증) |

---

## 10. TDD Test Scenarios

### 10.1 Test Strategy

**프레임워크**: Vitest + React Testing Library (RTL)

**Recharts mock 전략**: `vi.mock('recharts', ...)` 으로 `ResponsiveContainer`, `LineChart`, `Line`, `ReferenceLine`, `XAxis`, `YAxis`, `Tooltip`, `Legend`를 각각 `data-testid`를 노출하는 간단한 div로 교체한다. `Line` mock은 `data-testid="mock-line-{dataKey}"` 형태로 렌더링하여 Line 개수를 `screen.getAllByTestId('mock-line-*')` 패턴으로 검증한다.

**fetch mock 전략**: `vi.stubGlobal('fetch', vi.fn())` 으로 전역 fetch를 교체하고, 각 테스트에서 `mockResolvedValueOnce` / `mockRejectedValueOnce`로 시나리오별 응답을 제어한다.

**타이머 mock 전략**: `vi.useFakeTimers()` + `vi.advanceTimersByTime(60_000)` 으로 setInterval 60초 경과를 시뮬레이션한다. 각 테스트 after에서 `vi.useRealTimers()`로 복원한다.

**테스트 파일 배치**

| 파일 | 대상 컴포넌트 |
|------|--------------|
| `src/__tests__/components/dashboard/StockTab.test.tsx` | StockTab |
| `src/__tests__/components/dashboard/StockPnLCard.test.tsx` | StockPnLCard |
| `src/__tests__/components/dashboard/StockProfitChart.test.tsx` | StockProfitChart |
| `src/__tests__/components/dashboard/StockProfitSection.test.tsx` | StockProfitSection |
| `src/__tests__/components/dashboard/DashboardClientShell.test.tsx` | DashboardClientShell |

**우선순위 정의**

| 등급 | 기준 |
|------|------|
| Critical | AC 항목 직접 검증, 데이터 정확성, 실시간 갱신 핵심 로직 |
| High | 조건부 렌더링, 색상 분기, 에러 상태 처리 |
| Medium | 접근성, 빈 상태 UI, 포맷 세부 사항 |

---

### 10.2 Test Scenario List

| ID | Target | Description | Input | Expected Output | Priority |
|----|--------|-------------|-------|-----------------|----------|
| TS-01 | StockPnLCard | 수익률 양수 → text-accent 클래스 적용 | `item.returnRate = 12.34`, `item.unrealizedPnL = 500000` | 수익률 요소에 `text-accent` 클래스 포함 | Critical |
| TS-02 | StockPnLCard | 수익률 음수 → text-red-bright 클래스 적용 | `item.returnRate = -5.67`, `item.unrealizedPnL = -200000` | 수익률 요소에 `text-red-bright` 클래스 포함 | Critical |
| TS-03 | StockPnLCard | 양수 수익률 포맷 — "+" 부호 명시 | `item.returnRate = 12.34` | 화면에 `"+12.34%"` 텍스트 존재 | Critical |
| TS-04 | StockPnLCard | 음수 수익률 포맷 — "-" 부호 표시 | `item.returnRate = -5.67` | 화면에 `"-5.67%"` 텍스트 존재 | Critical |
| TS-05 | StockPnLCard | 종목명·티커 렌더링 | `name = "애플"`, `item.ticker = "AAPL"` | `"애플"`, `"AAPL"` 텍스트 각각 존재 | High |
| TS-06 | StockPnLCard | 평가손익 양수 금액 → text-accent, "+" 부호 | `item.unrealizedPnL = 1234567` | `"+₩1,234,567"` 텍스트, `text-accent` 클래스 | High |
| TS-07 | StockPnLCard | 평가손익 음수 금액 → text-red-bright, "-" 부호 | `item.unrealizedPnL = -1234567` | `"-₩1,234,567"` 텍스트, `text-red-bright` 클래스 | High |
| TS-08 | StockTab | "전체" 탭 항상 첫 번째로 렌더링 | `tickers = ["AAPL", "TSLA"]`, `value = "ALL"` | `screen.getByText("전체")` 존재, `aria-selected="true"` | Critical |
| TS-09 | StockTab | 개별 종목 탭 목록 렌더링 | `tickers = ["AAPL", "TSLA"]` | `"AAPL"`, `"TSLA"` 버튼 각각 존재 | High |
| TS-10 | StockTab | 탭 클릭 시 onChange 콜백 호출 | `tickers = ["AAPL"]`, `onChange = vi.fn()` | `fireEvent.click("AAPL 버튼")` → `onChange("AAPL")` 1회 호출 | Critical |
| TS-11 | StockTab | 활성 탭 aria-selected="true", 비활성 탭 aria-selected="false" | `value = "AAPL"`, `tickers = ["AAPL", "TSLA"]` | AAPL 버튼 `aria-selected="true"`, TSLA 버튼 `aria-selected="false"` | High |
| TS-12 | StockProfitChart | activeTicker='ALL' → 종목 수만큼 Line mock 렌더링 | `historyData = {AAPL: [...], TSLA: [...]}`, `activeTicker = "ALL"` | `screen.getAllByTestId(/^mock-line/)` 길이 = 2 | Critical |
| TS-13 | StockProfitChart | activeTicker=특정 ticker → Line 1개만 렌더링 | `historyData = {AAPL: [...], TSLA: [...]}`, `activeTicker = "AAPL"` | `screen.getAllByTestId(/^mock-line/)` 길이 = 1 | Critical |
| TS-14 | StockProfitChart | ReferenceLine y=0 기준선 렌더링 | `historyData = {AAPL: [...]}, activeTicker = "ALL"` | `mock-referenceline` data-y 속성 = `"0"` | High |
| TS-15 | StockProfitChart | historyData 빈 객체 → 빈 상태 메시지 표시, LineChart 미렌더링 | `historyData = {}`, `activeTicker = "ALL"` | `"보유 종목이 없습니다"` 텍스트 존재, `mock-linechart` 미존재 | High |
| TS-16 | StockProfitChart | period='6M' → 최근 6개월 데이터만 LineChart에 전달 | `historyData = {AAPL: 12개월 데이터}`, `period = "6M"` | `mock-linechart` `data-count` 속성 = `"6"` | Critical |
| TS-17 | DashboardClientShell | 마운트 즉시 fetch('/api/prices') 1회 호출 | fetch mock → 200 응답 `{prices: {AAPL: {price:150,...}}}` | `fetch` 1회 호출, 호출 URL = `"/api/prices"` | Critical |
| TS-18 | DashboardClientShell | fetch 성공 후 REALTIME 배지 정상 색상(text-accent) 표시 | fetch mock → 200 성공 응답 | `"REALTIME"` 텍스트 존재, 배지 요소에 `text-accent` 클래스 | Critical |
| TS-19 | DashboardClientShell | fetch 성공 후 갱신 시각 "--:--:--" 에서 실제 시각으로 변경 | fetch mock → 200 성공, `vi.useFakeTimers()` | 초기 `"--:--:--"` → fetch 완료 후 실제 시각 문자열로 변경 | High |
| TS-20 | DashboardClientShell | fetch 실패(HTTP 500) → REALTIME 배지 text-red-bright로 변경 | fetch mock → `res.ok = false` (500) | 배지 요소에 `text-red-bright` 클래스, 텍스트 여전히 `"REALTIME"` | Critical |
| TS-21 | DashboardClientShell | fetch 실패 후 priceMap 이전 값 유지 (KPI 수치 보존) | 1차 fetch 성공 → priceMap 갱신, 2차 fetch 실패 | 1차 성공 시 표시된 수치가 2차 실패 후에도 동일 | High |
| TS-22 | DashboardClientShell | 60초 경과 후 fetch 재호출 | `vi.useFakeTimers()`, fetch mock → 200, `vi.advanceTimersByTime(60000)` | fetch 총 2회 호출 (마운트 1회 + interval 1회) | Critical |
| TS-23 | DashboardClientShell | 언마운트 후 추가 fetch 미발생 (cleanup 검증) | `vi.useFakeTimers()`, `unmount()` 호출 후 `advanceTimersByTime(120000)` | unmount 이후 fetch 추가 호출 없음 (호출 횟수 = 마운트 시점 1회) | Critical |
| TS-24 | StockProfitSection | 초기 activeTicker='ALL' → StockTab value='ALL' 렌더링 | `historyData = {AAPL:[...]}`, `priceMap = {}` | StockTab 컴포넌트의 "전체" 버튼 `aria-selected="true"` | High |
| TS-25 | StockProfitSection | 탭 클릭 시 activeTicker 상태 변경 → StockProfitChart activeTicker 갱신 | "AAPL" 탭 클릭 | StockProfitChart에 `activeTicker="AAPL"` prop 전달 (Line 1개) | High |

---

### 10.3 Edge Cases

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| EC-01 | StockPnLCard: `returnRate = 0` (경계값) | `text-accent` 클래스 적용 (`>= 0` 조건), `"+0.00%"` 표시 |
| EC-02 | StockPnLCard: `unrealizedPnL = 0` (경계값) | `text-accent` 클래스 적용, `"+₩0"` 표시 |
| EC-03 | StockTab: `tickers = []` (보유 종목 없음) | "전체" 탭 1개만 렌더링, 개별 탭 없음 |
| EC-04 | StockProfitChart: 특정 ticker history 배열 길이 1 (단일 데이터 포인트) | 해당 ticker Line 렌더링, 수익률 = 0% (첫 달 기준 대비) |
| EC-05 | StockProfitChart: period='3M', 실제 데이터가 2개월치뿐 | 데이터 부족 시 전체 2개월 데이터 표시 (slice 초과 방지) |
| EC-06 | StockProfitChart: `historyData`에 존재하지 않는 `activeTicker` 전달 | 빈 상태 UI 표시, 에러 없이 처리 |
| EC-07 | DashboardClientShell: 네트워크 오류 (fetch reject) → priceError 경고 배지 | fetch mock `mockRejectedValueOnce(new Error('Network'))` → 배지 `text-red-bright` |
| EC-08 | DashboardClientShell: 실패 후 다음 interval fetch 성공 → 배지 정상 복원 | 1차 실패 후 `advanceTimersByTime(60000)` + 2차 성공 mock → 배지 `text-accent` 복원 |
| EC-09 | StockPnLCard: `priceMap[ticker] = null` → "가격 조회 중" 텍스트 표시 | `"가격 조회 중"` 텍스트 존재, 수익률 `"+0.00%"` 표시 |
| EC-10 | StockProfitSection: `historyData = null` → DataErrorMessage 렌더링 | StockProfitChart, StockPnLCard 미렌더링, 에러 메시지 컴포넌트 존재 |

---

### 10.4 Test Implementation Order

다음 순서로 테스트 파일을 작성한다. 의존성이 없는 단위 컴포넌트를 먼저 작성하고, 상태·타이머를 포함하는 복합 컴포넌트를 나중에 작성한다.

1. **TS-01 ~ TS-07**: `StockPnLCard.test.tsx` — 순수 렌더링 검증, 의존성 없음
   - EC-01, EC-02, EC-09 함께 작성
2. **TS-08 ~ TS-11**: `StockTab.test.tsx` — 탭 렌더링 및 이벤트 검증
   - EC-03 함께 작성
3. **TS-12 ~ TS-16**: `StockProfitChart.test.tsx` — Recharts mock, 데이터 변환 검증
   - EC-04, EC-05, EC-06 함께 작성
4. **TS-24 ~ TS-25**: `StockProfitSection.test.tsx` — 탭 상태 연동 검증
   - EC-10 함께 작성
5. **TS-17 ~ TS-23**: `DashboardClientShell.test.tsx` — fetch mock + `vi.useFakeTimers()` setInterval 검증
   - EC-07, EC-08 함께 작성

**각 테스트 파일 공통 설정 패턴**

```
describe('<ComponentName>', () => {
  beforeEach(() => {
    vi.useFakeTimers()          // 타이머 관련 컴포넌트만
    vi.stubGlobal('fetch', vi.fn())  // fetch 관련 컴포넌트만
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // TS-XX: ...
})
```

**Recharts vi.mock 위치**: 각 테스트 파일 최상단 import 이전에 선언하여 호이스팅 보장

```
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children, data }: any) => (
    <div data-testid="mock-linechart" data-count={data?.length ?? 0}>{children}</div>
  ),
  Line: ({ dataKey }: any) => <div data-testid={`mock-line-${dataKey}`} />,
  ReferenceLine: ({ y }: any) => <div data-testid="mock-referenceline" data-y={String(y)} />,
  XAxis: () => <div data-testid="mock-xaxis" />,
  YAxis: () => <div data-testid="mock-yaxis" />,
  Tooltip: () => null,
  Legend: () => null,
}))
```
