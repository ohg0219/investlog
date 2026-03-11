# 05-02-dashboard-kpi Design Document

> **Summary**: 대시보드 KPI 카드 + 포트폴리오 비중 + 최근 거래 UI 컴포넌트 설계
>
> **Project**: investlog
> **Version**: 0.1.0
> **Author**: dev
> **Date**: 2026-03-11
> **Status**: Draft
> **Complexity**: medium
> **Planning Doc**: [05-02-dashboard-kpi.plan.md](../../01-plan/features/05-02-dashboard-kpi.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- `05-01-dashboard-infra`에서 구현된 API(`/api/dashboard/summary`, `/api/transactions`)를 소비하는 UI 레이어를 설계한다
- Server Component에서 데이터를 페치하여 초기 렌더링 시 실제 KPI 값이 HTML에 포함되도록 한다
- 컴포넌트 경계를 명확히 분리하여 05-04(실시간 갱신) 확장에 대비한다

### 1.2 Design Principles

- **Server-first**: 가능한 한 데이터 페치를 Server Component에서 수행하여 초기 페이지 로드 성능을 보장한다
- **Props 기반 단방향 흐름**: `page.tsx → DashboardClientShell → 하위 컴포넌트` 단방향으로 데이터를 전달한다
- **빈 상태 명시**: 데이터가 없는 상태를 UI로 명시적으로 처리하여 빈 화면이 표시되지 않도록 한다
- **재사용**: `TransactionTypeBadge` 등 기존 컴포넌트를 재사용하여 중복 구현을 방지한다

---

## 2. Architecture

### 2.1 컴포넌트 트리

```
src/app/dashboard/page.tsx                [Server Component]
  │
  │  fetch('/api/dashboard/summary', { cache: 'no-store', headers: { cookie } })
  │  fetch('/api/transactions',       { cache: 'no-store', headers: { cookie } })
  │  → DashboardSummary | null, TransactionWithStock[] | null
  │
  └─ <DashboardClientShell summary={summary} transactions={transactions} />  [Client Component]
       │
       ├─ <KpiCardGroup kpi={summary.kpi} />              [Client 컨텍스트 내]
       │    ├─ <KpiCard label="총 투자금"   value={kpi.totalInvested}   colorVariant="accent" />
       │    ├─ <KpiCard label="실현 손익"   value={kpi.realizedPnL}     colorVariant="pnl" showArrow />
       │    ├─ <KpiCard label="배당 수익"   value={kpi.dividendIncome}  colorVariant="neutral" />
       │    └─ <KpiCard label="총 수익률"   value={kpi.totalReturn}     colorVariant="pnl" showArrow />
       │
       ├─ <PortfolioPieChart items={summary.portfolio} />
       ├─ <HoldingsList items={summary.portfolio} />
       └─ <RecentTransactions transactions={transactions.slice(0, 5)} />
```

**렌더링 경계 근거**

- `page.tsx`: Server Component — 첫 페인트 시 KPI 데이터를 HTML에 포함. 401은 서버에서 `redirect('/')` 처리
- `DashboardClientShell`: `'use client'` 경계 — 05-04에서 `useState` + `setInterval` 폴링 허브로 확장 예정. 현재 단계에서는 props 전달 래퍼 역할
- `KpiCardGroup`, `KpiCard`: 별도 `'use client'` 불필요 (Shell 하위에서 자동으로 클라이언트 컨텍스트 적용)
- `PortfolioPieChart`: Recharts DOM 의존성으로 `'use client'` 필수

### 2.2 데이터 흐름

```
[Browser 요청]
      │
      ▼
page.tsx (Server Component)
  1. cookies().get('token') → 없으면 redirect('/')
  2. verifyJwt(token) → null이면 redirect('/')
  3. Promise.all([
       fetch('/api/dashboard/summary', { cache: 'no-store', headers: { Cookie: `token=${token}` } }),
       fetch('/api/transactions',       { cache: 'no-store', headers: { Cookie: `token=${token}` } })
     ])
  4. summary: 200 → DashboardSummary 파싱 / !ok → null
     transactions: 200 → TransactionWithStock[] 파싱 / !ok → null
  5. <DashboardClientShell summary={summary} transactions={transactions} />
      │
      ▼ props 전달 (JSON 직렬화, Server → Client 경계 통과)
DashboardClientShell
  6. summary === null → KPI/포트폴리오 섹션에 에러 배너
  7. summary 정상 → KpiCardGroup, PortfolioPieChart, HoldingsList 렌더링
  8. transactions === null → RecentTransactions 섹션에 에러 배너
  9. transactions 정상 → RecentTransactions에 .slice(0, 5) 전달
```

### 2.3 의존성 테이블

| 컴포넌트 | 의존 대상 | 용도 |
|---------|----------|------|
| `page.tsx` | `next/headers` cookies, `next/navigation` redirect, `@/lib/auth` verifyJwt | 인증 + 서버사이드 fetch |
| `page.tsx` | `DashboardClientShell` | 클라이언트 셸 마운트 |
| `DashboardClientShell` | `@/types` DashboardSummary, TransactionWithStock | Props 타입 |
| `DashboardClientShell` | KpiCardGroup, PortfolioPieChart, HoldingsList, RecentTransactions | 섹션 조합 |
| `KpiCardGroup` | `@/types` DashboardSummary['kpi'] | KPI 값 구조 |
| `KpiCardGroup` | `KpiCard` | 개별 카드 렌더링 |
| `PortfolioPieChart` | `recharts` (PieChart, Pie, Cell, Tooltip, ResponsiveContainer) | 도넛 차트 렌더링 |
| `RecentTransactions` | `next/link` Link | "전체 보기" 클라이언트 내비게이션 |
| `RecentTransactions` | `@/components/transactions/TransactionTypeBadge` | 유형 chip 재사용 |

---

## 3. Data Model

### 3.1 사용 타입 (기구현 — `src/types/index.ts`)

```typescript
// DashboardSummary — GET /api/dashboard/summary 응답
interface DashboardSummary {
  kpi: {
    totalInvested: number;    // 누적 매수 총액
    realizedPnL: number;      // 실현 손익 (평균단가법)
    dividendIncome: number;   // 누적 배당 수입
    totalReturn: number;      // 실현손익 + 배당 합계
  };
  portfolio: PortfolioItem[]; // weight 내림차순 정렬
}

// PortfolioItem — portfolio 배열 원소
interface PortfolioItem {
  stock_id: string;   // UUID
  ticker: string;     // Yahoo Finance 티커
  name: string;       // 종목명
  weight: number;     // 투자 비중 (%) — 소수점 2자리
  amount: number;     // 현재 보유 평가액
}

// TransactionWithStock — GET /api/transactions 응답 원소
interface TransactionWithStock {
  id: string;
  stock_id: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND';
  quantity: number;
  price: number;
  amount: number;   // quantity * price
  date: string;     // YYYY-MM-DD
  note?: string;
  stock: { ticker: string; name: string };
}
```

### 3.2 신규 Props 인터페이스

```typescript
// KpiCard.tsx
type KpiCardColorVariant = 'accent' | 'pnl' | 'neutral'

interface KpiCardProps {
  label: string
  value: number
  colorVariant: KpiCardColorVariant
  showArrow?: boolean
  format?: 'currency-krw' | 'currency-usd' | 'number'  // default: 'currency-krw'
}

// KpiCardGroup.tsx
interface KpiCardGroupProps {
  kpi: DashboardSummary['kpi']
}

// DashboardClientShell.tsx
interface DashboardClientShellProps {
  summary: DashboardSummary | null
  transactions: TransactionWithStock[] | null
}

// PortfolioPieChart.tsx
interface PortfolioPieChartProps {
  items: PortfolioItem[]
  outerRadius?: number  // default: 160
  innerRadius?: number  // default: 88
}

// HoldingsList.tsx
interface HoldingsListProps {
  items: PortfolioItem[]
}

// RecentTransactions.tsx
interface RecentTransactionsProps {
  transactions: TransactionWithStock[]  // slice(0, 5) 처리된 배열
}
```

---

## 4. API Specification

이 피처는 신규 API를 추가하지 않는다. `05-01-dashboard-infra`에서 구현된 API를 소비한다.

| Method | Path | Consumer | Auth |
|--------|------|----------|------|
| GET | `/api/dashboard/summary` | `page.tsx` (서버사이드) | Cookie `token` |
| GET | `/api/transactions` | `page.tsx` (서버사이드) | Cookie `token` |

---

## 5. UI/UX Design

### 5.1 전체 페이지 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ NavBar                                                           │
├─────────────────────────────────────────────────────────────────┤
│  대시보드                                                         │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │  KPI CARDS ROW  (grid grid-cols-2 lg:grid-cols-4 gap-4)      │ │
│ │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │ │
│ │  │ 총 투자금  │ │ 실현 손익 │ │ 배당 수익 │ │ 총 수익률 │   │ │
│ │  │ ₩15,000,000│ │ ▲ +₩320,000│ │ ₩85,000   │ │ ▲ +₩405,000│   │ │
│ │  └───────────┘ └───────────┘ └───────────┘ └───────────┘   │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌──────────────────┐ ┌──────────────────────────────────────┐   │
│ │ PortfolioPieChart│ │ HoldingsList                         │   │
│ │ (도넛 차트)       │ │ AAPL  ████████  60%  ₩6,000,000     │   │
│ │                  │ │ MSFT  █████     40%  ₩4,000,000     │   │
│ └──────────────────┘ └──────────────────────────────────────┘   │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 최근 거래                              전체 보기 →            │ │
│ │ 날짜        유형chip  종목    금액                            │ │
│ │ 2026-03-11  [매수]    AAPL    ₩500,000                       │ │
│ └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**반응형 기준점**

| Breakpoint | KPI 그리드 | 중간 섹션 |
|------------|-----------|----------|
| `< 1024px` | `grid-cols-2` (2×2) | 단열 스택 |
| `>= 1024px` | `grid-cols-4` (1×4) | 좌우 분할 (40:60) |

### 5.2 컴포넌트 목록

| 파일 | 렌더링 | 역할 |
|------|--------|------|
| `src/app/dashboard/page.tsx` | Server Component | 인증 확인, 서버사이드 fetch |
| `src/app/dashboard/loading.tsx` | Next.js 자동 Suspense | KPI 스켈레톤 UI |
| `src/components/dashboard/DashboardClientShell.tsx` | Client Component | 클라이언트 최상위 래퍼 |
| `src/components/dashboard/KpiCardGroup.tsx` | (Client 내) | KPI 4개 그리드 컨테이너 |
| `src/components/dashboard/KpiCard.tsx` | (Client 내) | 단일 KPI 수치 표시 |
| `src/components/dashboard/PortfolioPieChart.tsx` | `'use client'` | Recharts 도넛 차트 |
| `src/components/dashboard/HoldingsList.tsx` | (Client 내) | 종목별 비중 리스트 |
| `src/components/dashboard/RecentTransactions.tsx` | (Client 내) | 최근 5건 미니 테이블 |

### 5.3 KpiCard — 색상 처리 로직 (FR-03)

**색상 토큰**

| 토큰 | 용도 |
|------|------|
| `text-accent` | 총 투자금(고정), 배당 수익(고정) |
| `text-green-bright` | 실현 손익/총 수익률 양수 |
| `text-red-bright` | 실현 손익/총 수익률 음수 |
| `text-warm-mid` | 실현 손익/총 수익률 = 0 (중립) |

**색상 결정 함수**

```typescript
function resolveValueColor(value: number, variant: KpiCardColorVariant): string {
  if (variant === 'accent' || variant === 'neutral') return 'text-accent'
  if (value > 0) return 'text-green-bright'
  if (value < 0) return 'text-red-bright'
  return 'text-warm-mid'
}
```

**값 포매팅 (currency-krw 기준)**

- `Math.abs(value)`를 사용하여 음수 기호 제거
- 음수 표현: 화살표(`▼`)와 색상으로만 전달
- 포맷: `₩${Math.abs(value).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`

**화살표 접두사**

- `showArrow=true` && `value > 0` → `"▲ +"`
- `showArrow=true` && `value < 0` → `"▼ "`
- `showArrow=true` && `value === 0` → `""`
- `showArrow=false` → `""`

**KpiCardGroup 카드 구성**

| 순서 | label | value 소스 | colorVariant | showArrow |
|------|-------|-----------|-------------|-----------|
| 1 | `"총 투자금"` | `kpi.totalInvested` | `accent` | false |
| 2 | `"실현 손익"` | `kpi.realizedPnL` | `pnl` | true |
| 3 | `"배당 수익"` | `kpi.dividendIncome` | `neutral` | false |
| 4 | `"총 수익률"` | `kpi.totalReturn` | `pnl` | true |

### 5.4 PortfolioPieChart — Recharts 설계 (FR-04, FR-05, FR-09)

**렌더링 구조**

```typescript
<ResponsiveContainer width="100%" aspect={1}>
  <PieChart>
    <Pie
      data={filteredItems}   // weight > 0 && isFinite(weight) 필터 적용
      dataKey="weight"
      nameKey="name"
      cx="50%" cy="50%"
      innerRadius={innerRadius}   // 도넛 형태
      outerRadius={outerRadius}
      paddingAngle={2}
      stroke="none"
    >
      {filteredItems.map((item, index) => (
        <Cell key={item.stock_id} fill={CHART_COLORS[index % CHART_COLORS.length]} />
      ))}
    </Pie>
    <Tooltip content={<PortfolioTooltip />} />
  </PieChart>
</ResponsiveContainer>
```

**커스텀 툴팁 표시 항목 (FR-05)**

| 행 | 내용 |
|----|------|
| 1 | 종목명 (`item.name`) |
| 2 | 비중 `{item.weight.toFixed(2)}%` |
| 3 | 금액 `₩{item.amount.toLocaleString('ko-KR')}` |

**빈 상태 (FR-09)**: `filteredItems.length === 0`이면 PieChart 대신 점선 원 + "종목 없음" 텍스트

**색상 팔레트 (CHART_COLORS)**

```typescript
const CHART_COLORS = [
  '#c8a96e', // accent      — 1순위 (비중 최대)
  '#6898cc', // blue-bright — 2순위
  '#6bba8a', // green-bright — 3순위
  '#d07070', // red-bright  — 4순위
  '#a08060', // accent-dim  — 5순위
  '#8888aa', // 보라 계열   — 6순위
  '#aa8866', // 갈색 계열   — 7순위
  '#66aaaa', // 청록 계열   — 8순위
] as const
```

### 5.5 HoldingsList — 리스트 행 설계 (FR-06)

**행 구조 (수평 flex)**

```
[ ticker (mono/xs) ] ─── [ progress bar (비중%) ] ─── [ amount (mono/xs/right) ]
```

- progress bar: `<div style={{ width: \`${item.weight}%\` }}>`, max-width 제한 (`max-w-[200px]`)
- 비중 텍스트: `{item.weight.toFixed(2)}%`
- 금액: `₩${item.amount.toLocaleString('ko-KR')}`
- 정렬: API 계약(`weight` 내림차순) 신뢰, 클라이언트 재정렬 불필요

**빈 상태**: `items.length === 0`이면 null 반환 (부모에서 통합 처리)

### 5.6 RecentTransactions — 테이블 설계 (FR-07, FR-08, FR-10)

**4컬럼 테이블**

| 컬럼 | 내용 | 스타일 |
|------|------|--------|
| 날짜 | `transaction.date` (YYYY-MM-DD) | `font-mono text-xs text-warm-mid whitespace-nowrap` |
| 유형 | `<TransactionTypeBadge>` 재사용 | — |
| 종목 | `transaction.stock.ticker` | `font-mono text-xs text-paper` |
| 금액 | `₩{transaction.amount.toLocaleString('ko-KR')}` | 유형별 색상 |

**"전체 보기 →" 링크 (FR-08)**

```typescript
<Link href="/dashboard/transactions" className="font-mono text-xs text-accent hover:text-accent/70">
  전체 보기 →
</Link>
```

**빈 상태 (FR-10)**: 테이블 없이 "거래 없음" 텍스트. 카드 헤더와 "전체 보기 →" 링크는 유지

---

## 6. Error Handling

| 에러 상황 | 처리 위치 | 처리 방식 |
|---------|---------|----------|
| 401 Unauthorized | `page.tsx` | `redirect('/')` — Shell 도달 없음 |
| 500 / fetch 실패 (summary) | `DashboardClientShell` | KPI·포트폴리오 섹션에 에러 배너 |
| 500 / fetch 실패 (transactions) | `DashboardClientShell` | 최근 거래 섹션에 에러 배너 |
| `portfolio[].weight <= 0 \| NaN` | `PortfolioPieChart` 진입 시 필터 | 해당 항목 제외, 빈 상태로 폴백 |

**에러 배너 스타일**: `font-mono text-xs text-red-bright/80` + "새로고침" 버튼

---

## 7. Security Considerations

- [x] 인증: 모든 데이터 페치는 `page.tsx`에서 `verifyJwt` 후 실행 — 미인증 시 redirect
- [x] XSS 방지: 사용자 입력 없음 (읽기 전용 대시보드) — React 기본 이스케이프로 충분
- [x] 민감 데이터: 서버사이드 fetch로 token을 직접 브라우저에 노출하지 않음
- [x] 접근성: 색상 + 화살표 텍스트 병행 사용 (WCAG 2.1 AA 대응)

---

## 8. Acceptance Criteria

### 8.1 Functional Acceptance Criteria

| ID | Criteria | Verification Method | Priority |
|----|----------|---------------------|----------|
| AC-01 | Given 로그인 상태 / When `/dashboard` 진입 / Then KPI 카드 4개 (총 투자금, 실현 손익, 배당 수익, 총 수익률) 모두 실제 데이터 표시 | 자동 테스트 (KpiCardGroup) + 수동 검증 | Must |
| AC-02 | Given 거래 내역 없음 / When `/dashboard` 진입 / Then KPI 값 모두 0 표시, 포트폴리오 "종목 없음", 거래 "거래 없음" 빈 상태 메시지 표시 | 자동 테스트 (빈 상태 분기) | Must |
| AC-03 | Given 포트폴리오 데이터 존재 / When 도넛 차트 섹터 hover / Then 툴팁에 종목명, 비중(%), 금액 표시 | 수동 검증 (Recharts 툴팁) | Must |
| AC-04 | Given portfolio 배열 N개 / When HoldingsList 렌더링 / Then 리스트 행 수 === N | 자동 테스트 (HoldingsList) | Must |
| AC-05 | Given 거래 내역 M건 (M > 5) / When RecentTransactions 렌더링 / Then 최대 5건만 표시 | 자동 테스트 (RecentTransactions) | Must |
| AC-06 | Given 거래 내역 존재 / When "전체 보기 →" 클릭 / Then `/dashboard/transactions` 이동 | 자동 테스트 (Link href) | Must |
| AC-07 | Given 실현 손익 양수 / When KPI 카드 렌더링 / Then "▲ +" 접두사 + green 색상 표시 | 자동 테스트 (KpiCard) | Must |
| AC-08 | Given 실현 손익 음수 / When KPI 카드 렌더링 / Then "▼ " 접두사 + red 색상 표시 | 자동 테스트 (KpiCard) | Must |

### 8.2 Non-Functional Acceptance Criteria

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | Server Component 페치 완료 후 KPI 데이터가 초기 HTML에 포함됨 | 네트워크 탭 — HTML 소스 확인 |
| Accessibility | KPI 값 + 방향 화살표 텍스트 병행 표시 (색상 단독 의존 금지) | 수동 확인 (axe 도구) |
| Reliability | fetch 실패 시 각 섹션 독립 에러 배너 표시 (다른 섹션 영향 없음) | 자동 테스트 (null props 시나리오) |

### 8.3 Edge Cases

| ID | Scenario | Expected Behavior |
|----|----------|------------------|
| EC-01 | 모든 KPI 값이 0 | "₩0" 표시, 화살표 없음, warm-mid 색상 (pnl 변형) |
| EC-02 | portfolio 배열 모두 weight=0 또는 NaN | 필터 후 빈 배열 → "종목 없음" 빈 상태 UI |
| EC-03 | 거래 내역 정확히 5건 | 5건 모두 표시, 잘림 없음 |
| EC-04 | totalInvested 음수 (비정상 데이터) | KpiCard는 colorVariant="accent"이므로 색상 변화 없이 표시, 화살표 없음 |
| EC-05 | 단일 종목 포트폴리오 (weight=100) | progress bar 100% 너비 렌더링, 도넛 차트 단색 원 |

---

## 9. TDD Test Scenarios

### 9.1 Test Strategy

- **Approach**: 컴포넌트 단위 격리 테스트 (렌더링 로직 + 조건부 분기 검증)
- **Scope**: UI 렌더링 조건 분기, 값 포매팅 로직, 빈 상태 처리. API 호출/라우팅 실제 이동 제외
- **Coverage Target**: Statement 85%+, Branch 90%+
- **Test Framework**: Jest + React Testing Library + @testing-library/jest-dom

### 9.2 Test Scenario List

| ID | Target | Description | Input | Expected Output | Priority |
|----|--------|-------------|-------|-----------------|----------|
| TS-01 | KpiCard | label 텍스트가 렌더링된다 | `label="총 투자금"`, `value=1000000`, `colorVariant="neutral"` | "총 투자금" 텍스트 DOM 존재 | High |
| TS-02 | KpiCard | currency-krw 포맷으로 양수 금액이 표시된다 | `value=1234567`, `format="currency-krw"`, `colorVariant="neutral"` | "₩1,234,567" 텍스트 DOM 존재 | High |
| TS-03 | KpiCard | pnl variant, value > 0 → "▲ +" 접두사 + green 클래스 | `value=50000`, `colorVariant="pnl"`, `showArrow=true` | "▲ +₩50,000" 텍스트 포함, `text-green-bright` 클래스 존재 | High |
| TS-04 | KpiCard | pnl variant, value < 0 → "▼ " 접두사 + red 클래스 (abs 처리) | `value=-30000`, `colorVariant="pnl"`, `showArrow=true` | "▼ ₩30,000" 텍스트 포함, `text-red-bright` 클래스 존재 | High |
| TS-05 | KpiCard | pnl variant, value === 0 → 화살표 없음 + warm-mid 색상 | `value=0`, `colorVariant="pnl"`, `showArrow=true` | "▲", "▼" 미존재, `text-warm-mid` 클래스 존재 | High |
| TS-06 | KpiCard | accent variant → text-accent 클래스 고정 | `value=5000000`, `colorVariant="accent"` | `text-accent` 클래스 존재 | Medium |
| TS-07 | KpiCard | neutral variant → text-accent 클래스 고정 | `value=1000000`, `colorVariant="neutral"` | `text-accent` 클래스 존재 | Medium |
| TS-08 | KpiCard | showArrow=false → pnl variant 양수에서도 화살표 없음 | `value=10000`, `colorVariant="pnl"`, `showArrow=false` | "▲", "▼" 미존재 | Medium |
| TS-09 | KpiCardGroup | 4개의 KpiCard 레이블이 모두 렌더링된다 | 표준 kpi 객체 (totalInvested=15M, realizedPnL=320K, dividendIncome=85K, totalReturn=405K) | "총 투자금", "실현 손익", "배당 수익", "총 수익률" 텍스트 4개 모두 존재 | High |
| TS-10 | KpiCardGroup | 각 KpiCard에 올바른 value가 전달된다 | `totalInvested=10000000`, `realizedPnL=500000`, `dividendIncome=100000`, `totalReturn=600000` | "₩10,000,000", "₩500,000", "₩100,000", "₩600,000" 각각 존재 | High |
| TS-11 | PortfolioPieChart | items 존재 시 차트 컨테이너가 렌더링된다 | `items=[{ticker:"AAPL", weight:60, amount:6000000, ...}]` | `data-testid="mock-piechart"` 또는 래퍼 요소 DOM 존재 | High |
| TS-12 | PortfolioPieChart | items 빈 배열 → "종목 없음" 빈 상태 표시 | `items=[]` | "종목 없음" 텍스트 DOM 존재, 차트 미렌더링 | High |
| TS-13 | PortfolioPieChart | weight=0, NaN 항목은 필터링되어 제외된다 | `items=[{weight:50,...}, {weight:0,...}, {weight:NaN,...}]` | 차트에 전달되는 data에 weight=0, NaN 항목 미포함 | High |
| TS-14 | HoldingsList | items 배열의 모든 ticker가 렌더링된다 | `items=[{ticker:"AAPL", weight:60, amount:6000000, ...}, {ticker:"MSFT", weight:40, amount:4000000, ...}]` | "AAPL", "MSFT" 텍스트 모두 DOM 존재 | High |
| TS-15 | HoldingsList | 각 항목의 금액이 ₩X,XXX,XXX 형식으로 표시된다 | `items=[{ticker:"AAPL", amount:1234567, weight:100, ...}]` | "₩1,234,567" 텍스트 DOM 존재 | High |
| TS-16 | HoldingsList | items 빈 배열 → null 반환 (컨테이너 미존재) | `items=[]` | 컴포넌트 루트 요소 미존재 | Medium |
| TS-17 | RecentTransactions | 5건 배열 전달 시 5개 행이 렌더링된다 | transactions 5건 | 테이블 행 5개 존재 | High |
| TS-18 | RecentTransactions | 거래 유형 chip이 올바른 레이블로 표시된다 | `[{type:"BUY",...}, {type:"SELL",...}, {type:"DIVIDEND",...}]` | "매수"(또는"BUY"), "매도"(또는"SELL"), "배당"(또는"DIVIDEND") 각각 DOM 존재 | High |
| TS-19 | RecentTransactions | "전체 보기 →" 링크가 /dashboard/transactions href를 가진다 | transactions 1건 이상 | `href="/dashboard/transactions"` 속성 링크 DOM 존재 | High |
| TS-20 | RecentTransactions | transactions 빈 배열 → "거래 없음" 빈 상태 표시 | `transactions=[]` | "거래 없음" 텍스트 DOM 존재, 테이블 행 미존재 | High |
| TS-21 | RecentTransactions | 각 거래의 날짜가 YYYY-MM-DD 형식으로 표시된다 | `[{date:"2026-03-11", ...}]` | "2026-03-11" 텍스트 DOM 존재 | Medium |
| TS-22 | RecentTransactions | 각 거래의 금액이 포매팅되어 표시된다 | `[{amount:500000, type:"BUY", ...}]` | "₩500,000" 텍스트 DOM 존재 | Medium |

### 9.3 Edge Cases

| ID | Target | 경계 조건 | Input | Expected Output |
|----|--------|----------|-------|-----------------|
| EC-01 | KpiCard | value=0, currency-krw | `value=0`, `colorVariant="neutral"` | "₩0" 텍스트, 오류 없음 |
| EC-02 | KpiCard | value 10억 이상 (자릿수) | `value=1000000000`, `colorVariant="neutral"` | "₩1,000,000,000" 텍스트 |
| EC-03 | KpiCard | value 음수 + accent variant | `value=-5000`, `colorVariant="accent"` | 화살표 없음, `text-accent` 유지 |
| EC-04 | PortfolioPieChart | 전체 항목 weight=0 → 빈 상태 폴백 | `items=[{weight:0,...}, {weight:0,...}]` | "종목 없음" 빈 상태 표시 |
| EC-05 | PortfolioPieChart | weight=Infinity → 필터 제외 | `items=[{weight:Infinity,...}]` | 해당 항목 제외, 오류 없음 |
| EC-06 | HoldingsList | 단일 항목 (weight=100) | `items=[{weight:100,...}]` | 단일 행 렌더링, progress bar 100% 너비 |
| EC-07 | RecentTransactions | transactions 정확히 5건 | transactions 5건 | 5건 모두 표시, 잘림 없음 |
| EC-08 | RecentTransactions | amount=0인 거래 | `[{amount:0, type:"DIVIDEND",...}]` | "₩0" 텍스트, 오류 없음 |

### 9.4 Test Implementation Order

| 순서 | 파일 | 시나리오 ID | 이유 |
|------|------|-----------|------|
| 1 | `KpiCard.test.tsx` | TS-01~08, EC-01~03 | 순수 props 기반, 모킹 불필요. 포매팅 로직 선검증 |
| 2 | `KpiCardGroup.test.tsx` | TS-09~10 | KpiCard 정상 동작 전제. 실제 컴포넌트 사용 (통합 검증) |
| 3 | `PortfolioPieChart.test.tsx` | TS-11~13, EC-04~06 | Recharts `jest.mock('recharts')` 설정 후 방어 필터 집중 검증 |
| 4 | `HoldingsList.test.tsx` | TS-14~16, EC-06 | 단순 리스트 렌더링 |
| 5 | `RecentTransactions.test.tsx` | TS-17~22, EC-07~08 | `jest.mock('next/link')` 설정 후 href 및 빈 상태 검증 |

**모킹 사전 정의**

- `PortfolioPieChart.test.tsx`: `jest.mock('recharts')` — PieChart, Pie, Cell을 `<div data-testid="mock-piechart">` 등으로 대체, `data` props 캡처 가능하게 구성
- `RecentTransactions.test.tsx`: `jest.mock('next/link')` — `<a href={href}>{children}</a>` 형태로 대체

---

## 10. Implementation Guide

### 10.1 파일 구조

```
src/
  app/
    dashboard/
      page.tsx                   ← Server Component (신규)
      loading.tsx                ← Skeleton UI (신규)
  components/
    dashboard/
      DashboardClientShell.tsx   ← 클라이언트 최상위 래퍼 (신규)
      KpiCardGroup.tsx           ← KPI 4개 그리드 (신규)
      KpiCard.tsx                ← 단일 KPI 카드 (신규)
      PortfolioPieChart.tsx      ← Recharts 도넛 차트 (신규, 'use client')
      HoldingsList.tsx           ← 종목 비중 리스트 (신규)
      RecentTransactions.tsx     ← 최근 거래 테이블 (신규)
  __tests__/
    components/
      dashboard/
        KpiCard.test.tsx         ← (신규)
        KpiCardGroup.test.tsx    ← (신규, 생략 가능)
        PortfolioPieChart.test.tsx ← (신규)
        HoldingsList.test.tsx    ← (신규, 생략 가능)
        RecentTransactions.test.tsx ← (신규)
```

### 10.2 구현 순서

1. [ ] `KpiCard.tsx` — 포매팅/색상 로직 (TS-01~08 선행 작성)
2. [ ] `KpiCardGroup.tsx` — 4개 카드 조합
3. [ ] `PortfolioPieChart.tsx` — Recharts 도넛 + 커스텀 툴팁 (TS-11~13 선행 작성)
4. [ ] `HoldingsList.tsx` — progress bar 리스트 (TS-14~16 선행 작성)
5. [ ] `RecentTransactions.tsx` — 4컬럼 테이블 + Link (TS-17~22 선행 작성)
6. [ ] `DashboardClientShell.tsx` — 섹션 조합 + 에러 처리
7. [ ] `page.tsx` — 인증 + 서버사이드 fetch
8. [ ] `loading.tsx` — 스켈레톤 UI

### 10.3 환경변수 주의사항

Server Component에서 자기 자신 API를 호출할 때 절대 URL 필요:

```
# .env.local
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Vercel 배포 시 `process.env.VERCEL_URL`을 사용하거나 별도 환경변수 설정 필요.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-11 | Initial draft | dev |
