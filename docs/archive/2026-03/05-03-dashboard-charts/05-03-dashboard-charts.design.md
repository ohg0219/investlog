# 05-03-dashboard-charts Design Document

> **Summary**: 대시보드 차트 섹션 — 일별 잔고 추이 + 월별 손익 현황 + 월별 수익 추이 (Recharts 기반)
>
> **Project**: investlog
> **Version**: 0.1.0
> **Author**: dev
> **Date**: 2026-03-11
> **Status**: Draft
> **Complexity**: medium
> **Planning Doc**: [05-03-dashboard-charts.plan.md](../../01-plan/features/05-03-dashboard-charts.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- `05-01-dashboard-infra`에서 구현된 `/api/dashboard/chart-data` 엔드포인트를 활용하여 3개 차트 섹션 구현
- Recharts `AreaChart`, `BarChart`, `ResponsiveContainer`를 사용한 반응형 차트
- 기간 필터(PeriodFilter) 상태를 클라이언트 컴포넌트 내에서 관리하여 page.tsx Server Component 단순화 유지
- 빈 데이터 / fetch 실패 케이스를 기존 `DataErrorMessage` 패턴과 일관되게 처리

### 1.2 Design Principles

- **단방향 데이터 흐름**: page.tsx → ClientShell → 각 차트 컴포넌트로 props 하강
- **관심사 분리**: 기간 필터 상태는 `MonthlyProfitSection`이 캡슐화
- **최소 props**: 각 차트 컴포넌트는 렌더링에 필요한 데이터 배열만 수신
- **일관된 빈 상태 UX**: 데이터 없을 때 EmptyState, fetch 실패 시 DataErrorMessage 재사용

---

## 2. Architecture

### 2.1 Component Diagram

차트 데이터는 `page.tsx` (Server Component) 에서 `chart-data` API를 fetch한 뒤 `DashboardClientShell` 로 props로 내려온다. 클라이언트 컴포넌트들은 받은 데이터를 순수하게 렌더링하며, 유일한 클라이언트 상태는 `MonthlyProfitSection` 내부의 기간 필터 선택값이다.

```
page.tsx (Server Component)
  │
  ├─ fetch /api/dashboard/summary       → summaryData: DashboardSummary | null
  ├─ fetch /api/transactions            → transactionsData: TransactionWithStock[] | null
  └─ fetch /api/dashboard/chart-data   → chartData: ChartData | null   ← 신규
        │
        ▼
DashboardClientShell (Client Component)
  props: { summary, transactions, chartData }
        │
        ├─ DailyBalanceChart
        │     props: { data: DailyBalancePoint[] }
        │     renders: AreaChart + LinearGradient + Tooltip
        │
        ├─ MonthlyBreakdownChart
        │     props: { data: MonthlyBreakdown[] }
        │     renders: BarChart (Bar×3) + Legend + Tooltip
        │
        └─ MonthlyProfitSection  (Client Component, 기간 필터 상태 관리)
              │
              ├─ PeriodFilter
              │     props: { value: Period; onChange: (p: Period) => void }
              │
              ├─ MonthlyProfitChart
              │     props: { data: MonthlyPnL[]; period: Period }
              │     (period 기준으로 내부 slice 후 렌더링)
              │     renders: BarChart + Cell(조건부 color) + ReferenceLine(y=0)
              │
              └─ YearlySummary
                    props: { data: MonthlyPnL[]; totalInvested?: number }
                    (현재 연도 데이터 필터링 후 통계 계산)
```

### 2.2 Data Flow

```
[page.tsx] Promise.all([summaryFetch, transactionsFetch, chartDataFetch])
    │
    │  chartData shape: { dailyBalance, monthlyBreakdown, monthlyPnL }
    │
    ▼
DashboardClientShell
  chartData가 null이면 → DataErrorMessage 렌더링
  chartData가 있으면  →
    ┌─ dailyBalance      ──→ DailyBalanceChart
    ├─ monthlyBreakdown  ──→ MonthlyBreakdownChart
    └─ monthlyPnL        ──→ MonthlyProfitSection
                                  │  const [period, setPeriod] = useState<Period>('ALL')
                                  ├─ PeriodFilter (value=period, onChange=setPeriod)
                                  ├─ MonthlyProfitChart (data=monthlyPnL, period=period)
                                  │       내부: useMemo → slicedData
                                  └─ YearlySummary (data=monthlyPnL, totalInvested?)
```

### 2.3 Dependencies

| 컴포넌트 | 직접 의존 | Recharts 컴포넌트 | 외부 상태 |
|---------|---------|-----------------|---------|
| `DailyBalanceChart` | `DailyBalancePoint[]` | `AreaChart`, `Area`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer` | 없음 |
| `MonthlyBreakdownChart` | `MonthlyBreakdown[]` | `BarChart`, `Bar`×3, `XAxis`, `YAxis`, `Tooltip`, `Legend`, `ResponsiveContainer` | 없음 |
| `MonthlyProfitSection` | `MonthlyPnL[]` | 없음 (레이아웃 + 상태) | 없음 |
| `PeriodFilter` | `Period` type | 없음 | controlled (부모 state) |
| `MonthlyProfitChart` | `MonthlyPnL[]`, `Period` | `BarChart`, `Bar`, `Cell`, `ReferenceLine`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer` | period (props) |
| `YearlySummary` | `MonthlyPnL[]` | 없음 | 없음 |

---

## 3. Data Model

### 3.1 기존 타입 활용 (src/types/index.ts)

```typescript
interface DailyBalancePoint {
  date: string;    // YYYY-MM-DD
  balance: number;
}

interface MonthlyBreakdown {
  month: string;    // YYYY-MM
  buy: number;
  sell: number;
  dividend: number;
}

interface MonthlyPnL {
  month: string;    // YYYY-MM
  pnl: number;
  dividend: number;
}
```

### 3.2 신규 타입 (DashboardClientShell props 확장)

```typescript
// src/types/index.ts 또는 컴포넌트 내 로컬 타입
interface ChartData {
  dailyBalance:     DailyBalancePoint[]
  monthlyBreakdown: MonthlyBreakdown[]
  monthlyPnL:       MonthlyPnL[]
}

// PeriodFilter
export type Period = '3M' | '6M' | '1Y' | 'ALL'

// DashboardClientShellProps 확장
interface DashboardClientShellProps {
  summary:      DashboardSummary | null
  transactions: TransactionWithStock[] | null
  chartData:    ChartData | null              // 신규
}
```

---

## 4. API Specification

### 4.1 기존 엔드포인트 활용

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/dashboard/chart-data` | 차트 데이터 조회 (기존 구현) | Required |

### 4.2 응답 스펙 (기존 `05-01-dashboard-infra` 구현)

**Response (200 OK):**
```json
{
  "data": {
    "dailyBalance":      [{ "date": "2024-01-15", "balance": 1500000 }],
    "monthlyBreakdown":  [{ "month": "2024-01", "buy": 1000000, "sell": 200000, "dividend": 50000 }],
    "monthlyPnL":        [{ "month": "2024-01", "pnl": 150000, "dividend": 50000 }]
  }
}
```

**Error Responses:**
- `401 Unauthorized`: 인증 토큰 없음/만료
- `500 Internal Server Error`: 서버 오류

---

## 5. UI/UX Design

### 5.1 Screen Layout

```
┌─────────────────────────────────────────────────────┐
│  h1: 대시보드                                         │
├─────────────────────────────────────────────────────┤
│  [섹션 1] KPI 카드 그룹 (KpiCardGroup)                │
├─────────────────────────────────────────────────────┤
│  [섹션 2] 포트폴리오 (PieChart + HoldingsList)         │
├─────────────────────────────────────────────────────┤
│  [섹션 3] 일별 잔고 추이        ← 신규, 전체 너비       │
│           DailyBalanceChart (h-64)                   │
├─────────────────────────────────────────────────────┤
│  [섹션 4] 월별 손익 현황        ← 신규, 전체 너비       │
│           MonthlyBreakdownChart (h-64)               │
├─────────────────────────────────────────────────────┤
│  [섹션 5] 최근 거래 (RecentTransactions)              │
├─────────────────────────────────────────────────────┤
│  [섹션 6] 월별 수익 추이 + 연간 요약   ← 신규          │
│  ┌──────────────────────────┬──────────────────┐    │
│  │  PeriodFilter (우측 정렬) │                  │    │
│  │  MonthlyProfitChart (h-64)│  YearlySummary   │    │
│  │  (lg:col-span-2)          │  (lg:col-span-1) │    │
│  └──────────────────────────┴──────────────────┘    │
└─────────────────────────────────────────────────────┘
```

**그리드 규칙:**
- 섹션 3, 4: `w-full`, 차트 wrapper `h-64` + `ResponsiveContainer width="100%" height="100%"`
- 섹션 6: `grid grid-cols-1 lg:grid-cols-3 gap-6` — 좌 `lg:col-span-2`, 우 `lg:col-span-1`
- 카드 wrapper: `bg-surface rounded-lg p-6`
- 섹션 간격: `space-y-8`

### 5.2 Component List (상세)

#### DailyBalanceChart

**파일**: `src/components/dashboard/DailyBalanceChart.tsx`

**Props Interface:**
```typescript
interface DailyBalanceChartProps {
  data: DailyBalancePoint[]
}
```

**빈 상태:** `data.length === 0` → `<div className="flex items-center justify-center h-full"><p className="font-mono text-xs text-warm-mid">잔고 데이터가 없습니다</p></div>`

**Recharts 구성:**

| 요소 | 설정 값 |
|------|--------|
| `ResponsiveContainer` | `width="100%"` `height="100%"` |
| `AreaChart` | `data={data}` `margin={{ top: 8, right: 8, left: 16, bottom: 0 }}` |
| `defs > linearGradient` | `id="balanceGradient"` |
| stop 1 | `offset="5%"` `stopColor="#c8a96e"` `stopOpacity={0.3}` |
| stop 2 | `offset="95%"` `stopColor="#c8a96e"` `stopOpacity={0}` |
| `XAxis` | `dataKey="date"` `tickFormatter={(v) => v.slice(5)}` (MM-DD 표시) `tick={{ fontSize: 11, fill: '#a09070' }}` |
| `YAxis` | `tickFormatter={(v) => v.toLocaleString()}` `tick={{ fontSize: 11, fill: '#a09070' }}` `width={72}` |
| `Tooltip` | 커스텀 `BalanceTooltip` |
| `Area` | `type="monotone"` `dataKey="balance"` `stroke="#c8a96e"` `strokeWidth={2}` `fill="url(#balanceGradient)"` |

**BalanceTooltip:** 날짜 + 잔고 `toLocaleString() + ' 원'` / `bg-surface border border-warm-mid/30 rounded px-3 py-2 font-mono text-xs text-paper`

---

#### MonthlyBreakdownChart

**파일**: `src/components/dashboard/MonthlyBreakdownChart.tsx`

**Props Interface:**
```typescript
interface MonthlyBreakdownChartProps {
  data: MonthlyBreakdown[]
}
```

**빈 상태:** `data.length === 0` → EmptyState ("월별 손익 데이터가 없습니다")

**색상 상수:**
```typescript
const BAR_COLORS = {
  buy:      '#2d6a4f',  // dark green
  sell:     '#b5832a',  // gold-brown
  dividend: '#3b82f6',  // blue-500
} as const
```

**Recharts 구성:**

| 요소 | 설정 값 |
|------|--------|
| `BarChart` | `data={data}` `barCategoryGap="20%"` `barGap={2}` |
| `XAxis` | `dataKey="month"` `tickFormatter={(v) => v.slice(2)}` |
| `Bar` (buy) | `dataKey="buy"` `name="매수"` `fill={BAR_COLORS.buy}` `radius={[2,2,0,0]}` |
| `Bar` (sell) | `dataKey="sell"` `name="매도"` `fill={BAR_COLORS.sell}` `radius={[2,2,0,0]}` |
| `Bar` (dividend) | `dataKey="dividend"` `name="배당"` `fill={BAR_COLORS.dividend}` `radius={[2,2,0,0]}` |
| `Legend` | `wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}` |

---

#### PeriodFilter

**파일**: `src/components/dashboard/PeriodFilter.tsx`

**타입:**
```typescript
export type Period = '3M' | '6M' | '1Y' | 'ALL'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '3M',  label: '3개월' },
  { value: '6M',  label: '6개월' },
  { value: '1Y',  label: '1년'   },
  { value: 'ALL', label: '전체'  },
]
```

**Props Interface:**
```typescript
interface PeriodFilterProps {
  value: Period
  onChange: (period: Period) => void
}
```

**버튼 스타일:**

| 상태 | Tailwind |
|------|---------|
| active | `bg-accent text-surface font-semibold` |
| inactive | `bg-transparent text-warm-mid hover:text-paper hover:bg-warm-mid/10` |
| 공통 | `font-mono text-xs px-3 py-1 rounded transition-colors` |

레이아웃: `flex gap-1 justify-end`

---

#### MonthlyProfitChart

**파일**: `src/components/dashboard/MonthlyProfitChart.tsx`

**Props Interface:**
```typescript
interface MonthlyProfitChartProps {
  data: MonthlyPnL[]
  period: Period
}
```

**기간 슬라이싱 로직 (useMemo):**
```
'3M'  → data.slice(-3)
'6M'  → data.slice(-6)
'1Y'  → data.slice(-12)
'ALL' → data
```

data.length < slice count 시 전체 data 반환 (slice는 자동으로 처리).

**Cell 조건부 색상:**
```
pnl >= 0  →  '#2d6a4f'  (dark green)
pnl < 0   →  '#ef4444'  (red)
```

**빈 상태:** slicedData.length === 0 → EmptyState ("수익 데이터가 없습니다")

**Recharts 구성:**

| 요소 | 설정 값 |
|------|--------|
| `Bar` | `dataKey="pnl"` — `{slicedData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? GREEN : RED} />)}` |
| `ReferenceLine` | `y={0}` `stroke="#a09070"` `strokeDasharray="3 3"` |

---

#### MonthlyProfitSection

**파일**: `src/components/dashboard/MonthlyProfitSection.tsx`

**Props Interface:**
```typescript
interface MonthlyProfitSectionProps {
  data: MonthlyPnL[]
  totalInvested?: number
}
```

**내부 상태:** `const [period, setPeriod] = useState<Period>('ALL')`

**레이아웃:**
```
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2 space-y-2">
    <PeriodFilter value={period} onChange={setPeriod} />
    <div className="h-64">
      <MonthlyProfitChart data={data} period={period} />
    </div>
  </div>
  <YearlySummary data={data} totalInvested={totalInvested} />
</div>
```

---

#### YearlySummary

**파일**: `src/components/dashboard/YearlySummary.tsx`

**Props Interface:**
```typescript
interface YearlySummaryProps {
  data: MonthlyPnL[]
  totalInvested?: number
}
```

**통계 계산:**

| 항목 | 계산 |
|------|------|
| 현재 연도 필터 | `data.filter(d => d.month.startsWith(currentYear))` |
| 연간 총손익 | `yearData.reduce((s, d) => s + d.pnl, 0)` |
| 최고수익월 | `yearData.reduce((max, d) => d.pnl > max.pnl ? d : max, yearData[0])?.month` |
| 손실월 수 | `yearData.filter(d => d.pnl < 0).length` |
| 배당포함 수익률 | `totalInvested > 0` 일 때: `((totalPnL + dividendSum) / totalInvested * 100).toFixed(2) + '%'` |

totalInvested가 없거나 0이면 수익률 `'-'` 표시.
yearData가 빈 배열이면 "올해 데이터가 없습니다" 메시지.

**총손익 색상:** 양수 `text-green-400`, 음수 `text-red-bright`, 0 `text-paper`

### 5.3 State Management

#### page.tsx 변경 사항

```typescript
const [summaryRes, transactionsRes, chartDataRes] = await Promise.all([
  fetch(`${baseUrl}/api/dashboard/summary`, fetchOptions).catch(() => null),
  fetch(`${baseUrl}/api/transactions`, fetchOptions).catch(() => null),
  fetch(`${baseUrl}/api/dashboard/chart-data`, fetchOptions).catch(() => null),  // 신규
])

// chartData 파싱 (summaryData 패턴 동일)
let chartData: ChartData | null = null
if (chartDataRes && chartDataRes.ok) {
  try { chartData = (await chartDataRes.json()).data } catch { chartData = null }
}
```

DashboardClientShell에 `chartData={chartData}` props 추가.

---

## 6. Error Handling

| 케이스 | 처리 방법 |
|--------|---------|
| chart-data fetch 실패 (네트워크) | `chartData = null` → `DataErrorMessage` |
| chart-data 응답 non-2xx | `chartData = null` → `DataErrorMessage` |
| 빈 데이터 배열 (`[]`) | 각 차트 컴포넌트 내부 EmptyState |
| period 슬라이싱 후 빈 결과 | `MonthlyProfitChart` EmptyState |
| `totalInvested = 0` | 수익률 `'-'` (0 나누기 방어) |

---

## 7. Security Considerations

- chart-data API는 `verifyJwt` 미들웨어로 인증 보호 (기존 구현)
- 클라이언트 컴포넌트는 API 직접 호출 없이 Server Component에서 받은 props만 렌더링
- XSS: Recharts/React JSX 렌더링으로 자동 이스케이프

---

## 8. Acceptance Criteria

### 8.1 Functional Acceptance Criteria

| ID | Criteria | Verification Method | Priority |
|----|----------|---------------------|----------|
| AC-01 | Given 거래 데이터가 있을 때 / When 대시보드 로드 시 / Then 일별 잔고 추이 차트가 날짜 순서로 x축 표시 | 자동 테스트 (TS-01, TS-03) | Must |
| AC-02 | Given MonthlyBreakdown 데이터 존재 시 / When 렌더링 시 / Then BUY(dark green)/SELL(gold-brown)/DIVIDEND(blue) 3색 그룹 바와 범례 표시 | 자동 테스트 (TS-05, TS-07) | Must |
| AC-03 | Given 기간 필터에서 3M 선택 시 / When MonthlyProfitChart 렌더링 시 / Then 최근 3개월 데이터만 표시 | 자동 테스트 (TS-14) | Must |
| AC-04 | Given MonthlyPnL 데이터 존재 시 / When 차트 렌더링 시 / Then 양수 pnl 바는 green, 음수는 red, y=0 기준선 표시 | 자동 테스트 (TS-18) + 수동 검증 | Must |
| AC-05 | Given 현재 연도 거래 존재 시 / When YearlySummary 렌더링 시 / Then 총손익/최고수익월/손실월수 표시 | 자동 테스트 (TS-20~TS-23) | Must |
| AC-06 | Given 화면 너비 변화 시 / When 리사이징 시 / Then ResponsiveContainer가 차트 크기 자동 조정 | 수동 검증 | Must |
| AC-07 | Given data=[] 빈 배열 시 / When 각 차트 컴포넌트 렌더링 시 / Then EmptyState 텍스트 표시 | 자동 테스트 (TS-02, TS-06, TS-19) | Must |
| AC-08 | Given chart-data fetch 실패 시 / When DashboardClientShell 렌더링 시 / Then DataErrorMessage 표시 | 수동 검증 | Must |

### 8.2 Non-Functional Acceptance Criteria

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 차트 컴포넌트 렌더링 시 추가 API 호출 없음 (Server에서 fetch 완료) | 네트워크 탭 수동 확인 |
| Accessibility | 차트 섹션에 `aria-label` 또는 시각적 텍스트 대체 제공 | 수동 검증 |

### 8.3 Edge Cases

| ID | Scenario | Expected Behavior |
|----|----------|------------------|
| EC-01 | balance=0인 데이터 | 차트 렌더링, EmptyState 미노출 |
| EC-02 | data.length < period slice count | slice 자동 처리, 전체 데이터 표시 |
| EC-03 | totalInvested=0 | 수익률 '-' 표시, 오류 없음 |
| EC-04 | 현재 연도 데이터 없음 | YearlySummary "올해 데이터가 없습니다" |

---

## 9. TDD Test Scenarios

### 9.1 Test Strategy

**테스트 환경:**

| 항목 | 내용 |
|------|------|
| 테스트 러너 | Vitest |
| 렌더링 유틸 | @testing-library/react |
| 어설션 | @testing-library/jest-dom |
| 모킹 | vi.mock (Vitest built-in) |

**Recharts Mock 전략:**

jsdom에서 Recharts SVG 렌더링 불가 → 각 테스트 파일 상단에 `vi.mock('recharts', ...)` 적용.

```typescript
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="mock-responsive-container">{children}</div>,
  AreaChart: ({ children, data }: any) => <div data-testid="mock-areachart" data-count={data?.length ?? 0}>{children}</div>,
  Area: ({ dataKey }: any) => <div data-testid={`mock-area-${dataKey}`} />,
  BarChart: ({ children, data }: any) => <div data-testid="mock-barchart" data-count={data?.length ?? 0}>{children}</div>,
  Bar: ({ dataKey }: any) => <div data-testid={`mock-bar-${dataKey}`} />,
  ReferenceLine: ({ y }: any) => <div data-testid="mock-referenceline" data-y={y} />,
  XAxis: () => <div data-testid="mock-xaxis" />,
  YAxis: () => <div data-testid="mock-yaxis" />,
  Tooltip: () => null,
  CartesianGrid: () => null,
  Legend: () => null,
  Cell: ({ fill }: any) => <div data-testid="mock-cell" data-fill={fill} />,
  defs: ({ children }: any) => <>{children}</>,
}))
```

**집중 영역:** 빈 상태, 데이터 전달 검증, period 슬라이싱, 이벤트 핸들링, 통계 계산

### 9.2 Test Scenario List

#### DailyBalanceChart

| ID | 설명 | 입력 | 기대 결과 | 우선순위 |
|----|------|------|----------|---------|
| TS-01 | data 존재 시 AreaChart 렌더링 | `data=[{ date:'2024-01-01', balance:1000000 }]` | `mock-areachart` 존재 | P0 |
| TS-02 | data 빈 배열 → EmptyState 렌더링 | `data=[]` | "잔고 데이터가 없습니다" 텍스트, `mock-areachart` 미존재 | P0 |
| TS-03 | data 길이가 AreaChart data-count에 반영 | `data` 3개 항목 | `data-count="3"` | P1 |
| TS-04 | Area dataKey="balance" 렌더링 | `data` 1개 항목 | `mock-area-balance` 존재 | P1 |

#### MonthlyBreakdownChart

| ID | 설명 | 입력 | 기대 결과 | 우선순위 |
|----|------|------|----------|---------|
| TS-05 | data 존재 시 BarChart 렌더링 | `data=[{ month:'2024-01', buy:100, sell:50, dividend:10 }]` | `mock-barchart` 존재 | P0 |
| TS-06 | data 빈 배열 → EmptyState | `data=[]` | "월별 손익 데이터가 없습니다", `mock-barchart` 미존재 | P0 |
| TS-07 | 3개 Bar 모두 렌더링 | `data` 1개 항목 | `mock-bar-buy`, `mock-bar-sell`, `mock-bar-dividend` 모두 존재 | P1 |
| TS-08 | data 길이 BarChart data-count 반영 | `data` 4개 항목 | `data-count="4"` | P1 |

#### PeriodFilter

| ID | 설명 | 입력 | 기대 결과 | 우선순위 |
|----|------|------|----------|---------|
| TS-09 | 4개 버튼 렌더링 | `value='3M', onChange=vi.fn()` | '3M', '6M', '1Y', 'ALL' 버튼 4개 존재 | P0 |
| TS-10 | 현재 value 버튼 active 상태 | `value='6M'` | '6M' 버튼 active class 포함 | P0 |
| TS-11 | 비활성 버튼은 active 미적용 | `value='6M'` | '3M', '1Y', 'ALL' 버튼 active class 미포함 | P1 |
| TS-12 | 버튼 클릭 시 onChange 호출 | `value='3M', onChange=vi.fn()`, '1Y' 클릭 | `onChange('1Y')` 1회 호출 | P0 |
| TS-13 | 현재 value 버튼 클릭 시에도 onChange 호출 | `value='ALL'`, 'ALL' 클릭 | `onChange('ALL')` 호출 | P2 |

#### MonthlyProfitChart

| ID | 설명 | 입력 | 기대 결과 | 우선순위 |
|----|------|------|----------|---------|
| TS-14 | period='3M' 시 마지막 3개 항목 전달 | `data` 6개, `period='3M'` | `mock-barchart` `data-count="3"` | P0 |
| TS-15 | period='6M' 시 마지막 6개 항목 전달 | `data` 10개, `period='6M'` | `data-count="6"` | P0 |
| TS-16 | period='1Y' 시 마지막 12개 항목 전달 | `data` 15개, `period='1Y'` | `data-count="12"` | P0 |
| TS-17 | period='ALL' 시 전체 데이터 전달 | `data` 20개, `period='ALL'` | `data-count="20"` | P0 |
| TS-18 | ReferenceLine y=0 렌더링 | `data` 1개, `period='ALL'` | `mock-referenceline` `data-y="0"` | P1 |
| TS-19 | data 빈 배열 → EmptyState | `data=[], period='3M'` | "수익 데이터가 없습니다", `mock-barchart` 미존재 | P0 |

#### YearlySummary

| ID | 설명 | 입력 | 기대 결과 | 우선순위 |
|----|------|------|----------|---------|
| TS-20 | 현재 연도 데이터만 필터링 통계 계산 | 2023년 3개 + 2026년 4개 (vi.setSystemTime으로 2026 고정) | 2026년 4개 기준 통계 표시 | P0 |
| TS-21 | 총손익 합산 표시 | 2026년 pnl=[100, -50, 200] | '250' 포함 텍스트 | P0 |
| TS-22 | 최고수익월 표시 | 2026년 pnl 최고=2026-03 | '2026-03' 포함 텍스트 | P1 |
| TS-23 | 손실월 수 표시 | 2026년 pnl=[100, -50, -30, 200] | '2' 포함 손실월 텍스트 | P1 |
| TS-24 | totalInvested 있을 때 수익률 표시 | `totalInvested=1000000`, 총 pnl+dividend=100000 | '10.00%' 포함 | P0 |
| TS-25 | totalInvested 없을 때 수익률 '-' | `totalInvested` 미전달 | '-' 텍스트 | P0 |
| TS-26 | 현재 연도 데이터 없을 때 빈 상태 | `data` 전부 2022년 항목 | "올해 데이터가 없습니다" 표시 | P1 |

### 9.3 Edge Cases

| ID | 컴포넌트 | 시나리오 | 기대 결과 |
|----|---------|---------|---------|
| EC-01 | DailyBalanceChart | balance=0 데이터 | 차트 렌더링, EmptyState 미노출 |
| EC-02 | MonthlyBreakdownChart | buy/sell/dividend 모두 0 | 차트 렌더링, 빈 상태 미노출 |
| EC-03 | PeriodFilter | 알 수 없는 value | 4개 버튼 모두 active 미적용, 오류 없음 |
| EC-04 | MonthlyProfitChart | data.length < period slice count | 전체 데이터 전달, 오류 없음 |
| EC-05 | MonthlyProfitChart | pnl=0 경계값 | green 처리 (pnl>=0 조건) |
| EC-06 | YearlySummary | totalInvested=0 | 수익률 '-', 0 나누기 방어 처리 |
| EC-07 | YearlySummary | 모든 월 pnl 음수 | 오류 없이 최솟값 중 최고값 또는 '-' |

### 9.4 Test Implementation Order

| 순서 | 파일 | 시나리오 | 이유 |
|------|------|---------|------|
| 1 | PeriodFilter.test.tsx | TS-09~13, EC-03 | Recharts 의존 없음, 순수 이벤트 테스트 |
| 2 | DailyBalanceChart.test.tsx | TS-01~04, EC-01 | 단일 props, 로직 단순 |
| 3 | MonthlyBreakdownChart.test.tsx | TS-05~08, EC-02 | 3개 Bar 구조 |
| 4 | MonthlyProfitChart.test.tsx | TS-14~19, EC-04, EC-05 | period 슬라이싱 로직 집중 |
| 5 | YearlySummary.test.tsx | TS-20~26, EC-06, EC-07 | 연도 필터 + 통계 집계 |

**구현 주의사항:**
- `vi.mock` 호이스팅: import 순서에 무관하게 최상단 적용됨 확인
- `data-count` 어설션: `getAttribute('data-count')` 는 문자열 반환 → `"3"` 비교
- `YearlySummary` 연도: `vi.setSystemTime(new Date('2026-01-01'))` 으로 고정

---

## 10. Implementation Guide

### 10.1 File Structure

```
src/components/dashboard/
  DailyBalanceChart.tsx          ← 신규
  MonthlyBreakdownChart.tsx      ← 신규
  MonthlyProfitChart.tsx         ← 신규
  MonthlyProfitSection.tsx       ← 신규 (PeriodFilter 상태 관리)
  PeriodFilter.tsx               ← 신규
  YearlySummary.tsx              ← 신규
  DashboardClientShell.tsx       ← 수정 (chartData props 추가)

src/app/dashboard/
  page.tsx                       ← 수정 (chart-data fetch 추가)

src/__tests__/components/dashboard/
  DailyBalanceChart.test.tsx     ← 신규
  MonthlyBreakdownChart.test.tsx ← 신규
  MonthlyProfitChart.test.tsx    ← 신규
  PeriodFilter.test.tsx          ← 신규
  YearlySummary.test.tsx         ← 신규
```

### 10.2 Implementation Order

1. [ ] `Period` 타입 및 `ChartData` 타입 정의 (src/types/index.ts 또는 로컬)
2. [ ] `PeriodFilter.tsx` 구현 (의존성 없음)
3. [ ] `DailyBalanceChart.tsx` 구현
4. [ ] `MonthlyBreakdownChart.tsx` 구현
5. [ ] `MonthlyProfitChart.tsx` 구현
6. [ ] `YearlySummary.tsx` 구현
7. [ ] `MonthlyProfitSection.tsx` 구현 (4, 5, 6 완료 후)
8. [ ] `DashboardClientShell.tsx` 수정 (chartData props + MonthlyProfitSection 추가)
9. [ ] `page.tsx` 수정 (chart-data fetch 추가)
10. [ ] 테스트 파일 5개 작성 (9.4 순서대로)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-11 | Initial draft | dev |
