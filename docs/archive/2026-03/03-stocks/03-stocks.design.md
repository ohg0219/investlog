# 03-stocks Design Document

> **Summary**: 주식상품 CRUD 관리 — 카드 그리드 UI, 폼 입력, Yahoo Finance 자동완성, 비밀번호 재확인 모달
>
> **Project**: investlog
> **Version**: 0.1.0
> **Author**: dev
> **Date**: 2026-03-11
> **Status**: Draft
> **Complexity**: medium
> **Planning Doc**: [03-stocks.plan.md](../../01-plan/features/03-stocks.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 주식상품(종목) 목록을 카드 그리드로 시각화하며, 현재가·등락률을 즉시 확인할 수 있는 UI 구성
- Yahoo Finance 조회 버튼 방식으로 티커 입력 UX를 단순화하고 API 호출 수를 최소화
- 쓰기 작업(등록·수정·삭제) 전 비밀번호 재확인 모달로 단일 사용자 환경의 실수 방지
- 기존 다크 테마(ink/paper/accent 팔레트)와 일관된 스타일 유지

### 1.2 Design Principles

- **Server Component 우선**: 데이터 의존성 없는 레이아웃 골격은 Server Component로 선언
- **로컬 상태 격리**: 전역 상태 라이브러리 없이 컴포넌트별 `useState` + 서버 재검증 패턴 사용
- **낙관적 UI 금지**: 쓰기 작업 결과는 서버 응답 확인 후 목록 갱신 (데이터 정합성 우선)
- **Accessibility First**: 모달 focus trap, `aria-live`, `role="dialog"` 설계 단계 적용

---

## 2. Architecture

### 2.1 Component Diagram

```
/dashboard/stocks (Server Component — page.tsx)
  └─ StocksClientShell (Client Component — 목록/모달 상태 관리 허브)
       ├─ StockGrid (Client Component — 카드 목록 렌더링)
       │    └─ StockCard × N (Client Component — 개별 카드, 수정/삭제 버튼)
       ├─ StockFormModal (Client Component — 등록/수정 슬라이드 오버 모달)
       │    └─ StockForm (Client Component — 필드 그룹, Yahoo 조회 버튼)
       └─ PasswordConfirmModal (Client Component — 비밀번호 재확인 다이얼로그)
```

### 2.2 Data Flow

**페이지 초기 로드**
```
page.tsx (Server) → fetch /api/stocks (서버사이드)
  → StocksClientShell props: stocks[]
    → fetch /api/prices?tickers=... (클라이언트, 1회)
      → priceMap 상태 → StockGrid → StockCard 현재가 표시
```

**등록 흐름**
```
[+ 종목 추가] 클릭
  → StockFormModal 열림 (모드: 'create')
    → StockForm 입력 → [조회] 클릭
      → fetch /api/prices/lookup?q={ticker}
        → name/market/currency 자동 채움
    → [저장] 클릭
      → PasswordConfirmModal 열림 (action: 'create')
        → 비밀번호 입력 → [확인]
          → POST /api/stocks { password, data }
            → 성공 → 모달 닫힘 → router.refresh() → 목록 갱신
            → 실패(403) → PasswordConfirmModal 에러 표시
```

**수정 흐름**
```
StockCard [수정] 클릭
  → StockFormModal 열림 (모드: 'edit', 기존 데이터 채움)
    → 변경 후 [저장]
      → PasswordConfirmModal (action: 'edit')
        → PUT /api/stocks/[id] { password, data }
          → 성공 → router.refresh()
```

**삭제 흐름**
```
StockCard [삭제] 클릭
  → PasswordConfirmModal (action: 'delete', stockId)
    → POST body 없이 비밀번호만
      → DELETE /api/stocks/[id] { password }
        → 성공 → router.refresh()
        → 실패(409, 연결거래 존재) → 경고 메시지 표시
```

### 2.3 Dependencies

| 컴포넌트 | 의존 대상 | 목적 |
|---------|---------|------|
| `page.tsx` | `src/lib/stocks.ts` | 서버사이드 stocks 조회 |
| `StocksClientShell` | `next/navigation` `useRouter` | `router.refresh()` 트리거 |
| `StocksClientShell` | `/api/prices` (fetch) | 현재가 일괄 조회 |
| `StockForm` | `/api/prices/lookup` (fetch) | ticker 자동완성 |
| `PasswordConfirmModal` | `/api/stocks`, `/api/stocks/[id]` | CRUD 쓰기 실행 |

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
// src/types/index.ts (기존 정의 — 참조용)

/** 주식상품 DB 엔티티 */
export interface Stock {
  id: string;                                    // UUID v4, PK (Supabase 자동 생성)
  ticker: string;                                // Yahoo Finance 티커 (예: 005930.KS, AAPL)
  name: string;                                  // 종목명 (예: 삼성전자, Apple Inc.)
  market: string;                                // 거래소 식별자 (예: KRX, NASDAQ, NYSE)
  country: 'KR' | 'US' | 'JP' | (string & {}); // ISO 3166-1 alpha-2 국가코드
  currency: 'KRW' | 'USD' | 'JPY' | (string & {}); // ISO 4217 통화코드
  sector?: string;                               // 업종 (예: Technology, 반도체) — 선택
  memo?: string;                                 // 사용자 메모 — 선택
  created_at: string;                            // ISO 8601 타임스탬프 (KST)
  updated_at: string;                            // ISO 8601 타임스탬프 (KST)
}

/** POST/PUT 요청 바디 내 stock 데이터 (id, created_at, updated_at 제외) */
export interface StockInput {
  ticker: string;    // 필수
  name: string;      // 필수
  market: string;    // 필수
  country: string;   // 필수
  currency: string;  // 필수
  sector?: string;
  memo?: string;
}

/** 쓰기 요청 공통 바디 */
export interface WriteRequest<T> {
  password: string;  // 평문 비밀번호 — bcrypt 검증 후 즉시 폐기
  data: T;
}

/** DELETE 요청 바디 */
export interface DeleteRequest {
  password: string;
}

/** 현재가 조회 응답 단일 항목 */
export interface PriceQuote {
  price: number;
  currency: string;
  changePercent: number;
  name: string;
}

/** GET /api/prices 응답 전체 맵 */
export type PriceMap = Record<string, PriceQuote | null>;

/** GET /api/prices/lookup 응답 단일 항목 */
export interface LookupResult {
  ticker: string;    // Yahoo Finance 심볼
  name: string;      // 종목명
  exchange: string;  // Yahoo 거래소 코드 (KSC, NMS, NYQ 등)
  type: string;      // 항상 'EQUITY' (필터됨)
}
```

### 3.2 Supabase 테이블 스키마 (SQL)

```sql
-- stocks 테이블
CREATE TABLE IF NOT EXISTS stocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker      TEXT NOT NULL UNIQUE,           -- Yahoo Finance 티커, 중복 불가
  name        TEXT NOT NULL,
  market      TEXT NOT NULL,                  -- 거래소 식별자
  country     TEXT NOT NULL,                  -- ISO 3166-1 alpha-2
  currency    TEXT NOT NULL,                  -- ISO 4217
  sector      TEXT,                           -- NULL 허용
  memo        TEXT,                           -- NULL 허용
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stocks_updated_at
  BEFORE UPDATE ON stocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security: Service Role Key만 허용 (anon 차단)
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;

-- 조회 인덱스
CREATE INDEX idx_stocks_created_at ON stocks (created_at DESC);
CREATE UNIQUE INDEX idx_stocks_ticker ON stocks (ticker);
```

> **참고**: transactions 테이블의 stock_id FK는 04-transactions 피처에서 정의한다.
> DELETE API는 transactions 테이블에 해당 stock_id 행이 존재하는지 SELECT로 확인하며,
> DB 레벨 CASCADE/RESTRICT는 04-transactions 설계에 위임한다.

### 3.3 Entity Relationships

```
stocks (1)  ──────────────< transactions (N)
  id ──────────────────────── stock_id (FK)

- 주식상품 1개에 거래내역 0..N 개
- DELETE /api/stocks/[id] 전에 transactions.stock_id 참조 존재 여부를 애플리케이션 레이어에서 확인
- 참조 존재 시 409 반환 (DB CASCADE 대신 명시적 애플리케이션 제어)
```

### 3.4 프론트엔드 로컬 타입 (UI 상태용)

```typescript
// StocksClientShell 내부 상태
type ModalMode = 'create' | 'edit'
type WriteAction = 'create' | 'edit' | 'delete'

interface StockFormState {
  ticker: string
  name: string
  market: string
  country: string
  currency: string
  sector: string
  memo: string
}

interface PendingWrite {
  action: WriteAction
  stockId?: string        // edit/delete 시 필요
  formData?: StockFormState
}
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | 설명 | 인증 | 이중 검증 |
|--------|------|------|------|-----------|
| `GET` | `/api/stocks` | 전체 주식상품 조회 (created_at DESC) | JWT | - |
| `POST` | `/api/stocks` | 주식상품 등록 | JWT | bcrypt |
| `PUT` | `/api/stocks/[id]` | 주식상품 수정 | JWT | bcrypt |
| `DELETE` | `/api/stocks/[id]` | 주식상품 삭제 | JWT | bcrypt |
| `GET` | `/api/prices` | 현재가 일괄 조회 (쿼리: `tickers`) | JWT | - |
| `GET` | `/api/prices/lookup` | 티커 자동완성 검색 (쿼리: `q`) | JWT | - |

**공통 인증 방식**: `token` HttpOnly 쿠키 → `verifyToken()` → 실패 시 401

### 4.2 Detailed Specification

---

#### `GET /api/stocks`

**Request**

```
GET /api/stocks
Cookie: token=<JWT>
```

쿼리 파라미터 없음.

**Response 200 — 조회 성공**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "ticker": "005930.KS",
      "name": "삼성전자",
      "market": "KRX",
      "country": "KR",
      "currency": "KRW",
      "sector": "반도체",
      "memo": null,
      "created_at": "2026-03-11T10:00:00.000+09:00",
      "updated_at": "2026-03-11T10:00:00.000+09:00"
    }
  ]
}
```

- 결과가 0건인 경우 `"data": []` 반환 (404 아님)
- 정렬: `created_at DESC`

**Error Responses**

| 상태 코드 | error 코드 | 발생 조건 |
|----------|-----------|---------|
| 401 | `UNAUTHORIZED` | JWT 쿠키 없음 또는 검증 실패 |
| 500 | `INTERNAL_ERROR` | Supabase 쿼리 예외 |

---

#### `POST /api/stocks`

**Request**

```json
{
  "password": "string",
  "data": {
    "ticker": "AAPL",
    "name": "Apple Inc.",
    "market": "NASDAQ",
    "country": "US",
    "currency": "USD",
    "sector": "Technology",
    "memo": "핵심 보유 종목"
  }
}
```

| 필드 | 필수 | 검증 규칙 |
|------|------|-----------|
| `password` | Y | 비어있지 않은 문자열 |
| `data.ticker` | Y | 비어있지 않은 문자열, 중복 불가 |
| `data.name` | Y | 비어있지 않은 문자열 |
| `data.market` | Y | 비어있지 않은 문자열 |
| `data.country` | Y | 비어있지 않은 문자열 |
| `data.currency` | Y | 비어있지 않은 문자열 |
| `data.sector` | N | 문자열 또는 미포함 |
| `data.memo` | N | 문자열 또는 미포함 |

**Response 201 — 등록 성공**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "ticker": "AAPL",
    "name": "Apple Inc.",
    "market": "NASDAQ",
    "country": "US",
    "currency": "USD",
    "sector": "Technology",
    "memo": "핵심 보유 종목",
    "created_at": "2026-03-11T10:05:00.000+09:00",
    "updated_at": "2026-03-11T10:05:00.000+09:00"
  }
}
```

**Error Responses**

| 상태 코드 | error 코드 | 발생 조건 |
|----------|-----------|---------|
| 400 | `BAD_REQUEST` | 요청 바디 파싱 실패 또는 필수 필드 누락 |
| 401 | `UNAUTHORIZED` | JWT 검증 실패 |
| 403 | `FORBIDDEN` | bcrypt 비밀번호 불일치 |
| 409 | `DUPLICATE_TICKER` | ticker 중복 (Supabase UNIQUE 제약 위반) |
| 500 | `INTERNAL_ERROR` | 예상치 못한 예외 |

---

#### `PUT /api/stocks/[id]`

**Request**

```
PUT /api/stocks/550e8400-e29b-41d4-a716-446655440001
Cookie: token=<JWT>
Content-Type: application/json
```

```json
{
  "password": "string",
  "data": {
    "name": "Apple Inc. (수정)",
    "sector": "Consumer Electronics"
  }
}
```

- `data` 내 필드는 부분 수정(Partial) 가능
- `ticker` 수정 허용 (단, 중복 검사는 DB UNIQUE 제약으로 처리)
- `id`, `created_at`, `updated_at`은 data에 포함되어도 무시 (서버에서 제외)

**Response 200 — 수정 성공**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "ticker": "AAPL",
    "name": "Apple Inc. (수정)",
    "market": "NASDAQ",
    "country": "US",
    "currency": "USD",
    "sector": "Consumer Electronics",
    "memo": "핵심 보유 종목",
    "created_at": "2026-03-11T10:05:00.000+09:00",
    "updated_at": "2026-03-11T10:10:00.000+09:00"
  }
}
```

**Error Responses**

| 상태 코드 | error 코드 | 발생 조건 |
|----------|-----------|---------|
| 400 | `BAD_REQUEST` | 요청 바디 파싱 실패 또는 data 필드 없음 |
| 401 | `UNAUTHORIZED` | JWT 검증 실패 |
| 403 | `FORBIDDEN` | bcrypt 비밀번호 불일치 |
| 404 | `NOT_FOUND` | 해당 id의 주식상품 없음 |
| 409 | `DUPLICATE_TICKER` | 수정하려는 ticker가 이미 존재 |
| 500 | `INTERNAL_ERROR` | 예상치 못한 예외 |

---

#### `DELETE /api/stocks/[id]`

**Request**

```
DELETE /api/stocks/550e8400-e29b-41d4-a716-446655440001
Cookie: token=<JWT>
Content-Type: application/json
```

```json
{
  "password": "string"
}
```

**처리 순서**

1. JWT 검증
2. bcrypt 비밀번호 검증
3. `transactions` 테이블에서 `stock_id = id` 행 존재 여부 확인
4. 존재하면 409 반환 (삭제 차단)
5. 존재하지 않으면 stocks 행 삭제

**Response 204 — 삭제 성공**

```
HTTP/1.1 204 No Content
```

**Error Responses**

| 상태 코드 | error 코드 | 발생 조건 |
|----------|-----------|---------|
| 400 | `BAD_REQUEST` | password 필드 누락 |
| 401 | `UNAUTHORIZED` | JWT 검증 실패 |
| 403 | `FORBIDDEN` | bcrypt 비밀번호 불일치 |
| 404 | `NOT_FOUND` | 해당 id의 주식상품 없음 |
| 409 | `LINKED_TRANSACTIONS` | 연결된 거래내역이 존재하여 삭제 불가 |
| 500 | `INTERNAL_ERROR` | 예상치 못한 예외 |

---

#### `GET /api/prices`

**Request**

```
GET /api/prices?tickers=AAPL,005930.KS,7203.T
Cookie: token=<JWT>
```

| 쿼리 파라미터 | 필수 | 설명 |
|-------------|------|------|
| `tickers` | Y | 쉼표 구분 Yahoo Finance 티커 문자열 |

**처리 방식**

- `tickers.split(',').map(t => t.trim())` 으로 파싱
- `Promise.allSettled(tickers.map(t => yahooFinance.quote(t, { fields: ['regularMarketPrice', 'currency', 'regularMarketChangePercent', 'longName', 'shortName'] })))`
- `fulfilled`: `{ price, currency, changePercent, name }` 매핑
- `rejected`: 해당 ticker 값을 `null`로 설정

**Response 200 — 조회 성공**

```json
{
  "AAPL": {
    "price": 182.40,
    "currency": "USD",
    "changePercent": 1.2,
    "name": "Apple Inc."
  },
  "005930.KS": {
    "price": 78500,
    "currency": "KRW",
    "changePercent": -0.4,
    "name": "삼성전자"
  },
  "7203.T": null
}
```

- 전체 티커가 실패하더라도 200 반환 (`{}` 또는 모두 null인 맵)
- 개별 실패는 null로 표현, 전체 API 실패가 아님

**Error Responses**

| 상태 코드 | error 코드 | 발생 조건 |
|----------|-----------|---------|
| 400 | `BAD_REQUEST` | `tickers` 파라미터 없거나 빈 문자열 |
| 401 | `UNAUTHORIZED` | JWT 검증 실패 |
| 500 | `INTERNAL_ERROR` | Promise.allSettled 자체 예외 (극히 드묾) |

---

#### `GET /api/prices/lookup`

**Request**

```
GET /api/prices/lookup?q=삼성
Cookie: token=<JWT>
```

| 쿼리 파라미터 | 필수 | 설명 |
|-------------|------|------|
| `q` | Y | 검색 키워드 (종목명 또는 티커 일부) |

**처리 방식**

- `yahooFinance.search(q)`
- `quotes` 배열에서 `typeDisp === 'Equity'` 또는 `quoteType === 'EQUITY'` 필터
- 상위 5개만 반환 (`slice(0, 5)`)

**Response 200 — 검색 성공**

```json
[
  {
    "ticker": "005930.KS",
    "name": "삼성전자",
    "exchange": "KSC",
    "type": "EQUITY"
  },
  {
    "ticker": "005935.KS",
    "name": "삼성전자우",
    "exchange": "KSC",
    "type": "EQUITY"
  }
]
```

- 검색 결과가 없으면 `[]` 반환 (404 아님)
- `exchange`는 Yahoo Finance 거래소 코드 그대로 반환 (KSC, NMS, NYQ 등)

**Error Responses**

| 상태 코드 | error 코드 | 발생 조건 |
|----------|-----------|---------|
| 400 | `BAD_REQUEST` | `q` 파라미터 없거나 빈 문자열 |
| 401 | `UNAUTHORIZED` | JWT 검증 실패 |
| 502 | `UPSTREAM_ERROR` | yahoo-finance2 search() 예외 발생 |
| 500 | `INTERNAL_ERROR` | 예상치 못한 예외 |

---

## 5. UI/UX Design

### 5.1 Screen Layout

#### `/dashboard/stocks` 메인 페이지

```
┌──────────────────────────────────────────────────────────────────┐
│  <NavBar>  investLOG  [대시보드] [주식상품] [거래내역] [로그아웃] │
├──────────────────────────────────────────────────────────────────┤
│  주식상품 관리                              [+ 종목 추가]         │
│  font-display / text-paper                  button accent bg      │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  삼성전자    │  │  Apple Inc.  │  │  NVIDIA      │           │
│  │  005930.KS   │  │  AAPL        │  │  NVDA        │           │
│  │  KRX · KRW   │  │  NASDAQ·USD  │  │  NASDAQ·USD  │           │
│  │  반도체      │  │  Technology  │  │  Technology  │           │
│  │  ₩78,500     │  │  $182.40     │  │  $891.20     │           │
│  │  ▲ +0.4%    │  │  ▲ +1.2%    │  │  ▼ -0.3%    │           │
│  │  [수정][삭제]│  │  [수정][삭제]│  │  [수정][삭제]│           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                    │
│  ┌──────────────┐  [빈 슬롯 — 카드 추가 유도 없음]               │
│  │  Tesla, Inc. │                                                  │
│  │  TSLA        │                                                  │
│  │  ...         │                                                  │
│  └──────────────┘                                                  │
│                                                                    │
│  [주식상품이 없을 때]                                              │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  등록된 주식상품이 없습니다.                               │   │
│  │  [+ 첫 종목 추가하기]  (accent 버튼)                       │   │
│  └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

**그리드 반응형 분기점:**

| Breakpoint | 컬럼 수 |
|------------|---------|
| `< 640px` (sm 미만) | 1열 |
| `640px – 1023px` (sm ~ lg 미만) | 2열 |
| `>= 1024px` (lg 이상) | 3열 |
| `>= 1280px` (xl 이상) | 4열 |

#### StockFormModal — 등록/수정 슬라이드 오버

```
┌──────────────────────────────────────────────────────────────────┐
│  [오버레이 bg-ink/60]                                             │
│                          ┌────────────────────────────────────┐  │
│                          │  종목 추가 (또는 "종목 수정")       │  │
│                          │  ─────────────────────────────────  │  │
│                          │  티커                               │  │
│                          │  [005930.KS              ] [조회]   │  │
│                          │  ※ 한국: .KS/.KQ, 일본: .T suffix  │  │
│                          │                                     │  │
│                          │  종목명 (자동 채움)                 │  │
│                          │  [삼성전자                       ]  │  │
│                          │                                     │  │
│                          │  거래소 (자동 채움)                 │  │
│                          │  [KRX                           ]   │  │
│                          │                                     │  │
│                          │  국가                               │  │
│                          │  [KR ▼]                            │  │
│                          │                                     │  │
│                          │  통화 (자동 채움)                   │  │
│                          │  [KRW                           ]   │  │
│                          │                                     │  │
│                          │  업종 (선택)                        │  │
│                          │  [반도체                        ]   │  │
│                          │                                     │  │
│                          │  메모 (선택)                        │  │
│                          │  [장기 보유                     ]   │  │
│                          │                                     │  │
│                          │  [취소]            [저장]           │  │
│                          └────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

#### PasswordConfirmModal — 비밀번호 재확인 다이얼로그

```
┌──────────────────────────────────────────────────────────────────┐
│  [오버레이 bg-ink/70]                                             │
│                                                                    │
│              ┌────────────────────────────────────┐               │
│              │  비밀번호 확인                      │               │
│              │  ────────────────────────────────── │               │
│              │  [삭제] 작업을 위해 비밀번호를     │               │
│              │  입력해주세요.                      │               │
│              │                                     │               │
│              │  비밀번호                           │               │
│              │  [••••••••              ]           │               │
│              │                                     │               │
│              │  ✕ 비밀번호가 올바르지 않습니다    │               │
│              │  (error 시에만 visible)             │               │
│              │                                     │               │
│              │  [취소]            [확인]           │               │
│              └────────────────────────────────────┘               │
└──────────────────────────────────────────────────────────────────┘
```

---

### 5.2 Component List

| 컴포넌트 | 파일 경로 | 렌더 방식 | 책임 |
|---------|---------|---------|-----|
| `StocksPage` | `src/app/dashboard/stocks/page.tsx` | Server Component | 서버사이드 stocks 조회 후 `StocksClientShell`에 초기 데이터 전달 |
| `StocksClientShell` | `src/components/stocks/StocksClientShell.tsx` | Client Component | 모달 열림/닫힘 상태, pendingWrite 상태, priceMap fetch, router.refresh() 조율. 전체 상태 허브 |
| `StockGrid` | `src/components/stocks/StockGrid.tsx` | Client Component | stocks 배열과 priceMap을 받아 카드 그리드 렌더링. 빈 상태(empty state) 표시 책임 |
| `StockCard` | `src/components/stocks/StockCard.tsx` | Client Component | 단일 종목 카드. ticker/name/market/currency/sector/현재가/등락률 표시. 수정·삭제 버튼 클릭 이벤트 상위 전달 |
| `StockFormModal` | `src/components/stocks/StockFormModal.tsx` | Client Component | 등록/수정 모달 래퍼. 오버레이 + 슬라이드 패널 레이아웃, open/close 애니메이션 |
| `StockForm` | `src/components/stocks/StockForm.tsx` | Client Component | 7개 필드 controlled form. "조회" 버튼 클릭 시 `/api/prices/lookup` fetch, 자동 채움 로직. 유효성 검사 (ticker 필수, name 필수) |
| `PasswordConfirmModal` | `src/components/stocks/PasswordConfirmModal.tsx` | Client Component | 비밀번호 입력 다이얼로그. action(create/edit/delete)에 따라 설명 텍스트 분기. 확인 시 실제 쓰기 API 호출, 응답 처리 후 콜백 |

---

### 5.3 State Management

#### 상태 분류

| 상태 | 위치 | 타입 | 설명 |
|-----|-----|-----|-----|
| `stocks` | `StocksClientShell` (props) | `Stock[]` | 서버에서 내려받은 주식상품 목록. `router.refresh()` 후 서버 재페치로 갱신 |
| `priceMap` | `StocksClientShell` | `PriceMap` | 현재가 일괄 조회 결과. 페이지 마운트 시 1회 fetch |
| `isPriceLoading` | `StocksClientShell` | `boolean` | 가격 조회 로딩 여부 (카드에서 스켈레톤 표시용) |
| `formModalOpen` | `StocksClientShell` | `boolean` | StockFormModal 열림 여부 |
| `formModalMode` | `StocksClientShell` | `ModalMode` | 'create' 또는 'edit' |
| `editTarget` | `StocksClientShell` | `Stock \| null` | 수정 대상 종목 데이터 |
| `pendingWrite` | `StocksClientShell` | `PendingWrite \| null` | 비밀번호 확인 후 실행할 쓰기 작업 정보 |
| `pwModalOpen` | `StocksClientShell` | `boolean` | PasswordConfirmModal 열림 여부 |
| `formState` | `StockForm` | `StockFormState` | 폼 7개 필드 controlled 상태 |
| `isLookupLoading` | `StockForm` | `boolean` | ticker 조회 중 여부 |
| `lookupError` | `StockForm` | `string \| null` | ticker 조회 실패 메시지 |
| `pwValue` | `PasswordConfirmModal` | `string` | 비밀번호 입력값 |
| `isSubmitting` | `PasswordConfirmModal` | `boolean` | API 호출 진행 중 여부 |
| `pwError` | `PasswordConfirmModal` | `string \| null` | 비밀번호 불일치 또는 서버 에러 메시지 |

#### 상태 전환 다이어그램

```
[StocksClientShell 초기 마운트]
  → isPriceLoading: true
  → fetch /api/prices?tickers=...
    → 완료: priceMap 갱신, isPriceLoading: false

[+ 종목 추가 클릭]
  → formModalMode: 'create', editTarget: null, formModalOpen: true

[카드 [수정] 클릭]
  → formModalMode: 'edit', editTarget: stock, formModalOpen: true

[StockForm [저장] 클릭]
  → pendingWrite: { action: formModalMode, stockId?, formData }
  → formModalOpen: false → pwModalOpen: true

[카드 [삭제] 클릭]
  → pendingWrite: { action: 'delete', stockId }
  → pwModalOpen: true

[PasswordConfirmModal [확인] 클릭]
  → isSubmitting: true
  → API 호출 (pendingWrite.action 분기)
    → 성공: pwModalOpen: false, pendingWrite: null, router.refresh()
    → 403: pwError: '비밀번호가 올바르지 않습니다'
    → 409(delete): pwError: '연결된 거래내역이 있어 삭제할 수 없습니다'
    → 완료: isSubmitting: false
```

#### 서버 상태 전략

- 초기 `stocks` 데이터: `page.tsx` Server Component에서 직접 fetch (No client-side hydration)
- 쓰기 성공 후 `router.refresh()`: Next.js App Router의 서버 컴포넌트 캐시 무효화 트리거
- 현재가(`priceMap`): 클라이언트 마운트 후 1회 fetch, 이후 수동 새로고침으로만 갱신

---

### 5.4 Routing Structure

| 경로 | 파일 | 설명 |
|-----|-----|-----|
| `/dashboard/stocks` | `src/app/dashboard/stocks/page.tsx` | 주식상품 관리 페이지 |
| (기존) `/dashboard` | `src/app/dashboard/page.tsx` | 대시보드 |
| (기존) `/dashboard/transactions` | `src/app/dashboard/transactions/page.tsx` | 거래내역 (04-transactions 구현 예정) |

`/dashboard/stocks`는 `src/app/dashboard/layout.tsx`의 `NavBar` 레이아웃을 상속한다.
별도의 중첩 레이아웃(`stocks/layout.tsx`) 없이 `page.tsx` 단독 파일로 구성한다.

**URL 파라미터 없음**: 수정/삭제는 모달 방식으로 처리하므로 `/dashboard/stocks/[id]` 라우트 불필요.

---

## 6. Error Handling

### 6.1 에러 응답 공통 포맷

모든 에러 응답은 기존 프로젝트 패턴(02-auth)과 동일한 형태를 따른다.

```json
{
  "error": "ERROR_CODE",
  "message": "사람이 읽을 수 있는 설명 (선택)"
}
```

- `error`: 대문자 스네이크 케이스 식별자 (필수)
- `message`: 한국어 설명 (선택 — 개발 환경 디버깅 및 클라이언트 토스트 메시지 용도)

### 6.2 에러 코드 전체 목록

| 에러 코드 | HTTP 상태 | 발생 엔드포인트 | 원인 | 클라이언트 처리 |
|----------|-----------|---------------|------|---------------|
| `UNAUTHORIZED` | 401 | 전체 | JWT 쿠키 없음 또는 서명 불일치/만료 | 로그인 페이지(`/`)로 리다이렉트 |
| `FORBIDDEN` | 403 | POST, PUT, DELETE | bcrypt 비밀번호 불일치 | 비밀번호 재확인 모달에 오류 표시 |
| `BAD_REQUEST` | 400 | 전체 | 요청 바디 파싱 실패, 필수 필드 누락, 쿼리 파라미터 누락 | 입력 폼 유효성 메시지 표시 |
| `NOT_FOUND` | 404 | PUT, DELETE | 해당 `id`의 stocks 행 없음 | "종목을 찾을 수 없습니다" 안내 |
| `DUPLICATE_TICKER` | 409 | POST, PUT | stocks.ticker UNIQUE 제약 위반 | "이미 등록된 티커입니다" 안내 |
| `LINKED_TRANSACTIONS` | 409 | DELETE | transactions.stock_id FK 참조 존재 | "연결된 거래내역이 있어 삭제할 수 없습니다" 경고 다이얼로그 표시 |
| `UPSTREAM_ERROR` | 502 | GET /api/prices/lookup | yahoo-finance2 search() 예외 | "종목 검색에 실패했습니다. 티커를 직접 입력해 주세요" 안내 |
| `INTERNAL_ERROR` | 500 | 전체 | 예상치 못한 서버 예외 | 일반 오류 안내 토스트 |

### 6.3 시나리오별 상세 처리

#### JWT 검증 실패 (`UNAUTHORIZED`)

```
verifyToken(cookie) 예외 또는 null 반환
  → 401 { "error": "UNAUTHORIZED", "message": "인증이 필요합니다" }
```

- 클라이언트: fetch 응답 401 수신 시 `router.push('/')` 처리
- 평문 토큰값을 로그에 포함하지 않는다

#### bcrypt 비밀번호 불일치 (`FORBIDDEN`)

```
bcrypt.compare(password, AUTH_PASSWORD_HASH) === false
  → 403 { "error": "FORBIDDEN", "message": "비밀번호가 올바르지 않습니다" }
```

- 클라이언트: `PasswordConfirmModal` 내 에러 상태 표시, 입력 필드 초기화
- 평문 `password` 값을 로그에 포함하지 않는다
- 비밀번호 불일치 횟수 제한 없음 (단일 사용자 앱 — 추후 피처에서 검토)

#### 연결 거래내역 존재 (`LINKED_TRANSACTIONS`)

```
supabase.from('transactions').select('id').eq('stock_id', id).limit(1)
  → count > 0
  → 409 { "error": "LINKED_TRANSACTIONS", "message": "연결된 거래내역이 있어 삭제할 수 없습니다" }
```

- 클라이언트: 삭제 확인 다이얼로그를 닫고 409 안내 다이얼로그를 표시
- `LINKED_TRANSACTIONS`는 `DUPLICATE_TICKER`와 동일한 409 상태이지만 error 코드로 구분

#### yahoo-finance2 조회 실패

**GET /api/prices (일부 실패)**
```
Promise.allSettled 결과에서 rejected 항목
  → 해당 ticker 키의 값을 null로 설정
  → 전체 응답은 200 유지 (다른 성공 항목 포함)
```

**GET /api/prices (전체 실패)**
```
모든 ticker가 rejected
  → { "AAPL": null, "005930.KS": null, ... }
  → 200 반환 (빈 가격 맵 — API 자체 실패 아님)
```

**GET /api/prices/lookup (search 전체 실패)**
```
yahooFinance.search(q) 예외
  → catch → 502 { "error": "UPSTREAM_ERROR", "message": "종목 검색에 실패했습니다. 티커를 직접 입력해 주세요" }
```

#### Supabase 예외

```
supabase 쿼리 예외 (네트워크, 권한 등)
  → catch → 500 { "error": "INTERNAL_ERROR" }
```

- Supabase 에러 상세(error.message)는 서버 로그에만 기록, 응답 바디에 포함하지 않는다

### 6.4 환경변수 누락 (Fail Fast)

| 변수명 | 사용 위치 | 누락 시 동작 |
|--------|---------|------------|
| `AUTH_PASSWORD_HASH` | 쓰기 Route Handler (bcrypt.compare) | 모듈 로드 시 `throw new Error('AUTH_PASSWORD_HASH is not set')` — 서버 기동 즉시 실패 |
| `JWT_SECRET` | verifyToken (lib/auth.ts) | `throw new Error('JWT_SECRET is not set')` — 서버 기동 즉시 실패 |
| `SUPABASE_URL` | lib/supabase.ts | `throw new Error('SUPABASE_URL is not set')` — 서버 기동 즉시 실패 |
| `SUPABASE_SERVICE_ROLE_KEY` | lib/supabase.ts | `throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')` — 서버 기동 즉시 실패 |

### 6.5 프론트엔드 에러 처리 (클라이언트 시각)

| 에러 상황 | HTTP | 컴포넌트 | 처리 방식 |
|----------|------|---------|---------|
| ticker 조회 실패 (Yahoo) | 502 | `StockForm` | `lookupError` 상태 → 필드 아래 인라인 메시지 |
| 비밀번호 불일치 | 403 | `PasswordConfirmModal` | `pwError` 상태 → `aria-live` 인라인 메시지, 입력값 초기화 |
| 연결 거래 존재 삭제 시도 | 409 LINKED_TRANSACTIONS | `PasswordConfirmModal` | `pwError` → "연결된 거래내역이 있어 삭제할 수 없습니다" |
| ticker 중복 | 409 DUPLICATE_TICKER | `PasswordConfirmModal` | `pwError` → "이미 등록된 티커입니다" |
| 네트워크 오류 | — | 각 컴포넌트 | catch → 일반 오류 메시지 |
| stocks 목록 로드 실패 | 서버 | `page.tsx` | Next.js error.tsx 위임 (전역 처리) |
| 현재가 부분 실패 | — | `StockCard` | `priceMap[ticker] === null` 시 "—" 표시 |
| JWT 만료 | 401 | 모든 fetch 호출 | `router.push('/')` 리다이렉트 |

---

## 7. Security Considerations

- [x] 쓰기 API 호출 시 `password` 필드를 요청 바디에 포함 — 서버에서 bcrypt 검증
- [x] `PasswordConfirmModal`의 비밀번호 입력 필드: `type="password"`, `autocomplete="current-password"`
- [x] 확인 후 비밀번호 입력값(`pwValue`) 즉시 초기화 (모달 닫힘 또는 오류 시)
- [x] `StockForm`의 조회 버튼 방식: 불필요한 연속 API 호출 방지 (디바운스 대신 명시적 트리거)
- [x] 모달 닫힘 시 모든 로컬 상태 초기화 (이전 작업 데이터 잔류 방지)

---

## 8. Acceptance Criteria

### 8.1 Functional Acceptance Criteria

| ID | Criteria | 검증 방법 | Priority |
|----|----------|----------|----------|
| AC-01 | Given 로그인 상태 / When /dashboard/stocks 진입 / Then 등록된 주식상품 카드 목록 표시 | 수동 테스트 | Must |
| AC-02 | Given 카드 목록 / When 페이지 진입 완료 / Then 현재가·등락률 1회 조회하여 카드에 표시 | 수동 테스트 | Must |
| AC-03 | Given ticker 입력 후 [조회] 클릭 / When Yahoo Finance 응답 / Then name·market·currency 자동 채움 | 수동 테스트 | Must |
| AC-04 | Given [+ 종목 추가] 클릭 → 폼 작성 → [저장] / When 비밀번호 입력 → [확인] / Then DB 저장 후 카드 목록 갱신 | 수동 테스트 | Must |
| AC-05 | Given [수정] 클릭 / When 폼에 기존 데이터 채워짐 확인 / Then 수정 후 저장 → 카드 갱신 | 수동 테스트 | Must |
| AC-06 | Given 거래내역 없는 종목 [삭제] / When 비밀번호 확인 / Then 삭제 후 카드 제거 | 수동 테스트 | Must |
| AC-07 | Given 거래내역 있는 종목 [삭제] 시도 / When 비밀번호 확인 / Then 409 에러 → "연결된 거래내역이 있어 삭제할 수 없습니다" 표시 | 수동 테스트 | Must |
| AC-08 | Given 비밀번호 불일치 / When PasswordConfirmModal 확인 / Then "비밀번호가 올바르지 않습니다" 표시, 입력값 초기화 | 수동 테스트 | Must |
| AC-09 | Given Yahoo Finance 조회 실패 / When [조회] 클릭 / Then 폼 내 에러 메시지 표시, 자동 채움 미실행 | 수동 테스트 | Must |
| AC-10 | Given 주식상품 0개 / When 페이지 진입 / Then 빈 상태 메시지 + 첫 종목 추가 버튼 표시 | 수동 테스트 | Should |
| AC-11 | Given 현재가 조회 중 / When 카드 렌더링 / Then 현재가 영역 로딩 표시(—) | 수동 테스트 | Should |
| AC-12 | Given 국가 코드 선택(KR) / When 티커 suffix 안내 / Then ".KS, .KQ 사용" 힌트 텍스트 표시 | 수동 테스트 | Could |

### 8.2 Non-Functional Acceptance Criteria

| Category | Criteria | 검증 방법 |
|----------|----------|---------|
| Accessibility | PasswordConfirmModal: `role="dialog"`, `aria-modal="true"`, focus trap 적용 | DOM 검사 |
| Accessibility | 에러 메시지: `aria-live="polite"` | DOM 검사 |
| UX | 모달 열림 시 첫 번째 입력 필드로 자동 포커스 | 수동 테스트 |
| UX | `Escape` 키로 모달 닫힘 | 수동 테스트 |
| Code Quality | Zero lint errors | ESLint 실행 |
| Code Quality | TypeScript strict 통과 | `tsc --noEmit` |

### 8.3 Edge Cases

| ID | 시나리오 | 예상 동작 |
|----|---------|---------|
| EC-01 | 현재가 조회 시 일부 ticker Yahoo 응답 실패 | 해당 카드 현재가 "—" 표시, 나머지 정상 표시 |
| EC-02 | ticker 필드 공백으로 [조회] 클릭 | fetch 미호출, "티커를 입력하세요" 인라인 메시지 |
| EC-03 | [저장] 후 PasswordConfirmModal 열린 상태에서 브라우저 뒤로가기 | 모달 닫힘, 페이지 유지 (`router.push` 미호출) |
| EC-04 | API 호출 중 [확인] 재클릭 | `isSubmitting: true` 시 버튼 `disabled`, 중복 호출 방지 |
| EC-05 | 등록 폼 [취소] 클릭 | 모달 닫힘, 입력 내용 초기화 |
| EC-06 | 수정 폼 [취소] 클릭 | 모달 닫힘, 원본 데이터 복원 (변경 미저장) |
| EC-07 | 빈 name으로 [저장] 시도 | HTML5 `required` 또는 JS 유효성 체크 → 제출 차단 |
| EC-08 | 현재가 변동 표시: 0.0% (보합) | neutral 색상 (`text-warm-mid`), 방향 화살표 없음 |

---

## 9. TDD Test Scenarios

### 9.1 Test Strategy

- **Approach**: TDD (Red-Green-Refactor)
- **Scope**: StockGrid, StockCard, StockForm, PasswordConfirmModal 컴포넌트 유닛 테스트
- **Coverage Target**: 80%+
- **Test Framework**: Vitest + @testing-library/react + @testing-library/user-event + msw

**테스트 파일 위치:**
```
src/
  __tests__/
    components/
      stocks/
        StockGrid.test.tsx
        StockCard.test.tsx
        StockForm.test.tsx
        PasswordConfirmModal.test.tsx
        StocksClientShell.test.tsx
```

**MSW 핸들러 (추가 필요):**
```
src/__tests__/mocks/handlers/stocks.ts
  - GET /api/stocks
  - POST /api/stocks
  - PUT /api/stocks/:id
  - DELETE /api/stocks/:id
  - GET /api/prices
  - GET /api/prices/lookup
```

---

### 9.2 Test Scenario List

#### StockGrid 렌더 테스트

**사전 조건**: `stocks` 배열과 `priceMap` props, 이벤트 핸들러 mock 전달.

| ID | 시나리오 | 입력 조건 | 기대 결과 | Priority |
|----|---------|---------|---------|----------|
| FE-01 | 종목 목록 렌더링 | `stocks` 3개 | 카드 3개 DOM 존재 | Critical |
| FE-02 | 빈 상태 메시지 | `stocks=[]` | "등록된 주식상품이 없습니다" 텍스트 존재 | Critical |
| FE-03 | 빈 상태 추가 버튼 | `stocks=[]` | "첫 종목 추가하기" 버튼 존재 | High |
| FE-04 | 현재가 표시 | `priceMap: { AAPL: { price: 182.40, ... } }` | "$182.40" 텍스트 존재 | High |
| FE-05 | 현재가 null 시 | `priceMap: { AAPL: null }` | "—" 텍스트 표시 | High |
| FE-06 | 로딩 중 현재가 | `isPriceLoading: true` | 모든 카드 가격 영역 "—" 표시 | Medium |

#### StockCard 렌더/인터랙션 테스트

| ID | 시나리오 | 입력 조건 | 기대 결과 | Priority |
|----|---------|---------|---------|----------|
| FE-10 | 기본 정보 렌더링 | `stock: { ticker: 'AAPL', name: 'Apple', market: 'NASDAQ', currency: 'USD', sector: 'Technology' }` | 각 텍스트 DOM 존재 | Critical |
| FE-11 | 상승 등락률 색상 | `priceQuote: { changePercent: 1.2 }` | green 색상 클래스, "▲ +1.2%" 텍스트 | High |
| FE-12 | 하락 등락률 색상 | `priceQuote: { changePercent: -0.3 }` | red 색상 클래스, "▼ -0.3%" 텍스트 | High |
| FE-13 | 보합 등락률 | `priceQuote: { changePercent: 0 }` | warm-mid 색상, 방향 화살표 없음 | Medium |
| FE-14 | [수정] 클릭 이벤트 | `onEdit` mock 전달 후 클릭 | `onEdit(stock)` 1회 호출 | Critical |
| FE-15 | [삭제] 클릭 이벤트 | `onDelete` mock 전달 후 클릭 | `onDelete(stock.id)` 1회 호출 | Critical |
| FE-16 | sector 없을 때 | `stock: { sector: undefined }` | sector 영역 렌더링 안 됨 or 빈 문자열 | Medium |

#### StockForm 테스트

**사전 조건**: MSW `/api/prices/lookup` 핸들러 설정.

| ID | 시나리오 | 입력 조건 | 기대 결과 | Priority |
|----|---------|---------|---------|----------|
| FE-20 | 초기 렌더링 — 필드 존재 | 컴포넌트 마운트 | ticker/name/market/country/currency/sector/memo 입력 요소 존재 | Critical |
| FE-21 | ticker 입력 controlled | `userEvent.type(tickerInput, 'AAPL')` | input value = 'AAPL' | High |
| FE-22 | [조회] 클릭 → 자동 채움 | ticker='AAPL', MSW lookup 성공 응답 | name/market/currency 필드 자동 채움 | Critical |
| FE-23 | [조회] 중 로딩 상태 | MSW 지연 중 | 조회 버튼 `disabled`, 로딩 텍스트 | High |
| FE-24 | [조회] 실패 에러 표시 | MSW 404 응답 | `lookupError` 인라인 메시지 표시 | High |
| FE-25 | ticker 공백 [조회] 방지 | ticker='', 조회 클릭 | fetch 미호출, 인라인 에러 | High |
| FE-26 | edit 모드 초기값 | `initialData: stock` props | 각 필드에 stock 데이터 채워짐 | Critical |
| FE-27 | [저장] 클릭 onSubmit 호출 | 필수 필드 입력 후 저장 | `onSubmit(formState)` 1회 호출 | Critical |
| FE-28 | name 공백 [저장] 차단 | name='', 저장 클릭 | `onSubmit` 미호출, 유효성 메시지 | High |
| FE-29 | country select 변경 | `userEvent.selectOptions(countrySelect, 'US')` | value='US' 반영 | Medium |

#### PasswordConfirmModal 테스트

**사전 조건**: MSW `/api/stocks`, `/api/stocks/:id` 핸들러 설정.

| ID | 시나리오 | 입력 조건 | 기대 결과 | Priority |
|----|---------|---------|---------|----------|
| FE-30 | 모달 열림 상태 렌더링 | `open: true, action: 'create'` | 다이얼로그 DOM 존재, 비밀번호 입력 포커스 | Critical |
| FE-31 | action별 설명 텍스트 — 등록 | `action: 'create'` | "등록" 작업 텍스트 표시 | Medium |
| FE-32 | action별 설명 텍스트 — 삭제 | `action: 'delete'` | "삭제" 작업 텍스트 표시 | Medium |
| FE-33 | 비밀번호 입력 controlled | `userEvent.type(pwInput, 'pass')` | input value = 'pass', type='password' | High |
| FE-34 | 등록 확인 — 성공 | MSW POST 200, pw 입력 후 확인 | `onSuccess` 1회 호출, 모달 닫힘 | Critical |
| FE-35 | 삭제 확인 — 성공 | MSW DELETE 200 | `onSuccess` 1회 호출 | Critical |
| FE-36 | 비밀번호 불일치 — 403 | MSW 403 응답 | "비밀번호가 올바르지 않습니다" 표시, 입력 초기화 | Critical |
| FE-37 | 연결 거래 삭제 — 409 | MSW DELETE 409 | "연결된 거래내역이 있어 삭제할 수 없습니다" | High |
| FE-38 | 확인 중 로딩 | MSW 지연 중 | 확인 버튼 `disabled`, isSubmitting 상태 | High |
| FE-39 | 중복 제출 방지 | isSubmitting=true 상태 클릭 | fetch 1회만 호출 | High |
| FE-40 | [취소] 클릭 | 취소 버튼 클릭 | `onClose` 1회 호출, 비밀번호 초기화 | High |
| FE-41 | Escape 키 닫힘 | `userEvent.keyboard('{Escape}')` | `onClose` 1회 호출 | Medium |
| FE-42 | role="dialog" 존재 | 마운트 | `role="dialog"`, `aria-modal="true"` | High |
| FE-43 | 모달 닫힘 상태 | `open: false` | 다이얼로그 DOM 미존재 or hidden | Critical |

---

### 9.3 Edge Cases

| ID | 케이스 | 예상 동작 | 검증 방법 |
|----|--------|---------|---------|
| EC-01 | 현재가 조회 중 부분 ticker 실패 | 실패 ticker `priceMap[ticker] = null`, 성공 ticker 정상 표시 | MSW `Promise.allSettled` mock |
| EC-02 | 대용량 종목 목록 (50개+) | 그리드 렌더링 오류 없음, 스크롤 동작 | 50개 mock data로 렌더 테스트 |
| EC-03 | 수정 도중 다른 카드 [삭제] 클릭 | 이전 모달 상태 초기화 후 삭제 모달 열림 (단, 구현에서 동시 오픈 방지) | 이벤트 순서 테스트 |
| EC-04 | 네트워크 오류 (fetch reject) | `pwError`: "연결에 실패했습니다", `onSuccess` 미호출 | MSW network error 설정 |
| EC-05 | ticker에 한글 입력 후 [조회] | 조회 버튼 실행, API 에러 → lookupError 표시 | `userEvent.type(input, '삼성')` |

---

## 10. Implementation Guide

### 10.1 File Structure

```
src/
  app/
    dashboard/
      stocks/
        page.tsx                         ← Server Component, stocks 초기 로드
  components/
    stocks/
      StocksClientShell.tsx              ← Client Component, 상태 허브
      StockGrid.tsx                      ← Client Component, 카드 그리드
      StockCard.tsx                      ← Client Component, 개별 카드
      StockFormModal.tsx                 ← Client Component, 등록/수정 모달 래퍼
      StockForm.tsx                      ← Client Component, 7필드 폼
      PasswordConfirmModal.tsx           ← Client Component, 비밀번호 확인 다이얼로그
  app/api/
    stocks/
      route.ts                           ← GET /api/stocks, POST /api/stocks
      [id]/
        route.ts                         ← PUT /api/stocks/[id], DELETE /api/stocks/[id]
    prices/
      route.ts                           ← GET /api/prices?tickers=
      lookup/
        route.ts                         ← GET /api/prices/lookup?q=
  lib/
    stocks.ts                            ← Supabase stocks CRUD 유틸 (서버 전용)
    yahoo.ts                             ← yahoo-finance2 래퍼 (서버 전용)
  __tests__/
    components/
      stocks/
        StockGrid.test.tsx
        StockCard.test.tsx
        StockForm.test.tsx
        PasswordConfirmModal.test.tsx
        StocksClientShell.test.tsx
    mocks/
      handlers/
        stocks.ts                        ← MSW 핸들러 (stocks, prices)
```

---

### 10.2 Implementation Order (프론트엔드)

프론트엔드 구현은 백엔드 API 구현 완료 후 또는 MSW mock 병행하여 진행한다.

| 순서 | 파일 | 선행 조건 | 설명 |
|-----|-----|---------|-----|
| 1 | `src/__tests__/mocks/handlers/stocks.ts` | — | MSW 핸들러 먼저 작성 (TDD 기반) |
| 2 | `src/__tests__/components/stocks/StockCard.test.tsx` | MSW 핸들러 | StockCard 테스트 작성 |
| 3 | `src/components/stocks/StockCard.tsx` | 테스트 | Red → Green |
| 4 | `src/__tests__/components/stocks/StockGrid.test.tsx` | StockCard | StockGrid 테스트 작성 |
| 5 | `src/components/stocks/StockGrid.tsx` | 테스트 | Red → Green |
| 6 | `src/__tests__/components/stocks/StockForm.test.tsx` | MSW lookup 핸들러 | StockForm 테스트 작성 |
| 7 | `src/components/stocks/StockForm.tsx` | 테스트 | Red → Green, Yahoo 조회 로직 포함 |
| 8 | `src/__tests__/components/stocks/PasswordConfirmModal.test.tsx` | MSW 핸들러 | PasswordConfirmModal 테스트 작성 |
| 9 | `src/components/stocks/PasswordConfirmModal.tsx` | 테스트 | Red → Green, focus trap 포함 |
| 10 | `src/components/stocks/StockFormModal.tsx` | StockForm | 모달 래퍼, 오버레이 애니메이션 |
| 11 | `src/components/stocks/StocksClientShell.tsx` | 모든 하위 컴포넌트 | 상태 조율, priceMap fetch, router.refresh() |
| 12 | `src/app/dashboard/stocks/page.tsx` | StocksClientShell | Server Component, 초기 데이터 fetch |

---

### 10.3 Implementation Order (백엔드)

| 순서 | 파일 | 설명 |
|-----|-----|-----|
| 1 | Supabase SQL 실행 | 3.2 스키마 (stocks 테이블, 트리거, RLS, 인덱스) |
| 2 | `src/lib/stocks.ts` | Supabase CRUD 유틸 함수 (getStocks, createStock, updateStock, deleteStock) |
| 3 | `src/lib/yahoo.ts` | yahoo-finance2 래퍼 (getQuotes, searchTickers) |
| 4 | `src/app/api/stocks/route.ts` | GET /api/stocks, POST /api/stocks |
| 5 | `src/app/api/stocks/[id]/route.ts` | PUT /api/stocks/[id], DELETE /api/stocks/[id] |
| 6 | `src/app/api/prices/route.ts` | GET /api/prices?tickers= |
| 7 | `src/app/api/prices/lookup/route.ts` | GET /api/prices/lookup?q= |

---

**구현 시 주의사항:**

- `StockCard`, `StockGrid`는 순수 표현 컴포넌트로 유지 — fetch 로직 없음
- `PasswordConfirmModal`의 focus trap: 모달 내 첫 번째 포커스 가능 요소(`autoFocus`)와 `onKeyDown Escape` 처리
- `StocksClientShell`에서 `useEffect`로 마운트 시 `/api/prices` 1회 fetch — dependency array: `[]`
- `router.refresh()` 호출 후 UI 깜빡임 최소화: 쓰기 성공 직후 모달 닫힘 → refresh (순서 유지)
- 다크 테마 색상 토큰: 상승 `text-green-bright`, 하락 `text-red-bright`, 보합 `text-warm-mid` (기존 StockTicker 패턴 재사용)
- 버튼 스타일: 기존 `LoginForm` 패턴 준수 (`font-mono text-sm tracking-widest`, focus-visible ring)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-11 | Initial draft — full-stack design (sections 1-10) | dev |
