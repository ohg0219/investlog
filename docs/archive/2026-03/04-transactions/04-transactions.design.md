# 04-transactions Design Document

> **Summary**: 거래내역(매수/매도/배당) CRUD 관리 — 테이블 UI, 필터, 폼 모달, API
>
> **Project**: investlog
> **Version**: 0.2.0
> **Author**: dev
> **Date**: 2026-03-11
> **Status**: Draft
> **Complexity**: medium
> **Planning Doc**: [04-transactions.plan.md](../../01-plan/features/04-transactions.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 매수/매도/배당 거래 내역을 날짜 역순 테이블로 표시하며, 유형·통화·종목 필터와 페이지네이션을 제공
- stocks JOIN으로 ticker/name/currency를 포함한 단일 API 응답으로 클라이언트 요청 수를 최소화
- 쓰기 작업(추가·수정·삭제) 시 JWT + bcrypt 이중 검증으로 단일 사용자 환경의 보안 강화
- DIVIDEND 거래 시 수량/단가 필드를 생략하고 금액(amount)만 필수로 처리

### 1.2 Design Principles

- **Server Component 우선**: 테이블 초기 데이터는 서버사이드 fetch로 렌더링
- **서버사이드 필터**: stock_id 필터는 API 쿼리 파라미터로 처리, 클라이언트 필터(유형/통화)는 UI에서 처리
- **낙관적 UI 금지**: 쓰기 결과는 서버 응답 확인 후 목록 갱신
- **타입 안전성**: TransactionType union으로 BUY/SELL/DIVIDEND 외 값 컴파일 타임 차단

---

## 2. Architecture

### 2.1 Component Diagram

```
/dashboard/transactions (Server Component — page.tsx)
  └─ TransactionsClientShell (Client Component — 목록/모달 상태 관리 허브)
       ├─ TransactionFilterBar (Client Component — 유형/통화 select, 종목 검색 input)
       ├─ TransactionTable (Client Component — 테이블 렌더링)
       │    └─ TransactionRow × N (행별 수정/삭제 버튼 hover 노출)
       │         └─ TransactionTypeBadge (유형 chip — BUY/SELL/DIVIDEND)
       ├─ Pagination (Client Component — 10건씩 번호 페이지네이션)
       ├─ TransactionFormModal (Client Component — 추가/수정 모달)
       │    └─ TransactionForm (Client Component — 주식상품 선택, 유형, 날짜, 수량, 단가, 금액, 메모, 비밀번호)
       └─ PasswordConfirmModal (Client Component — 삭제 비밀번호 확인)
```

### 2.2 Data Flow

**페이지 초기 로드**
```
page.tsx (Server) → GET /api/transactions (서버사이드)
  → TransactionsClientShell props: transactions[], stocks[]
    → TransactionTable 렌더링 (stocks JOIN 포함 데이터)
```

**필터 적용 흐름**
```
TransactionFilterBar → 유형/통화 select 변경 or 종목 검색 input (300ms 디바운스)
  → 필터 상태 변경 → fetch /api/transactions?stock_id=uuid (종목 필터)
  → 클라이언트 필터링 (유형/통화 — API 쿼리 없이 클라이언트에서 slice)
    → TransactionTable 재렌더링, 페이지 번호 초기화
```

**추가 흐름**
```
[+ 거래 추가] 클릭
  → TransactionFormModal 열림 (모드: 'create')
    → 주식상품 선택 드롭다운 (props로 전달된 stocks[] 사용)
    → 선택 시 현재가 fetch → 배지 표시
    → 유형 선택 → 수량/단가 필드 조건부 마운트/해제
    → 수량 × 단가 → amount 자동 계산
    → [저장하기] 클릭 + 비밀번호 입력
      → POST /api/transactions { password, data }
        → 성공 → 모달 닫힘 → router.refresh()
        → 실패(403) → 비밀번호 에러 인라인 표시
```

**수정 흐름**
```
TransactionRow [수정] hover 클릭
  → TransactionFormModal 열림 (모드: 'edit', 기존 데이터 채움)
    → 수정 후 [저장하기]
      → PUT /api/transactions/[id] { password, data }
        → 성공 → router.refresh()
```

**삭제 흐름**
```
TransactionRow [삭제] hover 클릭
  → PasswordConfirmModal (transactionId)
    → 비밀번호 입력 → [확인]
      → DELETE /api/transactions/[id] { password }
        → 성공 → router.refresh()
        → 실패(403) → 에러 메시지 표시
```

### 2.3 Dependencies

| 컴포넌트 | 의존 대상 | 목적 |
|---------|---------|------|
| `page.tsx` | `src/lib/transactions.ts` | 서버사이드 transactions 조회 |
| `page.tsx` | `src/lib/stocks.ts` | 서버사이드 stocks 조회 (폼 드롭다운 초기값) |
| `TransactionsClientShell` | `next/navigation` `useRouter` | `router.refresh()` 트리거 |
| `TransactionsClientShell` | `/api/transactions` (fetch) | 종목 필터 적용 시 클라이언트 재조회 |
| `TransactionForm` | `/api/prices` (fetch) | 주식 선택 시 현재가 조회 (배지 표시) |
| `TransactionForm` | `/api/transactions`, `/api/transactions/[id]` | POST/PUT 실행 |
| `PasswordConfirmModal` | `/api/transactions/[id]` | DELETE 실행 |

---

## 3. Data Model

### 3.1 Transaction 엔티티

```typescript
// src/types/index.ts (기존 정의 — 참조용)

export type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND';

/** 거래내역 DB 엔티티 */
export interface Transaction {
  id: string;              // UUID v4, PK (Supabase 자동 생성)
  stock_id: string;        // stocks.id FK (NOT NULL)
  type: TransactionType;   // 거래 유형: BUY | SELL | DIVIDEND
  date: string;            // 거래일 (YYYY-MM-DD)
  quantity?: number;       // 수량 — BUY/SELL 필수, DIVIDEND null 허용
  price?: number;          // 단가 — Stock.currency 기준, DIVIDEND null 허용
  amount: number;          // 총 금액 (NOT NULL) — Stock.currency 기준
  memo?: string;           // 거래 메모 — 선택
  created_at: string;      // ISO 8601 타임스탬프 (KST)
  updated_at: string;      // ISO 8601 타임스탬프 (KST)
}
```

**Supabase 테이블 스키마 (SQL)**

```sql
-- transactions 테이블
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id    UUID NOT NULL REFERENCES stocks(id),  -- FK, NOT NULL
  type        TEXT NOT NULL CHECK (type IN ('BUY', 'SELL', 'DIVIDEND')),
  date        DATE NOT NULL,                          -- YYYY-MM-DD
  quantity    NUMERIC,                                -- NULL 허용 (DIVIDEND)
  price       NUMERIC,                                -- NULL 허용 (DIVIDEND)
  amount      NUMERIC NOT NULL,                       -- 총 금액, NOT NULL
  memo        TEXT,                                   -- NULL 허용
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신 트리거 (stocks 테이블과 동일 함수 재사용)
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security: Service Role Key만 허용 (anon 차단)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 조회 인덱스
CREATE INDEX idx_transactions_date ON transactions (date DESC);
CREATE INDEX idx_transactions_stock_id ON transactions (stock_id);
```

> **FK 정책**: DB 레벨 CASCADE/RESTRICT를 설정하지 않는다. stocks DELETE 시 애플리케이션 레이어에서
> transactions.stock_id 참조 여부를 SELECT로 확인 후 409를 반환한다 (03-stocks 설계 방침 계승).

### 3.2 TransactionWithStock (JOIN 결과 타입)

`GET /api/transactions` 응답에서 stocks 테이블을 JOIN하여 반환하는 확장 타입이다.

```typescript
/** GET /api/transactions 응답 항목 — stocks JOIN 포함 */
export interface TransactionWithStock extends Transaction {
  stock: {
    ticker: string;    // Yahoo Finance 티커 (예: 005930.KS, AAPL)
    name: string;      // 종목명 (예: 삼성전자, Apple Inc.)
    currency: string;  // ISO 4217 통화코드 (예: KRW, USD, JPY)
  };
}
```

Supabase 쿼리 패턴:
```
supabase
  .from('transactions')
  .select('*, stock:stocks(ticker, name, currency)')
  .order('date', { ascending: false })
```

### 3.3 TransactionInput (POST/PUT 요청 데이터)

```typescript
/** POST /api/transactions, PUT /api/transactions/[id] 요청 바디의 data 필드 */
export interface TransactionInput {
  stock_id: string;       // 필수 — 유효한 stocks.id UUID
  type: TransactionType;  // 필수 — 'BUY' | 'SELL' | 'DIVIDEND'
  date: string;           // 필수 — YYYY-MM-DD 형식
  quantity?: number;      // BUY/SELL 필수, DIVIDEND 생략 가능 (양수)
  price?: number;         // BUY/SELL 필수, DIVIDEND 생략 가능 (양수)
  amount: number;         // 필수 — 양수, BUY/SELL 시 quantity × price 일치 권장
  memo?: string;          // 선택
}

/** POST /api/transactions 요청 바디 */
export type CreateTransactionRequest = WriteRequest<TransactionInput>;

/** PUT /api/transactions/[id] 요청 바디 */
export type UpdateTransactionRequest = WriteRequest<TransactionInput>;

/** DELETE /api/transactions/[id] 요청 바디 */
// 기존 DeleteRequest 타입 재사용 — { password: string }
```

### 3.4 프론트엔드 로컬 타입 (UI 상태용)

```typescript
// TransactionsClientShell 내부 상태

type TransactionModalMode = 'create' | 'edit'

interface TransactionFormState {
  stock_id: string
  type: TransactionType
  date: string           // YYYY-MM-DD
  quantity: string       // 입력 편의상 string, 제출 시 number 변환
  price: string          // 입력 편의상 string, 제출 시 number 변환
  amount: string         // 자동 계산 또는 직접 입력 (DIVIDEND)
  memo: string
  password: string       // 폼 내 비밀번호 섹션
}

interface FilterState {
  type: TransactionType | 'ALL'
  currency: 'KRW' | 'USD' | 'ALL'
  stockSearch: string    // 디바운스 처리 후 stock_id 조회에 사용
}

interface PendingDelete {
  transactionId: string
}
```

### 3.5 엔티티 관계도

```
stocks (1) ─────────────────────< transactions (N)
  id (UUID, PK)                    stock_id (UUID, FK → stocks.id)
  ticker                           type       ('BUY' | 'SELL' | 'DIVIDEND')
  name                             date       (DATE)
  market                           quantity   (NUMERIC, nullable)
  country                          price      (NUMERIC, nullable)
  currency         ←─ JOIN ──      amount     (NUMERIC, NOT NULL)
  sector                           memo       (TEXT, nullable)
  memo                             created_at
  created_at                       updated_at
  updated_at

관계:
  - stocks 1개 : transactions 0..N
  - stock_id NOT NULL — 거래내역은 반드시 종목에 귀속
  - stocks 삭제 시: 애플리케이션에서 transactions 참조 확인 → 존재하면 409 반환
  - transactions 삭제 시: stocks에 영향 없음
```

---

## 4. API Specification

### 4.1 엔드포인트 목록

| Method | Path | 설명 | 인증 | 이중 검증 |
|--------|------|------|------|-----------|
| `GET` | `/api/transactions` | 거래내역 조회 (stocks JOIN, date DESC) | JWT | - |
| `POST` | `/api/transactions` | 거래내역 추가 | JWT | bcrypt |
| `PUT` | `/api/transactions/[id]` | 거래내역 수정 | JWT | bcrypt |
| `DELETE` | `/api/transactions/[id]` | 거래내역 삭제 | JWT | bcrypt |

**공통 인증 방식**: `token` HttpOnly 쿠키 → `verifyToken()` → 실패 시 401 `UNAUTHORIZED`

**공통 응답 포맷**:
- 성공: `{ "data": ... }`
- 실패: `{ "error": "ERROR_CODE", "message": "한국어 설명 (선택)" }`

### 4.2 상세 명세

---

#### `GET /api/transactions`

**Request**

```
GET /api/transactions?stock_id=550e8400-e29b-41d4-a716-446655440000
Cookie: token=<JWT>
```

| 쿼리 파라미터 | 필수 | 설명 |
|--------------|------|------|
| `stock_id` | N | 특정 종목 UUID로 필터링. 미제공 시 전체 조회 |

> 페이지네이션(page, limit)은 클라이언트사이드에서 처리한다. API는 전체 데이터를 반환하며,
> 클라이언트가 10건씩 슬라이스하여 표시한다. 데이터 규모가 커지면 서버사이드 페이지네이션으로 전환한다.

**Response 200 — 조회 성공**

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "stock_id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "BUY",
      "date": "2026-03-10",
      "quantity": 10,
      "price": 78500,
      "amount": 785000,
      "memo": "분할 매수",
      "created_at": "2026-03-11T10:00:00.000+09:00",
      "updated_at": "2026-03-11T10:00:00.000+09:00",
      "stock": {
        "ticker": "005930.KS",
        "name": "삼성전자",
        "currency": "KRW"
      }
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "stock_id": "660f9511-f30c-52e5-b827-557766551111",
      "type": "DIVIDEND",
      "date": "2026-03-05",
      "quantity": null,
      "price": null,
      "amount": 150.00,
      "memo": null,
      "created_at": "2026-03-11T09:00:00.000+09:00",
      "updated_at": "2026-03-11T09:00:00.000+09:00",
      "stock": {
        "ticker": "AAPL",
        "name": "Apple Inc.",
        "currency": "USD"
      }
    }
  ]
}
```

- 결과 0건: `"data": []` 반환 (404 아님)
- 정렬: `date DESC` (동일 date는 `created_at DESC` 보조 정렬)
- `quantity`, `price`는 DIVIDEND 유형에서 `null`로 반환

**Error Responses**

| 상태 코드 | error 코드 | 발생 조건 |
|----------|-----------|---------|
| 401 | `UNAUTHORIZED` | JWT 쿠키 없음 또는 검증 실패 |
| 500 | `INTERNAL_ERROR` | Supabase 쿼리 예외 |

---

#### `POST /api/transactions`

**Request**

```
POST /api/transactions
Cookie: token=<JWT>
Content-Type: application/json
```

```json
{
  "password": "string",
  "data": {
    "stock_id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "BUY",
    "date": "2026-03-11",
    "quantity": 5,
    "price": 79000,
    "amount": 395000,
    "memo": "추가 매수"
  }
}
```

| 필드 | 필수 | 검증 규칙 |
|------|------|-----------|
| `password` | Y | 비어있지 않은 문자열 |
| `data.stock_id` | Y | 비어있지 않은 문자열, 유효한 UUID, stocks 테이블에 존재해야 함 |
| `data.type` | Y | `'BUY'` \| `'SELL'` \| `'DIVIDEND'` 중 하나 |
| `data.date` | Y | `YYYY-MM-DD` 형식 문자열 |
| `data.quantity` | BUY/SELL 필수 | 양수 숫자. DIVIDEND 시 생략 가능 |
| `data.price` | BUY/SELL 필수 | 양수 숫자. DIVIDEND 시 생략 가능 |
| `data.amount` | Y | 양수 숫자 |
| `data.memo` | N | 문자열 또는 미포함 |

**type별 필드 필수 여부**

| type | quantity | price | amount |
|------|----------|-------|--------|
| BUY | 필수 (양수) | 필수 (양수) | 필수 (양수) |
| SELL | 필수 (양수) | 필수 (양수) | 필수 (양수) |
| DIVIDEND | 생략 가능 (null 저장) | 생략 가능 (null 저장) | 필수 (양수) |

**Response 201 — 추가 성공**

```json
{
  "data": {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "stock_id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "BUY",
    "date": "2026-03-11",
    "quantity": 5,
    "price": 79000,
    "amount": 395000,
    "memo": "추가 매수",
    "created_at": "2026-03-11T11:00:00.000+09:00",
    "updated_at": "2026-03-11T11:00:00.000+09:00"
  }
}
```

> 응답에는 stock JOIN 정보가 포함되지 않는다. 클라이언트는 `router.refresh()`로 목록을 재조회한다.

**Error Responses**

| 상태 코드 | error 코드 | 발생 조건 |
|----------|-----------|---------|
| 400 | `BAD_REQUEST` | 요청 바디 파싱 실패, 필수 필드 누락, type 유효하지 않음, 날짜 형식 오류 |
| 400 | `INVALID_AMOUNT` | amount ≤ 0, 또는 BUY/SELL에서 quantity/price ≤ 0 |
| 400 | `MISSING_QUANTITY_PRICE` | BUY/SELL에서 quantity 또는 price 누락 |
| 401 | `UNAUTHORIZED` | JWT 검증 실패 |
| 403 | `FORBIDDEN` | bcrypt 비밀번호 불일치 |
| 404 | `STOCK_NOT_FOUND` | stock_id가 stocks 테이블에 존재하지 않음 |
| 500 | `INTERNAL_ERROR` | 예상치 못한 예외 |

---

#### `PUT /api/transactions/[id]`

**Request**

```
PUT /api/transactions/c3d4e5f6-a7b8-9012-cdef-123456789012
Cookie: token=<JWT>
Content-Type: application/json
```

```json
{
  "password": "string",
  "data": {
    "stock_id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "BUY",
    "date": "2026-03-11",
    "quantity": 8,
    "price": 79000,
    "amount": 632000,
    "memo": "수정된 메모"
  }
}
```

요청 바디 필드 검증 규칙은 POST와 동일하다.

**Response 200 — 수정 성공**

```json
{
  "data": {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "stock_id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "BUY",
    "date": "2026-03-11",
    "quantity": 8,
    "price": 79000,
    "amount": 632000,
    "memo": "수정된 메모",
    "created_at": "2026-03-11T11:00:00.000+09:00",
    "updated_at": "2026-03-11T12:30:00.000+09:00"
  }
}
```

**Error Responses**

| 상태 코드 | error 코드 | 발생 조건 |
|----------|-----------|---------|
| 400 | `BAD_REQUEST` | 요청 바디 파싱 실패 또는 필수 필드 누락 |
| 400 | `INVALID_AMOUNT` | amount ≤ 0, 또는 BUY/SELL에서 quantity/price ≤ 0 |
| 400 | `MISSING_QUANTITY_PRICE` | BUY/SELL에서 quantity 또는 price 누락 |
| 401 | `UNAUTHORIZED` | JWT 검증 실패 |
| 403 | `FORBIDDEN` | bcrypt 비밀번호 불일치 |
| 404 | `NOT_FOUND` | 해당 id의 transaction이 존재하지 않음 |
| 404 | `STOCK_NOT_FOUND` | 변경한 stock_id가 stocks 테이블에 존재하지 않음 |
| 500 | `INTERNAL_ERROR` | 예상치 못한 예외 |

---

#### `DELETE /api/transactions/[id]`

**Request**

```
DELETE /api/transactions/c3d4e5f6-a7b8-9012-cdef-123456789012
Cookie: token=<JWT>
Content-Type: application/json
```

```json
{
  "password": "string"
}
```

| 필드 | 필수 | 검증 규칙 |
|------|------|-----------|
| `password` | Y | 비어있지 않은 문자열 |

**Response 204 — 삭제 성공**

```
HTTP/1.1 204 No Content
(body 없음)
```

**Error Responses**

| 상태 코드 | error 코드 | 발생 조건 |
|----------|-----------|---------|
| 400 | `BAD_REQUEST` | 요청 바디 파싱 실패 또는 password 누락 |
| 401 | `UNAUTHORIZED` | JWT 검증 실패 |
| 403 | `FORBIDDEN` | bcrypt 비밀번호 불일치 |
| 404 | `NOT_FOUND` | 해당 id의 transaction이 존재하지 않음 |
| 500 | `INTERNAL_ERROR` | 예상치 못한 예외 |

---

## 5. UI/UX Design

### 5.1 화면 레이아웃

#### `/dashboard/transactions` 메인 페이지

```
┌──────────────────────────────────────────────────────────────────────────┐
│  <NavBar>  investLOG  [대시보드] [주식상품] [거래내역] [로그아웃]         │
├──────────────────────────────────────────────────────────────────────────┤
│  거래 내역 관리                                   [+ 거래 추가]          │
│  font-display / text-paper                         button accent bg       │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  [유형 전체 ▾]  [통화 전체 ▾]  [종목 검색              🔍]         │ │
│  │  select          select          text input (디바운스 300ms)        │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  날짜      유형    종목코드   종목명    수량    단가      금액  통화 │ │
│  │  (header — font-mono text-xs text-warm-mid tracking-widest)         │ │
│  ├─────────────────────────────────────────────────────────────────────┤ │
│  │  2026-03   [BUY]  005930.KS  삼성전자  10    ₩78,500  ₩785,000 KRW│ │
│  │  hover ──────────────────────────────────────────── [수정] [삭제]   │ │
│  ├─────────────────────────────────────────────────────────────────────┤ │
│  │  2026-03   [SELL] AAPL       Apple      5    $182.40    $912.00 USD │ │
│  │  hover ──────────────────────────────────────────── [수정] [삭제]   │ │
│  ├─────────────────────────────────────────────────────────────────────┤ │
│  │  2026-02   [DIV]  AAPL       Apple      —         —      $12.50 USD │ │
│  │  hover ──────────────────────────────────────────── [수정] [삭제]   │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  전체 42건                                                                 │
│  [< 이전]  [1] [2] [3] ... [5]  [다음 >]                                 │
│                                                                            │
│  [거래 내역 0건일 때]                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  등록된 거래 내역이 없습니다.                                       │ │
│  │  [+ 첫 거래 추가하기]  (accent 버튼)                                │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

**테이블 컬럼 구성:**

| 컬럼 | 표시값 | 비고 |
|------|--------|------|
| 날짜 | `YYYY-MM-DD` | date DESC 정렬 고정 |
| 유형 | chip badge | BUY(초록), SELL(빨강), DIVIDEND(파랑) |
| 종목코드 | `stock.ticker` | Yahoo Finance 티커 |
| 종목명 | `stock.name` | 최대 `truncate` |
| 수량 | 숫자 | DIVIDEND 시 `—` |
| 단가 | 통화기호 + 숫자 | DIVIDEND 시 `—` |
| 금액 | 통화기호 + 숫자 | BUY: `text-red-bright`, SELL: `text-green-bright`, DIVIDEND: `text-blue-bright` |
| 통화 | `KRW` / `USD` | `stock.currency` |
| 메모 | 텍스트 | `max-w-[120px] truncate`, 선택적 표시 |
| 액션 | [수정] [삭제] | 행 호버 시 `opacity-0 → opacity-100` |

---

#### TransactionFormModal — 거래 추가/수정 중앙 오버레이

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [오버레이 bg-ink/70]                                                     │
│                                                                            │
│         ┌──────────────────────────────────────────────────────┐          │
│         │ ████████████████████████████████████████████████████ │ ← strip  │
│         │ (accent → green-bright → blue-bright 그라디언트, h-1.5)│          │
│         │──────────────────────────────────────────────────────│          │
│         │  거래 추가              NEW TRANSACTION          [✕]  │          │
│         │──────────────────────────────────────────────────────│          │
│         │                                                       │          │
│         │  주식상품 선택 *                                      │          │
│         │  [— 등록된 종목에서 선택 ──────────────────────── ▾]  │          │
│         │                                                       │          │
│         │  ┌───────────────────────────────────────────────┐   │          │
│         │  │  ● 삼성전자                                    │   │ ← 배지   │
│         │  │    005930.KS · KRX · KRW          ₩78,500     │   │          │
│         │  └───────────────────────────────────────────────┘   │          │
│         │                                                       │          │
│         │  ┌──────────┐  ┌──────────┐  ┌────────────────┐     │          │
│         │  │ ▲ 매수   │  │ ▼ 매도   │  │ 💰 배당        │     │ ← 3-grid │
│         │  └──────────┘  └──────────┘  └────────────────┘     │          │
│         │                                                       │          │
│         │  날짜 *                   수량 *  (DIVIDEND 시 숨김) │          │
│         │  [2026-03-11        ]     [10           ]            │          │
│         │                                                       │          │
│         │  단가 *                   금액 (자동) / (직접 입력)  │          │
│         │  [78500         ]         [785000        ]           │          │
│         │                                                       │          │
│         │  메모                                                 │          │
│         │  [장기 보유                                       ]   │          │
│         │                                                       │          │
│         │  - - - - - - - - - - - - - - - - - - - - - - - - -   │          │
│         │  🔒 비밀번호 확인                                     │          │
│         │  [비밀번호 입력                                   ]   │          │
│         │  ✕ 비밀번호가 올바르지 않습니다  (에러 시 표시)      │          │
│         │                                                       │          │
│         │                         [취소]  [저장하기]           │          │
│         └──────────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────────────┘
```

**유형별 필드 표시 규칙:**

| 유형 | 수량 필드 | 단가 필드 | 금액 필드 |
|------|---------|---------|---------|
| BUY | 표시 (필수) | 표시 (필수) | 자동 계산, 편집 가능 |
| SELL | 표시 (필수) | 표시 (필수) | 자동 계산, 편집 가능 |
| DIVIDEND | 마운트 해제 | 마운트 해제 | 표시 (필수, 직접 입력) |

---

#### PasswordConfirmModal — 삭제 전 비밀번호 확인

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [오버레이 bg-ink/70]                                                     │
│                                                                            │
│              ┌────────────────────────────────────┐                       │
│              │  비밀번호 확인                      │                       │
│              │  ────────────────────────────────── │                       │
│              │  [삭제] 작업을 위해 비밀번호를     │                       │
│              │  입력해주세요.                      │                       │
│              │                                     │                       │
│              │  비밀번호                           │                       │
│              │  [•••••••••••           ]           │                       │
│              │                                     │                       │
│              │  ✕ 비밀번호가 올바르지 않습니다    │                       │
│              │  (error 시에만 visible)             │                       │
│              │                                     │                       │
│              │  [취소]            [확인]           │                       │
│              └────────────────────────────────────┘                       │
└──────────────────────────────────────────────────────────────────────────┘
```

> **참고**: 추가/수정은 `TransactionForm` 내 비밀번호 섹션으로 처리한다.
> `PasswordConfirmModal`은 삭제 전용으로만 사용하며, 03-stocks 컴포넌트 구조를 재활용한다
> (transactions DELETE 엔드포인트를 호출하도록 확장).

---

### 5.2 컴포넌트 목록

| 컴포넌트 | 파일 경로 | 렌더 방식 | 책임 |
|---------|---------|---------|-----|
| `TransactionsPage` | `src/app/dashboard/transactions/page.tsx` | Server Component | 서버사이드 transactions/stocks 조회 후 `TransactionsClientShell`에 초기 데이터 전달 |
| `TransactionsClientShell` | `src/components/transactions/TransactionsClientShell.tsx` | Client Component | 필터 상태, 페이지 상태, 모달 열림/닫힘, pendingDelete 상태, 필터 API fetch 조율. 전체 상태 허브 |
| `TransactionFilterBar` | `src/components/transactions/TransactionFilterBar.tsx` | Client Component | 유형 select, 통화 select, 종목 검색 text input. 검색 input 300ms 디바운스. 필터 변경 시 부모 콜백 호출 |
| `TransactionTable` | `src/components/transactions/TransactionTable.tsx` | Client Component | 거래 내역 테이블 헤더 + `TransactionRow` 목록. 빈 상태 표시. `TransactionRow`에 이벤트 핸들러 전달 |
| `TransactionRow` | `src/components/transactions/TransactionRow.tsx` | Client Component | 단일 거래 행. `TransactionTypeBadge`, 금액 색상, `group hover:` 패턴으로 수정/삭제 버튼 노출. 이벤트 상위 전달 |
| `TransactionTypeBadge` | `src/components/transactions/TransactionTypeBadge.tsx` | Client Component | `TransactionType` → chip UI. BUY(green), SELL(red), DIVIDEND(blue) 색상/레이블 결정. 순수 표현 컴포넌트 |
| `Pagination` | `src/components/transactions/Pagination.tsx` | Client Component | 페이지 번호 버튼, 이전/다음 버튼, 총 건수 표시. currentPage·total·onPageChange props |
| `TransactionFormModal` | `src/components/transactions/TransactionFormModal.tsx` | Client Component | 거래 추가/수정 중앙 오버레이 모달. modal-strip 헤더, 닫기 버튼, open/close 애니메이션, Escape 키 처리 |
| `TransactionForm` | `src/components/transactions/TransactionForm.tsx` | Client Component | 전체 폼: 주식 선택 드롭다운+배지, 유형 3-grid, 날짜/수량/단가/금액, 메모, 비밀번호 섹션. 금액 자동 계산 로직 내장 |
| `PasswordConfirmModal` | `src/components/transactions/PasswordConfirmModal.tsx` | Client Component | 삭제 전 비밀번호 확인 다이얼로그. 03-stocks 패턴 재활용, transactions DELETE API 호출 |

---

### 5.3 상태 관리 설계

#### 상태 분류

| 상태 | 위치 | 타입 | 설명 |
|-----|-----|-----|-----|
| `transactions` | `TransactionsClientShell` | `TransactionWithStock[]` | 현재 표시 중인 거래 목록 (서버 초기값 + 필터 재조회) |
| `isLoading` | `TransactionsClientShell` | `boolean` | 필터/종목 재조회 중 여부 |
| `currentPage` | `TransactionsClientShell` | `number` | 현재 페이지 (1-based, 클라이언트 슬라이스) |
| `filterState` | `TransactionsClientShell` | `FilterState` | 유형/통화/종목 검색 필터 |
| `debouncedSearch` | `TransactionsClientShell` | `string` | 300ms 디바운스된 종목 검색어 (stock_id 조회 트리거) |
| `formModalOpen` | `TransactionsClientShell` | `boolean` | TransactionFormModal 열림 여부 |
| `formModalMode` | `TransactionsClientShell` | `TransactionModalMode` | `'create'` 또는 `'edit'` |
| `editTarget` | `TransactionsClientShell` | `TransactionWithStock \| null` | 수정 대상 거래 데이터 |
| `pwModalOpen` | `TransactionsClientShell` | `boolean` | PasswordConfirmModal 열림 여부 |
| `pendingDelete` | `TransactionsClientShell` | `PendingDelete \| null` | 삭제 대기 중인 거래 ID |
| `selectedStock` | `TransactionForm` | `Stock \| null` | 선택된 주식상품 |
| `currentPrice` | `TransactionForm` | `PriceQuote \| null` | 선택 종목 현재가 (배지 표시용) |
| `isPriceLoading` | `TransactionForm` | `boolean` | 현재가 조회 중 여부 |
| `formState` | `TransactionForm` | `TransactionFormState` | 폼 전체 필드 controlled 상태 |
| `isAmountManual` | `TransactionForm` | `boolean` | 금액 자동 계산 → 수동 전환 여부 |
| `formErrors` | `TransactionForm` | `Partial<Record<string, string>>` | 필드별 유효성 오류 메시지 |
| `isSubmitting` | `TransactionForm` | `boolean` | 저장 API 호출 진행 중 |
| `submitError` | `TransactionForm` | `string \| null` | 비밀번호 오류 등 제출 에러 |
| `pwValue` | `PasswordConfirmModal` | `string` | 비밀번호 입력값 |
| `isSubmitting` | `PasswordConfirmModal` | `boolean` | 삭제 API 호출 진행 중 |
| `pwError` | `PasswordConfirmModal` | `string \| null` | 비밀번호 불일치 또는 서버 에러 |

#### 상태 전환 다이어그램

```
[TransactionsClientShell 초기 마운트]
  → transactions: 서버 초기값 (필터 없음, 전체)
  → filterState: { type: 'ALL', currency: 'ALL', stockSearch: '' }
  → currentPage: 1

[유형/통화 필터 select 변경]
  → filterState 갱신 → currentPage: 1 리셋
  → 클라이언트 필터링 (API 재조회 없음)

[종목 검색 input 타이핑]
  → filterState.stockSearch 즉시 갱신 (UI 반응)
  → 300ms 디바운스 후 → debouncedSearch 갱신
  → isLoading: true → fetch /api/transactions?stock_id=...
    → 완료: transactions 갱신, currentPage: 1 리셋 → isLoading: false

[페이지 번호 클릭]
  → currentPage 갱신 → 클라이언트 슬라이스 재렌더링

[+ 거래 추가 클릭]
  → formModalMode: 'create', editTarget: null, formModalOpen: true

[TransactionRow [수정] 클릭]
  → formModalMode: 'edit', editTarget: transaction, formModalOpen: true

[TransactionRow [삭제] 클릭]
  → pendingDelete: { transactionId }, pwModalOpen: true

[TransactionForm [저장하기] 클릭]
  → isSubmitting: true
  → POST 또는 PUT /api/transactions[/id] { password, data }
    → 성공: formModalOpen: false, router.refresh()
    → 403: submitError: '비밀번호가 올바르지 않습니다', 비밀번호 필드 초기화
    → 완료: isSubmitting: false

[PasswordConfirmModal [확인] 클릭]
  → isSubmitting: true
  → DELETE /api/transactions/[id] { password }
    → 성공: pwModalOpen: false, pendingDelete: null, router.refresh()
    → 403: pwError: '비밀번호가 올바르지 않습니다', 입력 초기화
    → 완료: isSubmitting: false
```

#### 금액 자동 계산 로직

```
수량(quantity) 또는 단가(price) 변경 시:
  if (isAmountManual === false && type !== 'DIVIDEND') {
    const qty = parseFloat(formState.quantity) || 0
    const pr  = parseFloat(formState.price)    || 0
    amount 필드값 = String(qty * pr)
  }

금액(amount) 필드 직접 편집 시:
  → isAmountManual: true (자동 계산 비활성화)
  → 이후 수량/단가 변경해도 amount 고정 유지

유형을 DIVIDEND로 전환 시:
  → quantity, price 필드 마운트 해제 (DOM 제거)
  → isAmountManual: false → 직접 입력 모드 (amount만 표시)
  → formState.quantity = '', formState.price = '' 초기화

유형을 BUY/SELL로 전환 시:
  → quantity, price 필드 마운트
  → isAmountManual: false → 자동 계산 모드 복원
  → amount 필드값 재계산 (현재 quantity × price)
```

#### 서버 상태 전략

- 초기 `transactions` 데이터: `page.tsx` Server Component에서 직접 fetch (필터 없음, 전체)
- 종목 필터 변경 시: `TransactionsClientShell`에서 `fetch /api/transactions?stock_id=...` 클라이언트 재조회
- 유형/통화 필터: 클라이언트에서 메모리 필터링 (API 재조회 없음)
- 쓰기 성공 후 `router.refresh()`: 서버 컴포넌트 캐시 무효화, 전체 목록 갱신

---

### 5.4 라우팅 구조

| 경로 | 파일 | 설명 |
|-----|-----|-----|
| `/dashboard/transactions` | `src/app/dashboard/transactions/page.tsx` | 거래 내역 관리 페이지 |
| (기존) `/dashboard` | `src/app/dashboard/page.tsx` | 대시보드 |
| (기존) `/dashboard/stocks` | `src/app/dashboard/stocks/page.tsx` | 주식상품 관리 |

`/dashboard/transactions`는 `src/app/dashboard/layout.tsx`의 `NavBar` 레이아웃을 상속한다.
별도의 중첩 레이아웃(`transactions/layout.tsx`) 없이 `page.tsx` 단독 파일로 구성한다.

**URL 파라미터 없음**: 수정/삭제는 모달 방식으로 처리하므로 `/dashboard/transactions/[id]` 라우트 불필요.

---

### 5.5 스타일 전략

#### 색상 토큰 활용

| 요소 | Tailwind 클래스 | 색상값 | 설명 |
|------|---------------|--------|------|
| BUY 유형 chip | `bg-green/20 text-green-bright` | `#3d6b4f20 / #6bba8a` | 초록 계열 badge |
| SELL 유형 chip | `bg-red/20 text-red-bright` | `#8b3a3a20 / #d07070` | 빨강 계열 badge |
| DIVIDEND 유형 chip | `bg-blue/20 text-blue-bright` | `#2c4a6e20 / #6898cc` | 파랑 계열 badge |
| BUY 금액 | `text-red-bright` | `#d07070` | 매수: 자산 유출 의미 |
| SELL 금액 | `text-green-bright` | `#6bba8a` | 매도: 자산 유입 의미 |
| DIVIDEND 금액 | `text-blue-bright` | `#6898cc` | 배당 수익 |
| 테이블 헤더 | `font-mono text-xs text-warm-mid tracking-widest uppercase` | `#c8c0b0` | 컬럼 레이블 |
| 행 구분선 | `border-b border-warm-mid/10` | `#c8c0b010` | subtle 행 구분 |
| 행 호버 | `group-hover:bg-warm-mid/5` | `#c8c0b00d` | 행 강조 |
| 모달 overlay | `bg-ink/70` | `#0a0a08b3` | 반투명 배경 |
| modal-strip | `bg-gradient-to-r from-accent via-green-bright to-blue-bright h-1.5` | 그라디언트 | 모달 상단 컬러 바 |
| 유형 3-grid BUY 활성 | `bg-green/30 border-green-bright text-green-bright` | — | 선택 상태 |
| 유형 3-grid SELL 활성 | `bg-red/30 border-red-bright text-red-bright` | — | 선택 상태 |
| 유형 3-grid DIVIDEND 활성 | `bg-blue/30 border-blue-bright text-blue-bright` | — | 선택 상태 |
| 유형 3-grid 비선택 | `border border-warm-mid/20 text-warm-mid` | — | 비선택 상태 |
| 비밀번호 구분선 | `border-dashed border-warm-mid/30` | — | 점선 분리 |
| 배지 배경 | `bg-warm-mid/5 border border-warm-mid/15` | — | 주식 정보 배지 |

#### 타이포그래피

| 역할 | 클래스 |
|------|-------|
| 페이지 제목 | `font-display text-xl text-paper` |
| 테이블 헤더 | `font-mono text-xs text-warm-mid tracking-widest uppercase` |
| 테이블 데이터 | `font-mono text-sm text-paper` |
| 금액 | `font-mono text-sm font-medium` + 유형별 색상 클래스 |
| 레이블 | `font-mono text-xs text-warm-mid tracking-widest uppercase` |
| 에러 메시지 | `font-mono text-xs text-red-bright` |
| 모달 타이틀 (한글) | `font-kr text-paper` |
| 모달 서브타이틀 (영문) | `font-display text-warm-mid/60 text-sm tracking-widest` |
| 배지 종목명 | `font-mono text-sm text-paper` |
| 배지 부가정보 | `font-mono text-xs text-warm-mid` |

#### 반응형 전략

| Breakpoint | 레이아웃 |
|------------|---------|
| `< 768px` (md 미만) | 테이블 가로 스크롤 (`overflow-x-auto`), 메모·통화 컬럼 선택적 숨김 |
| `>= 768px` (md 이상) | 전체 컬럼 표시 |
| 모달 | `w-full max-w-lg mx-4` — 모바일 margin 확보 |
| 필터 바 | `flex flex-wrap gap-3` — 모바일에서 세로 줄바꿈 |

#### 버튼 스타일 일관성 (03-stocks 패턴 계승)

```
기본 CTA:   px-5 py-2 bg-accent text-ink font-mono text-sm tracking-widest hover:bg-accent/80
보조:       px-5 py-2 font-mono text-sm tracking-widest text-warm-mid border border-warm-mid/20
소형 액션:  px-3 py-1.5 font-mono text-xs — 행 호버 버튼 (수정/삭제)
삭제 소형:  px-3 py-1.5 font-mono text-xs text-red-bright border border-red-bright/30 hover:bg-red/10
포커스:     focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
```

---

### 5.6 인터랙션 상세

#### 필터 디바운스 구현 전략

```
TransactionFilterBar:
  - 유형/통화 select: onChange 시 즉시 부모 콜백 호출 (디바운스 없음)
  - 종목 검색 input: 300ms useDebounce 훅 적용

TransactionsClientShell:
  const [stockSearch, setStockSearch] = useState('')
  const debouncedSearch = useDebounce(stockSearch, 300)

  useEffect(() => {
    if (!debouncedSearch) {
      // 검색어 없으면 전체 재조회 or 초기 목록 복원
      return
    }
    // debouncedSearch로 stock_id 매핑 후 API 재조회
    const matched = stocks.find(s =>
      s.name.includes(debouncedSearch) || s.ticker.includes(debouncedSearch)
    )
    if (matched) fetchTransactions({ stock_id: matched.id })
  }, [debouncedSearch])
```

`useDebounce` 훅: `src/hooks/useDebounce.ts` 신규 작성.

#### 금액 자동 계산 트리거

- `quantity` 또는 `price` 필드 `onChange` 시점에 즉시 계산
- `isAmountManual === false` 조건 확인 후 `amount` 필드 갱신
- `amount` 필드에 사용자가 직접 타이핑하면 `isAmountManual: true` 전환
- 금액 필드 우측에 `(자동)` / `(직접 입력)` 레이블 — `text-warm-mid/50 text-xs`

#### 행 호버 액션 — Tailwind group 패턴

```
TransactionRow:
  - 기본 상태: opacity-0 (버튼 DOM 존재)
  - 호버 상태: opacity-100, transition-opacity duration-150

Tailwind 구현:
  <tr className="group hover:bg-warm-mid/5">
    <td>...</td>
    <td>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex gap-2">
        <button className="px-3 py-1.5 font-mono text-xs text-warm-mid border border-warm-mid/20 hover:text-paper">
          수정
        </button>
        <button className="px-3 py-1.5 font-mono text-xs text-red-bright border border-red-bright/30 hover:bg-red/10">
          삭제
        </button>
      </div>
    </td>
  </tr>
```

#### 주식상품 선택 드롭다운 → 배지 표시 흐름

```
TransactionForm:
  1. select onChange → selectedStock 상태 갱신 → 배지 즉시 렌더링
     (ticker · market · currency 표시, 현재가는 로딩 중 "—")
  2. fetch /api/prices?tickers={ticker}
     → 성공: currentPrice 상태 갱신 → 배지 현재가 업데이트
     → 실패: currentPrice: null → 배지 현재가 "—" 유지
  3. 드롭다운 재선택 시: 배지 업데이트, 현재가 재조회
```

#### 유형 3-grid 버튼 상호작용

```
grid grid-cols-3 gap-2 배치
선택 상태: type별 색상 active 스타일 (border + bg + text 변경)
비선택 상태: border-warm-mid/20 text-warm-mid
클릭 시:
  - type 상태 변경
  - DIVIDEND 전환: quantity/price 필드 마운트 해제, isAmountManual: false
  - BUY/SELL 전환: quantity/price 필드 마운트, 자동 계산 복원
```

#### 모달 열림/닫힘 애니메이션

```
TransactionFormModal:
  - 열림: scale-100 opacity-100 (transition duration-200 ease-out)
  - 닫힘: scale-95 opacity-0 (transition duration-150 ease-in)
  - Overlay: fixed inset-0 z-40 bg-ink/70
  - 모달 패널: fixed inset-0 z-50 flex items-center justify-center
  - 닫기 조건: [✕] 클릭, overlay 클릭, Escape 키
  - 모달 열림 시 첫 번째 입력 요소(주식 드롭다운)로 autoFocus
```

#### 페이지네이션 UI

```
총 건수 표시: "전체 {total}건" — font-mono text-sm text-warm-mid
페이지 버튼: [< 이전] [1] [2] ... [N] [다음 >]
현재 페이지: bg-accent text-ink
비선택 페이지: text-warm-mid hover:text-paper
비활성화 버튼: opacity-40 cursor-not-allowed pointer-events-none
표시 페이지 범위: Math.ceil(filteredTotal / 10)
클라이언트 슬라이스: transactions.slice((currentPage-1)*10, currentPage*10)
```

---

## 6. Error Handling

### 6.1 공통 에러 응답 포맷

모든 API 에러는 아래 JSON 구조를 따른다.

```json
{
  "error": "ERROR_CODE",
  "message": "사람이 읽을 수 있는 설명 (선택)"
}
```

- `error`: 대문자 스네이크 케이스 문자열. 클라이언트가 분기 처리에 사용
- `message`: 한국어 설명. 디버깅/UI 표시 참고용. 보안상 민감 정보 미포함

### 6.2 에러 코드 표

| HTTP 상태 | error 코드 | 발생 엔드포인트 | 원인 | 클라이언트 처리 |
|-----------|-----------|--------------|------|----------------|
| 400 | `BAD_REQUEST` | 전체 | 요청 바디 파싱 실패, 필수 필드 누락, 날짜 형식 오류, type 값 오류 | 폼 유효성 재검토 안내 |
| 400 | `INVALID_AMOUNT` | POST, PUT | amount/quantity/price ≤ 0 또는 음수 | "금액은 양수여야 합니다" 안내 |
| 400 | `MISSING_QUANTITY_PRICE` | POST, PUT | BUY/SELL 유형에서 quantity 또는 price 누락 | "매수/매도 시 수량·단가 필수" 안내 |
| 401 | `UNAUTHORIZED` | 전체 | JWT 쿠키 없음 또는 검증 실패 | 로그인 페이지 리다이렉트 |
| 403 | `FORBIDDEN` | POST, PUT, DELETE | bcrypt 비밀번호 불일치 | "비밀번호가 올바르지 않습니다" 표시, 필드 초기화 |
| 404 | `NOT_FOUND` | PUT, DELETE | 해당 id의 transaction 미존재 | "이미 삭제된 항목입니다" 안내, 목록 새로고침 |
| 404 | `STOCK_NOT_FOUND` | POST, PUT | stock_id가 stocks 테이블에 미존재 | "종목을 다시 선택해주세요" 안내 |
| 500 | `INTERNAL_ERROR` | 전체 | 예상치 못한 서버 예외 | 일반 오류 안내, 재시도 유도 |

### 6.3 시나리오별 처리

| 상황 | HTTP | 서버 동작 | 클라이언트 동작 |
|------|------|----------|----------------|
| GET 성공 (0건 포함) | 200 | `{ data: [] }` | 빈 테이블 상태 표시 |
| POST 성공 | 201 | 생성된 transaction 반환 | 모달 닫힘, `router.refresh()` |
| PUT 성공 | 200 | 수정된 transaction 반환 | 모달 닫힘, `router.refresh()` |
| DELETE 성공 | 204 | body 없음 | 모달 닫힘, `router.refresh()` |
| 비밀번호 오류 | 403 | `FORBIDDEN` | 모달 내 에러 메시지, 비밀번호 필드 초기화, 모달 유지 |
| stock_id 미존재 | 404 | `STOCK_NOT_FOUND` | 드롭다운 재선택 안내 |
| transaction 미존재 | 404 | `NOT_FOUND` | 경고 표시 후 목록 새로고침 |
| BUY/SELL 수량/단가 누락 | 400 | `MISSING_QUANTITY_PRICE` | 해당 필드 강조 에러 표시 |
| 금액 0 또는 음수 | 400 | `INVALID_AMOUNT` | 금액 필드 에러 표시 |
| JWT 만료 (미들웨어) | 302 | 리다이렉트 → `/` | 브라우저 자동 이동 (JSON 응답 없음) |
| 네트워크 오류 | — | — | fetch catch → 일반 오류 안내 |

### 6.4 type별 검증 로직

```
if (type === 'BUY' || type === 'SELL') {
  // quantity 필수, 양수
  if (!quantity || quantity <= 0) → 400 MISSING_QUANTITY_PRICE
  // price 필수, 양수
  if (!price || price <= 0)       → 400 MISSING_QUANTITY_PRICE
}
// amount는 type 불문 필수, 양수
if (!amount || amount <= 0) → 400 INVALID_AMOUNT
```

### 6.5 환경변수 누락 — Fail Fast

`src/lib/transactions.ts` 모듈 로드 시점에 Supabase 환경변수 존재 여부를 확인한다.

```
NEXT_PUBLIC_SUPABASE_URL   → 누락 시 throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
SUPABASE_SERVICE_ROLE_KEY  → 누락 시 throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
```

`AUTH_PASSWORD_HASH` 누락은 `src/lib/auth.ts`에서 이미 처리 (기존 패턴 계승).

### 6.6 보안 주의사항

- bcrypt `comparePassword()` 내부 예외: catch → 500 `INTERNAL_ERROR` (평문 비밀번호 로그 금지)
- 에러 응답에 스택 트레이스, SQL 쿼리, 내부 변수명 미포함
- `STOCK_NOT_FOUND`와 `NOT_FOUND`는 구분하여 반환 — 불필요한 정보 노출 없이 클라이언트 UX 지원
- stock_id 존재 확인은 INSERT/UPDATE 전 SELECT로 수행. Supabase FK 제약 오류(23503)도 catch하여 동일 404로 정규화

---

## 7. Security Considerations

- [x] 쓰기 API(POST/PUT/DELETE) 호출 시 `password` 필드를 요청 바디에 포함 — 서버에서 bcrypt 검증
- [x] `TransactionForm`의 비밀번호 입력 필드: `type="password"`, `autocomplete="current-password"`
- [x] `PasswordConfirmModal`의 비밀번호 입력 필드: `type="password"`, `autocomplete="current-password"`
- [x] 제출 성공 후 비밀번호 입력값(`password`) 즉시 초기화
- [x] 제출 실패(403) 후 비밀번호 입력값 초기화, 에러 메시지만 표시
- [x] 모달 닫힘 시 모든 로컬 상태 초기화 (이전 작업 데이터 잔류 방지)
- [x] 평문 비밀번호를 `console.log` 등 로그에 포함하지 않음
- [x] 에러 응답에 Supabase 내부 오류 메시지, 스택 트레이스 미포함
- [x] JWT 만료 시 클라이언트에서 `router.push('/')` 리다이렉트 처리

---

## 8. Acceptance Criteria

### 8.1 Functional Acceptance Criteria

| ID | Criteria | 검증 방법 | Priority |
|----|----------|----------|----------|
| AC-01 | Given 로그인 상태 / When /dashboard/transactions 진입 / Then 거래 내역 테이블 표시 | 수동 테스트 | Must |
| AC-02 | Given 거래 행 존재 / When 행 호버 / Then [수정] [삭제] 버튼 표시 | 수동 테스트 | Must |
| AC-03 | Given 유형 필터 선택(BUY) / When 적용 / Then BUY 거래만 표시 | 수동 테스트 | Must |
| AC-04 | Given 통화 필터 선택(KRW) / When 적용 / Then KRW 거래만 표시 | 수동 테스트 | Must |
| AC-05 | Given 종목 검색 입력 / When 300ms 후 / Then 해당 종목 거래만 표시 | 수동 테스트 | Must |
| AC-06 | Given [+ 거래 추가] 클릭 / When 주식 선택 → 유형 BUY → 수량/단가 입력 / Then 금액 자동 계산 표시 | 수동 테스트 | Must |
| AC-07 | Given 유형 DIVIDEND 선택 / When 폼 렌더링 / Then 수량/단가 필드 없음, 금액만 입력 가능 | 수동 테스트 | Must |
| AC-08 | Given 폼 작성 완료 / When 비밀번호 입력 → [저장하기] / Then DB 저장 후 테이블 갱신 | 수동 테스트 | Must |
| AC-09 | Given [삭제] 클릭 / When PasswordConfirmModal 비밀번호 입력 → [확인] / Then 해당 행 삭제 | 수동 테스트 | Must |
| AC-10 | Given 비밀번호 불일치 / When 저장 또는 삭제 시도 / Then 에러 메시지 표시, 비밀번호 필드 초기화 | 수동 테스트 | Must |
| AC-11 | Given BUY 거래 / When 금액 표시 / Then text-red-bright 색상 | 수동 테스트 | Should |
| AC-12 | Given SELL 거래 / When 금액 표시 / Then text-green-bright 색상 | 수동 테스트 | Should |
| AC-13 | Given DIVIDEND 거래 / When 금액 표시 / Then text-blue-bright 색상 | 수동 테스트 | Should |
| AC-14 | Given 거래 0건 / When 페이지 진입 / Then 빈 상태 메시지 + 첫 거래 추가 버튼 | 수동 테스트 | Should |
| AC-15 | Given 총 11건 이상 / When 페이지네이션 렌더 / Then 다음 페이지 이동 가능 | 수동 테스트 | Should |
| AC-16 | Given 주식 선택 / When 드롭다운 선택 완료 / Then ticker/market/currency 배지 표시 | 수동 테스트 | Should |

### 8.2 Non-Functional Acceptance Criteria

| Category | Criteria | 검증 방법 |
|----------|----------|---------|
| Accessibility | PasswordConfirmModal: `role="dialog"`, `aria-modal="true"` | DOM 검사 |
| Accessibility | 에러 메시지: `aria-live="polite"` | DOM 검사 |
| UX | 모달 열림 시 첫 입력 요소로 자동 포커스 | 수동 테스트 |
| UX | `Escape` 키로 모달 닫힘 | 수동 테스트 |
| UX | 저장 중 버튼 `disabled` + "저장 중..." 텍스트 | 수동 테스트 |
| Code Quality | Zero lint errors | ESLint 실행 |
| Code Quality | TypeScript strict 통과 | `tsc --noEmit` |

### 8.3 Edge Cases

| ID | 시나리오 | 예상 동작 |
|----|---------|---------|
| EC-01 | 수량/단가 소수점 입력 (미국 주식) | `parseFloat` 처리, 소수점 2자리 표시 |
| EC-02 | 금액 직접 편집 후 수량/단가 변경 | `isAmountManual: true` 유지, 금액 고정 |
| EC-03 | 등록된 주식상품 0건에서 거래 추가 | 드롭다운 "등록된 종목 없음" 안내, 저장 버튼 비활성화 |
| EC-04 | API 호출 중 버튼 재클릭 | `isSubmitting: true` → `disabled`, fetch 1회만 호출 |
| EC-05 | 현재가 조회 실패 시 폼 진행 | 배지 "—" 표시, 폼 입력 및 저장 정상 동작 |
| EC-06 | 페이지네이션 경계값 | 1페이지 이전 버튼 비활성화, 마지막 페이지 다음 버튼 비활성화 |

---

## 9. TDD Test Scenarios

### 9.1 테스트 전략

- **Approach**: TDD (Red-Green-Refactor)
- **Scope**: `TransactionTypeBadge`, `TransactionRow`, `TransactionFilterBar`, `TransactionTable`, `Pagination`, `TransactionForm`, `PasswordConfirmModal` 유닛 테스트 + `TransactionsClientShell` 통합 테스트
- **Coverage Target**: 80%+
- **Test Framework**: Vitest + @testing-library/react + @testing-library/user-event + msw

**테스트 파일 위치:**
```
src/
  __tests__/
    components/
      transactions/
        TransactionTypeBadge.test.tsx
        TransactionRow.test.tsx
        TransactionFilterBar.test.tsx
        TransactionTable.test.tsx
        Pagination.test.tsx
        TransactionForm.test.tsx
        PasswordConfirmModal.test.tsx
        TransactionsClientShell.test.tsx
    hooks/
      useDebounce.test.ts
    fixtures/
      transactions.ts         ← mock 데이터 픽스처
    mocks/
      handlers/
        transactions.ts       ← MSW 핸들러 (GET/POST/PUT/DELETE + prices)
```

**MSW 핸들러 (추가 필요):**
```
src/__tests__/mocks/handlers/transactions.ts
  - GET /api/transactions           (필터 파라미터 지원)
  - POST /api/transactions          (201 성공 / 403 비밀번호 오류)
  - PUT /api/transactions/:id       (200 성공 / 403 / 404)
  - DELETE /api/transactions/:id    (204 성공 / 403)
  - GET /api/prices                 (주식 선택 시 현재가)
```

---

### 9.2 테스트 시나리오 목록

#### TransactionTypeBadge 렌더 테스트

| ID | 시나리오 | 입력 조건 | 기대 결과 | Priority |
|----|---------|---------|---------|----------|
| TS-01 | BUY badge 렌더링 | `type="BUY"` | "매수" 텍스트, `text-green-bright` 클래스 포함 | Critical |
| TS-02 | SELL badge 렌더링 | `type="SELL"` | "매도" 텍스트, `text-red-bright` 클래스 포함 | Critical |
| TS-03 | DIVIDEND badge 렌더링 | `type="DIVIDEND"` | "배당" 텍스트, `text-blue-bright` 클래스 포함 | Critical |

#### TransactionRow 렌더/인터랙션 테스트

| ID | 시나리오 | 입력 조건 | 기대 결과 | Priority |
|----|---------|---------|---------|----------|
| TS-10 | BUY 행 기본 렌더링 | `transaction: mockBuyTransaction` | 날짜/BUY chip/ticker/name/수량/단가/금액 DOM 존재 | Critical |
| TS-11 | DIVIDEND 행 렌더링 | `transaction: mockDividendTransaction` | 수량/단가 컬럼 "—" 표시 | High |
| TS-12 | BUY 금액 색상 | `type="BUY"` | 금액 셀에 `text-red-bright` 클래스 | High |
| TS-13 | SELL 금액 색상 | `type="SELL"` | 금액 셀에 `text-green-bright` 클래스 | High |
| TS-14 | DIVIDEND 금액 색상 | `type="DIVIDEND"` | 금액 셀에 `text-blue-bright` 클래스 | High |
| TS-15 | [수정] 버튼 클릭 이벤트 | `onEdit` mock 전달 후 클릭 | `onEdit(transaction)` 1회 호출 | Critical |
| TS-16 | [삭제] 버튼 클릭 이벤트 | `onDelete` mock 전달 후 클릭 | `onDelete(transaction.id)` 1회 호출 | Critical |
| TS-17 | 메모 긴 텍스트 | `memo: "매우 긴 메모 텍스트 30자 이상입니다"` | `truncate` 클래스 적용 DOM 확인 | Low |

#### TransactionFilterBar 테스트

| ID | 시나리오 | 입력 조건 | 기대 결과 | Priority |
|----|---------|---------|---------|----------|
| TS-20 | 초기 렌더링 기본값 | 마운트 | 유형 select value="ALL", 통화 select value="ALL" | Critical |
| TS-21 | 유형 select 변경 | `userEvent.selectOptions(typeSelect, 'BUY')` | `onFilterChange({ type: 'BUY', ... })` 호출 | Critical |
| TS-22 | 통화 select 변경 | `userEvent.selectOptions(currencySelect, 'KRW')` | `onFilterChange({ currency: 'KRW', ... })` 호출 | Critical |
| TS-23 | 종목 검색 input 타이핑 | `userEvent.type(searchInput, '삼성')` | input value = '삼성' (즉시 반영) | High |
| TS-24 | 종목 검색 300ms 내 재입력 | 50ms 간격 연속 타이핑 | `onFilterChange` stockSearch 콜백 미호출 (디바운스) | High |
| TS-25 | 종목 검색 디바운스 완료 | 타이핑 후 300ms 경과 | `onFilterChange({ stockSearch: '삼성', ... })` 1회 호출 | High |

#### Pagination 테스트

| ID | 시나리오 | 입력 조건 | 기대 결과 | Priority |
|----|---------|---------|---------|----------|
| TS-30 | 총 건수 표시 | `total=42` | "전체 42건" 텍스트 | High |
| TS-31 | 페이지 버튼 개수 | `total=25, limit=10` | 페이지 버튼 3개 렌더 | High |
| TS-32 | 현재 페이지 강조 | `currentPage=2, total=30` | 2번 버튼 accent 색상 클래스 | Medium |
| TS-33 | 이전 버튼 비활성화 | `currentPage=1` | [< 이전] `disabled` 속성 | High |
| TS-34 | 다음 버튼 비활성화 | `currentPage=3, total=25` | [다음 >] `disabled` 속성 | High |
| TS-35 | 페이지 클릭 이벤트 | 2번 버튼 클릭 | `onPageChange(2)` 1회 호출 | Critical |
| TS-36 | 이전 버튼 클릭 | `currentPage=3`, [< 이전] 클릭 | `onPageChange(2)` 호출 | High |
| TS-37 | 다음 버튼 클릭 | `currentPage=1`, [다음 >] 클릭 | `onPageChange(2)` 호출 | High |

#### TransactionTable 렌더 테스트

| ID | 시나리오 | 입력 조건 | 기대 결과 | Priority |
|----|---------|---------|---------|----------|
| TS-40 | 거래 목록 렌더링 | `transactions` 3건 | 행 3개 DOM 존재 | Critical |
| TS-41 | 빈 상태 메시지 | `transactions=[]` | "등록된 거래 내역이 없습니다" 텍스트 | Critical |
| TS-42 | 빈 상태 추가 버튼 | `transactions=[]` | "첫 거래 추가하기" 버튼 존재 | High |
| TS-43 | 테이블 헤더 컬럼 | 마운트 | 날짜/유형/종목코드/종목명/수량/단가/금액/통화 헤더 존재 | High |

#### TransactionForm 테스트

**사전 조건**: MSW `/api/prices` 핸들러, `stocks` 배열 props.

| ID | 시나리오 | 입력 조건 | 기대 결과 | Priority |
|----|---------|---------|---------|----------|
| TS-50 | 초기 렌더링 필드 존재 | 마운트, `stocks` 2건 | 주식 드롭다운, 유형 버튼 3개, 날짜, 수량, 단가, 금액, 메모, 비밀번호 존재 | Critical |
| TS-51 | 주식 선택 → 배지 표시 | `userEvent.selectOptions(stockSelect, stockId)` | 선택 종목 ticker/market/currency 배지 렌더링 | Critical |
| TS-52 | 주식 선택 → 현재가 fetch | 선택 후 MSW `/api/prices` 응답 | 배지에 현재가 표시 | High |
| TS-53 | 현재가 조회 중 상태 | MSW `/api/prices` 지연 중 | 배지 현재가 "—" 표시 | Medium |
| TS-54 | BUY 유형 선택 | BUY 버튼 클릭 | 수량/단가 필드 DOM 존재, BUY 버튼 active 스타일 | Critical |
| TS-55 | DIVIDEND 유형 선택 | DIVIDEND 버튼 클릭 | 수량/단가 필드 DOM 미존재, 금액 필드만 존재 | Critical |
| TS-56 | BUY → DIVIDEND 전환 | BUY 선택 후 DIVIDEND 클릭 | 수량/단가 DOM 제거 확인 (`queryByLabelText` null) | Critical |
| TS-57 | DIVIDEND → BUY 전환 | DIVIDEND 선택 후 BUY 클릭 | 수량/단가 DOM 재마운트 확인 | High |
| TS-58 | 수량×단가 자동 계산 | quantity 입력 10, price 입력 78500 | amount 필드 value "785000" | Critical |
| TS-59 | 금액 수동 편집 전환 | amount 필드 직접 타이핑 | 이후 수량/단가 변경해도 amount 고정 | High |
| TS-60 | BUY 주식 미선택 저장 시도 | stock_id 미선택, [저장하기] 클릭 | API 호출 없음, 주식 선택 오류 메시지 | High |
| TS-61 | BUY 수량 미입력 저장 시도 | quantity='', [저장하기] 클릭 | API 호출 없음, 수량 오류 메시지 | High |
| TS-62 | 비밀번호 미입력 저장 시도 | password='', [저장하기] 클릭 | API 호출 없음, 비밀번호 오류 메시지 | High |
| TS-63 | edit 모드 BUY 초기값 | `editTarget: mockBuyTransaction` | stock_id/type/date/quantity/price/amount/memo 필드 기존값 | Critical |
| TS-64 | edit 모드 DIVIDEND 초기값 | `editTarget: mockDividendTransaction` | 수량/단가 필드 DOM 없음, 금액 필드 기존값 | High |
| TS-65 | 성공적인 폼 제출 (create) | 전체 필드 입력, MSW POST 201 | `onSuccess` 콜백 호출 | Critical |
| TS-66 | 성공적인 폼 제출 (edit) | editTarget 전달, MSW PUT 200 | `onSuccess` 콜백 호출 | Critical |
| TS-67 | 비밀번호 불일치 — 403 | MSW POST 403 응답 | `submitError` 에러 메시지 표시, 비밀번호 필드 초기화 | Critical |
| TS-68 | 제출 중 로딩 상태 | MSW 지연 중 | [저장하기] `disabled`, "저장 중..." 텍스트 | High |
| TS-69 | 중복 제출 방지 | `isSubmitting=true` 상태 재클릭 | fetch 1회만 호출 | High |
| TS-70 | [취소] 클릭 | 취소 버튼 클릭 | `onCancel` 콜백 1회 호출 | High |

#### PasswordConfirmModal (transactions 삭제) 테스트

**사전 조건**: MSW `DELETE /api/transactions/:id` 핸들러.

| ID | 시나리오 | 입력 조건 | 기대 결과 | Priority |
|----|---------|---------|---------|----------|
| TS-80 | 모달 열림 상태 렌더링 | `open=true` | 다이얼로그 DOM 존재, 비밀번호 입력 autoFocus | Critical |
| TS-81 | 모달 닫힘 상태 | `open=false` | 다이얼로그 DOM 미존재 | Critical |
| TS-82 | 비밀번호 입력 controlled | `userEvent.type(pwInput, 'pass')` | input value='pass', type='password' | High |
| TS-83 | 삭제 확인 — 성공 | MSW DELETE 204, pw 입력 → [확인] | `onSuccess` 1회 호출 | Critical |
| TS-84 | 비밀번호 불일치 — 403 | MSW DELETE 403 | "비밀번호가 올바르지 않습니다" 표시, 입력 초기화 | Critical |
| TS-85 | 확인 중 로딩 | MSW 지연 중 | [확인] 버튼 `disabled` | High |
| TS-86 | 중복 제출 방지 | `isSubmitting=true` 재클릭 | fetch 1회만 호출 | High |
| TS-87 | [취소] 클릭 | 취소 버튼 클릭 | `onClose` 1회 호출, 비밀번호 초기화 | High |
| TS-88 | Escape 키 닫힘 | `userEvent.keyboard('{Escape}')` | `onClose` 1회 호출 | Medium |
| TS-89 | `role="dialog"` + `aria-modal` | 마운트 | `role="dialog"`, `aria-modal="true"` DOM 속성 | High |

#### useDebounce 훅 테스트

| ID | 시나리오 | 입력 조건 | 기대 결과 | Priority |
|----|---------|---------|---------|----------|
| TS-90 | 초기값 즉시 반환 | `useDebounce('init', 300)` | 초기값 'init' 즉시 반환 | High |
| TS-91 | 지연 후 값 갱신 | 값 변경 후 300ms 경과 | 새 값으로 갱신 | High |
| TS-92 | 지연 내 재입력 — 이전 값 유지 | 100ms 간격 연속 변경 | 마지막 변경 후 300ms까지 이전 값 유지 | High |

---

### 9.3 엣지 케이스

| ID | 케이스 | 예상 동작 | 검증 방법 |
|----|--------|---------|---------|
| EC-01 | 수량에 음수 입력 | 폼 유효성 오류 "수량은 양수여야 합니다" | `userEvent.type(quantityInput, '-5')` + 저장 클릭 |
| EC-02 | 금액 0 입력 | 폼 유효성 오류 "금액은 0보다 커야 합니다" | `userEvent.type(amountInput, '0')` + 저장 클릭 |
| EC-03 | 소수점 수량 (0.5주) | `parseFloat('0.5')` 정상 처리, 저장 가능 | `userEvent.type(quantityInput, '0.5')` + 성공 MSW |
| EC-04 | 대량 거래 (100건) 렌더링 | 10건 슬라이스만 표시, 성능 오류 없음 | 100건 픽스처 + currentPage=1 렌더 테스트 |
| EC-05 | 필터 변경 시 페이지 리셋 | 필터 변경 후 `currentPage === 1` | 필터 변경 후 currentPage 상태 검증 |
| EC-06 | 주식 선택 후 재선택 | 배지 업데이트, 현재가 재조회 | 두 번 연속 selectOptions 변경 |
| EC-07 | 네트워크 오류 (POST 실패) | `submitError` "연결에 실패했습니다", `onSuccess` 미호출 | MSW network error 핸들러 |
| EC-08 | DIVIDEND → BUY 전환 후 저장 | 수량/단가 필드 재마운트, 이전 DIVIDEND 금액 초기화 | 유형 전환 순서 + 저장 검증 |

---

### 9.4 테스트 구현 순서

TDD 원칙에 따라 테스트 파일 먼저 작성(Red), 구현(Green), 리팩터링 순서로 진행.

| 순서 | 파일 | 선행 조건 | 설명 |
|-----|-----|---------|-----|
| 1 | `src/__tests__/mocks/handlers/transactions.ts` | — | MSW 핸들러 (GET/POST/PUT/DELETE + prices) |
| 2 | `src/__tests__/fixtures/transactions.ts` | — | mock 데이터 픽스처 (BUY/SELL/DIVIDEND 각 1건, stocks 2건) |
| 3 | `src/__tests__/hooks/useDebounce.test.ts` | — | useDebounce 훅 테스트 (TS-90~92) |
| 4 | `src/hooks/useDebounce.ts` | 테스트 | 훅 구현 |
| 5 | `src/__tests__/components/transactions/TransactionTypeBadge.test.tsx` | 픽스처 | badge 렌더 테스트 (TS-01~03) |
| 6 | `src/components/transactions/TransactionTypeBadge.tsx` | 테스트 | badge 구현 |
| 7 | `src/__tests__/components/transactions/TransactionRow.test.tsx` | badge, 픽스처 | 행 렌더/이벤트 테스트 (TS-10~17) |
| 8 | `src/components/transactions/TransactionRow.tsx` | 테스트 | 행 구현, group hover 패턴 |
| 9 | `src/__tests__/components/transactions/TransactionFilterBar.test.tsx` | useDebounce | 필터 테스트 (TS-20~25) |
| 10 | `src/components/transactions/TransactionFilterBar.tsx` | 테스트 | 필터 구현, 디바운스 적용 |
| 11 | `src/__tests__/components/transactions/Pagination.test.tsx` | — | 페이지네이션 테스트 (TS-30~37) |
| 12 | `src/components/transactions/Pagination.tsx` | 테스트 | 페이지네이션 구현 |
| 13 | `src/__tests__/components/transactions/TransactionTable.test.tsx` | Row, badge | 테이블 렌더 테스트 (TS-40~43) |
| 14 | `src/components/transactions/TransactionTable.tsx` | 테스트 | 테이블 구현 |
| 15 | `src/__tests__/components/transactions/PasswordConfirmModal.test.tsx` | MSW | 삭제 모달 테스트 (TS-80~89) |
| 16 | `src/components/transactions/PasswordConfirmModal.tsx` | 테스트 | 삭제 비밀번호 모달 구현 |
| 17 | `src/__tests__/components/transactions/TransactionForm.test.tsx` | MSW, 픽스처 | 폼 전체 테스트 (TS-50~70) |
| 18 | `src/components/transactions/TransactionForm.tsx` | 테스트 | 폼 구현, 자동 계산 + 비밀번호 섹션 포함 |
| 19 | `src/components/transactions/TransactionFormModal.tsx` | Form | 모달 래퍼, modal-strip, 오버레이, Escape 키 |
| 20 | `src/__tests__/components/transactions/TransactionsClientShell.test.tsx` | 모든 하위 컴포넌트 | 통합 흐름 테스트 |
| 21 | `src/components/transactions/TransactionsClientShell.tsx` | 테스트 | 상태 허브, router.refresh() |
| 22 | `src/app/dashboard/transactions/page.tsx` | ClientShell | Server Component, 초기 데이터 fetch |

---

## 10. Implementation Guide

### 10.1 File Structure

```
src/
  app/
    dashboard/
      transactions/
        page.tsx                                ← Server Component, 초기 데이터 fetch
  components/
    transactions/
      TransactionsClientShell.tsx               ← Client Component, 상태 허브
      TransactionFilterBar.tsx                  ← Client Component, 필터 UI
      TransactionTable.tsx                      ← Client Component, 테이블 + 빈 상태
      TransactionRow.tsx                        ← Client Component, 단일 행
      TransactionTypeBadge.tsx                  ← Client Component, 유형 chip
      Pagination.tsx                            ← Client Component, 페이지네이션
      TransactionFormModal.tsx                  ← Client Component, 오버레이 모달 래퍼
      TransactionForm.tsx                       ← Client Component, 전체 폼 + 자동 계산
      PasswordConfirmModal.tsx                  ← Client Component, 삭제 비밀번호 확인
  hooks/
    useDebounce.ts                              ← 범용 디바운스 훅 (신규)
  app/api/
    transactions/
      route.ts                                  ← GET /api/transactions, POST /api/transactions
      [id]/
        route.ts                                ← PUT /api/transactions/[id], DELETE /api/transactions/[id]
  lib/
    transactions.ts                             ← Supabase transactions CRUD 유틸 (서버 전용)
  __tests__/
    components/
      transactions/
        TransactionTypeBadge.test.tsx
        TransactionRow.test.tsx
        TransactionFilterBar.test.tsx
        TransactionTable.test.tsx
        Pagination.test.tsx
        TransactionForm.test.tsx
        PasswordConfirmModal.test.tsx
        TransactionsClientShell.test.tsx
    hooks/
      useDebounce.test.ts
    fixtures/
      transactions.ts
    mocks/
      handlers/
        transactions.ts
```

---

### 10.2 Implementation Notes

**주의사항:**

- `TransactionTypeBadge`, `TransactionRow`, `TransactionTable`, `TransactionFilterBar`, `Pagination`은 순수 표현 컴포넌트로 유지 — fetch 로직 없음
- `TransactionForm` 내 비밀번호 입력: 점선 구분선 아래 인라인 섹션 (저장과 비밀번호를 한 번에 처리)
- `PasswordConfirmModal`은 삭제 전용으로만 사용 (추가/수정은 TransactionForm 내 비밀번호 섹션)
- `useDebounce` 훅은 `src/hooks/` 경로에 작성 — 향후 대시보드 검색 등 재사용 가능
- `router.refresh()` 호출: 모달 닫힘 직후 호출 (UI 깜빡임 최소화)
- `group hover:` Tailwind 패턴으로 행 호버 시 버튼 노출 (`<tr className="group">`)
- `TransactionFormModal`의 modal-strip: `h-1.5 bg-gradient-to-r from-accent via-green-bright to-blue-bright`
- 금액 필드: 우측에 `(자동)` / `(직접 입력)` 레이블 — `text-warm-mid/50 text-xs italic`
- 03-stocks의 `PasswordConfirmModal`은 stocks API를 직접 호출하므로, transactions 전용 컴포넌트를 별도 작성

**다크 테마 색상 토큰 요약:**
- 상승/SELL 양수 → `text-green-bright` (`#6bba8a`)
- 하락/BUY 음수 → `text-red-bright` (`#d07070`)
- 배당/DIVIDEND → `text-blue-bright` (`#6898cc`)
- 레이블/보조 텍스트 → `text-warm-mid` (`#c8c0b0`)
- 주요 텍스트 → `text-paper` (`#f4f0e8`)
- 배경 → `bg-ink` (`#0a0a08`)
- 포인트 → `bg-accent` (`#c8a96e`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-11 | 백엔드 섹션 초안 (Section 3, 4, 6) | backend-designer |
| 0.2 | 2026-03-11 | Section 5 (UI/UX), Section 7~9 추가 (frontend-designer) | frontend-designer |
