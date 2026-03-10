# Foundation Design Document

> **Summary**: Next.js 14 App Router 기반 인프라 설정 — 디자인 시스템 토큰, 기반 라이브러리(supabase/auth/yahoo/calculations) 인터페이스 명세, DB 스키마, Vercel 배포 아키텍처
>
> **Project**: investlog
> **Version**: 0.1.0
> **Author**: dev
> **Date**: 2026-03-10
> **Status**: Draft
> **Complexity**: medium
> **Planning Doc**: [01-foundation.plan.md](../01-plan/features/01-foundation.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 전체 feature(02~05)가 공통으로 사용하는 라이브러리 모듈의 인터페이스를 명확히 정의한다.
- investlog 전체 화면에 걸쳐 일관성을 유지하는 디자인 토큰과 타이포그래피 시스템을 구축한다.
- Supabase 무료 플랜의 제약(1주 미접속 일시정지)을 Vercel Cron으로 안전하게 해결한다.
- 보안: 서버 전용 키(Service Role, JWT Secret)가 클라이언트에 절대 노출되지 않도록 설계한다.

### 1.2 Design Principles

- **단일 진실 소스**: 타입, 색상 토큰, 환경변수 목록은 한 곳에서 정의하고 전체에서 참조한다.
- **Fail Fast**: 환경변수 미설정 시 런타임 중간에 실패하지 않고 시작 시점에 즉시 에러를 던진다.
- **서버/클라이언트 경계 명확화**: `supabaseAdmin`은 서버 전용, `supabaseClient`는 클라이언트 허용으로 명확히 분리한다.
- **순수 계산 함수**: `calculations.ts`의 모든 함수는 외부 의존성 없는 순수 함수로 구현하여 테스트 용이성을 확보한다.

---

## 2. Architecture

### 2.1 System Overview

```
+-------------------+       HTTPS        +-------------------------+
|                   | ----------------->  |                         |
|   Browser         |                     |   Next.js 14 Server     |
|   (Client)        | <-----------------  |   (Vercel Serverless)   |
|                   |   HTML/JSON/Cookie  |                         |
+-------------------+                     +---+-------+--------+---+
                                              |       |        |
                              supabaseAdmin   |       |        |  yahoo-finance2
                              (service_role)  |       |        |  (HTTP, no key)
                                              v       |        v
                                +-------------+--+    |    +---+------------------+
                                |                 |   |    |                      |
                                |  Supabase       |   |    |  Yahoo Finance API   |
                                |  (PostgreSQL)   |   |    |  (quote/historical/  |
                                |  Free 500MB     |   |    |   search)            |
                                |                 |   |    |                      |
                                +-----------------+   |    +----------------------+
                                       ^              |
                                       |              |
                                       |   +----------+-----------+
                                       |   |                      |
                                       +---+  Vercel Cron         |
                                           |  (0 0 * * * UTC)     |
                                           |  GET /api/cron/ping  |
                                           +----------------------+
```

**컴포넌트 역할 요약**

| 컴포넌트 | 역할 | 기술 |
|----------|------|------|
| Browser (Client) | UI 렌더링, 사용자 입력, JWT 쿠키 자동 전송 | React (Next.js App Router) |
| Next.js Server | API Routes, Server Components, 미들웨어 인증 | Next.js 14, Vercel Serverless Functions |
| Supabase (PostgreSQL) | stocks/transactions 영구 저장, UUID 생성, 트리거 | Supabase Free (500MB) |
| Yahoo Finance API | 실시간 주가, 과거 데이터, 티커 검색 | yahoo-finance2 (API Key 불필요) |
| Vercel Cron | Supabase 무료 플랜 1주 미접속 일시정지 방지 | vercel.json cron 설정 |

### 2.2 Data Flow

#### 2.2.1 인증 흐름

```
Browser                    Next.js Server                 환경변수
  |                              |                           |
  |  POST /api/auth/login       |                           |
  |  { password }               |                           |
  |----------------------------->                           |
  |                              |  bcrypt.compare(          |
  |                              |    password,              |
  |                              |    AUTH_PASSWORD_HASH)  <-+
  |                              |-- 불일치 --> 401           |
  |                              |-- 일치 --> signJwt()       |
  |  Set-Cookie: token=<jwt>;   |                           |
  |  HttpOnly; Secure; Lax      |                           |
  |<-----------------------------|                           |
  |                              |                           |
  |  GET /dashboard             |                           |
  |  Cookie: token=<jwt>        |                           |
  |----------------------------->                           |
  |         middleware.ts: verifyJwt(token)                 |
  |                              |-- 유효 --> page 렌더링    |
  |                              |-- 무효 --> 302 Redirect / |
```

#### 2.2.2 쓰기 API 흐름 (이중 인증)

```
Browser                    Next.js Server              Supabase
  |  POST /api/stocks            |                        |
  |  Cookie: token=<jwt>        |                        |
  |  Body: { password, data }   |                        |
  |----------------------------->|                        |
  |         1) verifyJwt()       |                        |
  |         2) comparePassword() |                        |
  |                              |-- 실패 --> 401          |
  |                              |  supabaseAdmin.insert() |
  |                              |----------------------->|
  |  201 JSON { data }          |<-----------------------|
  |<-----------------------------|                        |
```

#### 2.2.3 Vercel Cron 흐름

```
Vercel Cron (UTC 00:00)    Next.js Server              Supabase
  |  GET /api/cron/ping          |                           |
  |----------------------------->|                           |
  |         CRON_SECRET 검증      |                           |
  |                              |  supabaseAdmin.select()   |
  |                              |-------------------------->|
  |  200 { ok: true }           |<--------------------------|
  |<-----------------------------|                           |
```

### 2.3 Dependencies

| 패키지 | 버전 | 용도 | 사용 위치 |
|--------|------|------|----------|
| `next` | 14.x | App Router 프레임워크 | 전체 |
| `react` / `react-dom` | 18.x | UI 렌더링 | 전체 |
| `@supabase/supabase-js` | ^2.x | Supabase PostgreSQL 클라이언트 | `lib/supabase.ts` |
| `jose` | ^5.x | JWT 서명/검증 (Edge Runtime 호환) | `lib/auth.ts`, `middleware.ts` |
| `bcryptjs` | ^2.x | 비밀번호 해시 비교 | `lib/auth.ts` |
| `yahoo-finance2` | ^2.x | 주가 조회, 과거 데이터, 종목 검색 | `lib/yahoo.ts` |
| `recharts` | ^2.x | 차트 시각화 | `components/dashboard/` |

**jose/bcryptjs 선택 이유**: 두 패키지 모두 네이티브 바이너리 없는 순수 JS 구현. Vercel Serverless 및 Edge Runtime 환경에서 완전 호환.

### 2.4 디렉토리 구조 (이번 feature 범위: `[F]`)

```
investlog/
├── src/
│   ├── app/
│   │   ├── layout.tsx              [F] 루트 레이아웃 (폰트, 메타, 전역 스타일)
│   │   ├── page.tsx                    로그인 페이지 (02-auth)
│   │   ├── dashboard/
│   │   │   ├── page.tsx                대시보드 (05-dashboard)
│   │   │   ├── stocks/page.tsx         주식상품 관리 (03-stocks)
│   │   │   └── transactions/page.tsx   거래내역 관리 (04-transactions)
│   │   └── api/
│   │       ├── auth/login/route.ts     (02-auth)
│   │       ├── auth/logout/route.ts    (02-auth)
│   │       ├── cron/ping/route.ts  [F] Supabase keep-alive
│   │       ├── prices/route.ts         (05-dashboard)
│   │       ├── stocks/route.ts         (03-stocks)
│   │       └── transactions/route.ts   (04-transactions)
│   ├── lib/
│   │   ├── supabase.ts            [F] Supabase Admin/Client 인스턴스
│   │   ├── auth.ts                [F] JWT 발급/검증, bcrypt 비교
│   │   ├── yahoo.ts               [F] yahoo-finance2 래퍼
│   │   └── calculations.ts        [F] 손익/수익률/비중 계산
│   ├── types/
│   │   └── index.ts               [F] Stock, Transaction 타입 정의
│   └── middleware.ts                   (02-auth)
├── vercel.json                    [F] Cron 설정
├── .env.local                     [F] 환경변수 (gitignore)
├── .env.example                   [F] 환경변수 템플릿 (커밋)
├── tailwind.config.js             [F] 색상 토큰, 폰트 설정
└── package.json                   [F] 의존성 정의
```

### 2.5 Supabase Admin/Client 분리 아키텍처

| 구분 | `supabaseAdmin` | `supabaseClient` |
|------|-----------------|-------------------|
| 사용 키 | `SUPABASE_SERVICE_ROLE_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| RLS | 무시 (bypass) | 적용됨 |
| 사용 위치 | Server only (API Routes, Server Components) | Client Component 또는 Server |
| 용도 | 모든 CRUD 작업 | 읽기 전용 |
| 인스턴스 전략 | 모듈 레벨 싱글톤 | 필요 시 생성 |

---

## 3. Data Model

### 3.1 Entity Definitions

#### 3.1.1 Stock (주식상품)

```typescript
interface Stock {
  id: string;          // UUID, Primary Key
  ticker: string;      // Yahoo Finance 티커 (예: 005930.KS, AAPL, 7203.T)
  name: string;        // 종목명 (예: 삼성전자, Apple Inc.)
  market: string;      // 거래소 식별자 (예: KRX, NASDAQ, NYSE, TSE)
  country: 'KR' | 'US' | 'JP' | string; // ISO 2자리 국가 코드
  currency: 'KRW' | 'USD' | 'JPY' | string; // ISO 통화 코드
  sector?: string;     // 업종 (예: Technology, 반도체)
  memo?: string;       // 사용자 메모
  created_at: string;  // ISO 8601 timestamp
  updated_at: string;  // ISO 8601 timestamp
}
```

| 필드 | 제약 | 설명 |
|------|------|------|
| `ticker` | UNIQUE, NOT NULL | 동일 티커 중복 등록 불가 |
| `name` | NOT NULL | 종목명 필수 |
| `market` | NOT NULL | 거래소 식별자 필수 |
| `country` | NOT NULL | 국가 코드 필수 |
| `currency` | NOT NULL | 통화 코드 필수 |
| `sector` | NULLABLE | 선택 입력 |
| `memo` | NULLABLE | 자유 텍스트 |

#### 3.1.2 Transaction (거래내역)

```typescript
type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND';

interface Transaction {
  id: string;            // UUID, Primary Key
  stock_id: string;      // stocks.id FK (NOT NULL)
  type: TransactionType; // 거래 유형
  date: string;          // 거래일 (YYYY-MM-DD)
  quantity?: number;     // 수량 — BUY/SELL 필수, DIVIDEND null 허용
  price?: number;        // 단가 — Stock.currency 기준, DIVIDEND null 허용
  amount: number;        // 총 금액 (NOT NULL)
  memo?: string;         // 거래 메모
  created_at: string;    // ISO 8601 timestamp
  updated_at: string;    // ISO 8601 timestamp
}
```

| 필드 | 제약 | 설명 |
|------|------|------|
| `stock_id` | FK → stocks.id, NOT NULL | 반드시 등록된 종목과 연결 |
| `type` | CHECK IN ('BUY','SELL','DIVIDEND') | 3가지 유형만 허용 |
| `date` | NOT NULL | 거래 기준일 |
| `quantity` | NULLABLE | BUY/SELL에서는 입력 권장, DIVIDEND에서는 생략 가능 |
| `price` | NULLABLE | BUY/SELL에서는 입력 권장, DIVIDEND에서는 생략 가능 |
| `amount` | NOT NULL | 모든 거래 유형에서 총 금액 필수 |

#### 3.1.3 보조 타입 정의

```typescript
// lib/yahoo.ts 반환 타입
interface PriceQuote {
  price: number;
  currency: string;
  changePercent: number;
  name: string;
}

interface HistoricalData {
  date: string;   // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;  // 수정 종가 기준
  volume: number;
}

interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;  // Yahoo 코드 (KSC, NMS, NYQ 등)
  market: string;    // 정규화된 거래소 명칭
  country: string;
  currency: string;
}

// lib/auth.ts 반환 타입
interface JwtPayload {
  sub: string;   // 항상 'admin'
  iat: number;
  exp: number;
}

// lib/calculations.ts 반환 타입
interface DailyBalance {
  date: string;    // YYYY-MM-DD
  balance: number; // 누적 잔고 (BUY 누적 - SELL 누적)
}

type WeightByStock = Record<string, number>; // Key: stock_id, Value: 비중(%)
```

### 3.2 Entity Relationships

```
stocks (1) ──────────────── (N) transactions
  id <──────── stock_id (FK, NOT NULL)
```

| 항목 | 내용 |
|------|------|
| 관계 유형 | One-to-Many (stocks : transactions = 1 : N) |
| 참조 무결성 | `transactions.stock_id` → `stocks.id` (FK 제약) |
| 삭제 정책 | RESTRICT — 연결된 거래내역 존재 시 DB 에러. 애플리케이션 레이어에서 사전 경고 |
| 주요 조회 패턴 | `stock_id` 기준 거래내역 필터링, 날짜 내림차순 최근 내역 조회 |

### 3.3 DB Schema (Supabase SQL)

```sql
-- stocks 테이블
CREATE TABLE stocks (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker      VARCHAR(20)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  market      VARCHAR(20)  NOT NULL,
  country     VARCHAR(10)  NOT NULL,
  currency    VARCHAR(10)  NOT NULL,
  sector      VARCHAR(50),
  memo        TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- transactions 테이블
CREATE TABLE transactions (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id    UUID         NOT NULL REFERENCES stocks(id),
  type        VARCHAR(10)  NOT NULL CHECK (type IN ('BUY', 'SELL', 'DIVIDEND')),
  date        DATE         NOT NULL,
  quantity    NUMERIC,
  price       NUMERIC,
  amount      NUMERIC      NOT NULL,
  memo        TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_transactions_stock_id ON transactions(stock_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);

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

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 4. Library Interface Specification

> 이 feature는 HTTP API Route를 직접 노출하지 않는다. 이후 feature들이 공통으로 사용하는 라이브러리 모듈의 인터페이스를 정의한다.

### 4.1 lib/supabase.ts

| 식별자 | 타입 | 용도 |
|--------|------|------|
| `supabaseAdmin` | `SupabaseClient` | 서버 전용 (service_role 키). RLS 우회, CRUD 가능 |
| `supabaseClient` | `SupabaseClient` | 읽기용 (anon 키). 클라이언트 컴포넌트에서 사용 가능 |

**인스턴스 전략**: 모듈 최상위 레벨 싱글톤. Vercel Serverless warm instance에서 모듈 캐시 재사용.

### 4.2 lib/auth.ts

```typescript
signJwt(payload: { sub: string }, expiresIn: string): Promise<string>
// 알고리즘: HS256, 키: JWT_SECRET

verifyJwt(token: string): Promise<JwtPayload | null>
// 실패(만료/변조/형식오류) 시 null 반환 (예외 전파 없음)

comparePassword(plain: string, hash: string): Promise<boolean>
// 내부: bcryptjs.compare(), 에러 시 false 반환
```

**JWT 쿠키 명세** (발급 API Route에서 설정)

| 속성 | 값 |
|------|-----|
| 이름 | `token` |
| HttpOnly | true |
| Secure | true (프로덕션) |
| SameSite | `lax` |
| MaxAge | 604800 (7일) |
| Path | `/` |

### 4.3 lib/yahoo.ts

```typescript
getQuote(ticker: string): Promise<PriceQuote>
// 실패 시 YahooFinanceError throw

getHistorical(ticker: string, from: string, to: string, interval: '1d' | '1mo'): Promise<HistoricalData[]>
// 데이터 없으면 [] 반환

searchTicker(query: string): Promise<SearchResult[]>
// 결과 없으면 [] 반환
```

**Yahoo Finance 티커 규칙**

| 시장 | 형식 | 예시 |
|------|------|------|
| 한국 KOSPI | `종목코드.KS` | `005930.KS` |
| 한국 KOSDAQ | `종목코드.KQ` | `247540.KQ` |
| 미국 | 그대로 | `AAPL`, `NVDA` |
| 일본 | `코드.T` | `7203.T` |

### 4.4 lib/calculations.ts

모든 함수는 순수 함수 (외부 의존성 없음). 빈 배열 입력 시 0 또는 빈 구조 반환.

```typescript
calcTotalInvested(transactions: Transaction[]): number
// SUM(amount) where type === 'BUY'

calcRealizedPnL(transactions: Transaction[]): number
// SUM(SELL.amount) - SELL 시점 평균매입원가 (평균법)

calcDividendIncome(transactions: Transaction[]): number
// SUM(amount) where type === 'DIVIDEND'

calcTotalReturn(transactions: Transaction[]): number
// (실현손익 + 배당수익) / 총투자금 × 100, 투자금 0이면 0 반환

calcWeightByStock(transactions: Transaction[]): WeightByStock
// 종목별 보유금액 / 전체 보유금액 × 100

calcDailyBalance(transactions: Transaction[]): DailyBalance[]
// 날짜 오름차순, BUY 누적 - SELL 누적 (DIVIDEND 제외)
```

**calcRealizedPnL 평균법 예시**
```
BUY  100주 @10,000원 → 평균단가: 10,000원
BUY   50주 @12,000원 → 평균단가: (1,000,000 + 600,000) / 150 = 10,667원
SELL  80주 @13,000원 → 원가: 80 × 10,667 = 853,333원
                      실현손익: 1,040,000 - 853,333 = 186,667원
```

### 4.5 환경변수 명세

| 변수명 | 노출 범위 | 필수 | 설명 |
|--------|----------|------|------|
| `AUTH_PASSWORD_HASH` | Server only | 필수 | bcrypt 해시된 비밀번호 |
| `JWT_SECRET` | Server only | 필수 | JWT 서명용 시크릿 (32자 이상 랜덤) |
| `NEXT_PUBLIC_SUPABASE_URL` | Client+Server | 필수 | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client+Server | 필수 | Supabase anon 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | 필수 | Supabase service_role 키 |
| `CRON_SECRET` | Server only | 필수 | Cron 엔드포인트 인증 시크릿 |

---

## 5. UI/UX Design

### 5.1 Design System

#### 5.1.1 색상 토큰 (wireframe.html CSS 변수 기반)

| 토큰 | Hex | 용도 |
|------|-----|------|
| `ink` | `#0a0a08` | 주 텍스트, 다크 배경 |
| `paper` | `#f4f0e8` | 카드 배경, 밝은 텍스트 |
| `cream` | `#ede9df` | 페이지 배경 (밝은 영역) |
| `warm-mid` | `#c8c0b0` | 보조 텍스트, placeholder |
| `accent` | `#c8a96e` | 골든 강조, 로고, 활성 상태 |
| `accent-dim` | `#8a7248` | accent 어두운 변형, 폼 레이블 |
| `green` / `green-pale` / `green-bright` | `#3d6b4f` / `#ddeee4` / `#6bba8a` | 수익/매수/양수 |
| `red` / `red-pale` / `red-bright` | `#8b3a3a` / `#f0dede` / `#d07070` | 손실/매도/음수 |
| `blue` / `blue-pale` / `blue-bright` | `#2c4a6e` / `#dde6f0` / `#6898cc` | 정보/배당/링크 |

#### 5.1.2 타이포그래피 시스템

| Tailwind 키 | 폰트 | 주요 사용처 |
|-------------|------|------------|
| `font-display` | Bebas Neue | 로고, KPI 숫자, 대형 헤드라인 |
| `font-serif` | Instrument Serif | 대시보드 부제, 이탤릭 강조 |
| `font-mono` | DM Mono | 금액, 티커, 날짜 (숫자 정렬 보장) |
| `font-kr` | Noto Serif KR | 한국어 UI 레이블, 테이블 본문 (기본값) |

**Google Fonts 로드 스펙**

| 폰트 | Weight/Style |
|------|-------------|
| Instrument Serif | 400, 400 italic |
| DM Mono | 300, 400, 500 |
| Bebas Neue | 400 |
| Noto Serif KR | 300, 400, 500, 700 |

### 5.2 Component List

| 파일 | 책임 |
|------|------|
| `tailwind.config.js` | 색상 토큰, 폰트 패밀리 확장 등록 |
| `src/app/globals.css` | Tailwind 지시어, CSS 변수(`:root`), 전역 초기화 |
| `src/app/layout.tsx` | 루트 레이아웃, 폰트 로드(next/font/google), 메타데이터 |

### 5.3 Tailwind 설정 구조

#### 5.3.1 colors 확장

```
theme.extend.colors:
  ink: '#0a0a08'
  paper: '#f4f0e8'
  cream: '#ede9df'
  warm-mid: '#c8c0b0'
  accent: '#c8a96e'
  accent-dim: '#8a7248'
  green:
    DEFAULT: '#3d6b4f'
    pale: '#ddeee4'
    bright: '#6bba8a'
  red:
    DEFAULT: '#8b3a3a'
    pale: '#f0dede'
    bright: '#d07070'
  blue:
    DEFAULT: '#2c4a6e'
    pale: '#dde6f0'
    bright: '#6898cc'
```

#### 5.3.2 fontFamily 확장

```
theme.extend.fontFamily:
  display: ['Bebas Neue', 'sans-serif']
  serif: ['Instrument Serif', 'Georgia', 'serif']
  mono: ['DM Mono', 'Courier New', 'monospace']
  kr: ['Noto Serif KR', 'Malgun Gothic', 'serif']
```

#### 5.3.3 layout.tsx 구조

```
<html lang="ko">
  <body className="[CSS 변수 클래스] bg-ink text-paper antialiased">
    {children}
  </body>
</html>
```

Metadata: `title: 'investlog'`, `description: 'Your Investment, Logged.'`

---

## 6. Error Handling

### 6.1 에러 분류 및 처리 방침

| 에러 유형 | 발생 위치 | 처리 방침 |
|-----------|-----------|-----------|
| 환경변수 미설정 | 모듈 초기화 시 | Fail Fast — 시작 시점에 즉시 throw |
| JWT 만료/변조/형식오류 | `verifyJwt()` | `null` 반환 (예외 전파 없음) |
| bcrypt 비교 실패 | `comparePassword()` | `false` 반환 |
| Yahoo Finance 오류 | `getQuote()` 등 | `YahooFinanceError` throw → 호출부에서 503 응답 |
| 계산 함수 엣지케이스 | `calculations.ts` | 기본값(`0`, `[]`, `{}`) 반환 |

### 6.2 환경변수 검증 위치

| 환경변수 | 검증 위치 |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase.ts` 모듈 로드 시 |
| `JWT_SECRET` | `lib/auth.ts` 모듈 로드 시 |
| `AUTH_PASSWORD_HASH` | API Route에서 `comparePassword()` 호출 전 |
| `CRON_SECRET` | `/api/cron/ping` 핸들러 최상단 |

### 6.3 JWT 에러 처리

| jose 예외 | verifyJwt() 반환 | 호출부 처리 |
|-----------|-----------------|------------|
| `JWTExpired` | `null` | middleware → 302 /, API Route → 401 |
| `JWSSignatureVerificationFailed` | `null` | 동일 |
| `JWTInvalid` | `null` | 동일 |

### 6.4 Yahoo Finance 에러 처리

```
getQuote(ticker) 실패
  → 단일 조회: 503 { error: 'PRICE_FETCH_FAILED', ticker }
  → 복수 일괄 조회: 해당 티커 제외 + 부분 응답 반환

getHistorical() / searchTicker() 실패
  → 빈 배열 [] 반환 허용 (UI empty state로 처리)
```

**국내 종목 티커 형식 강제**

| 국가 | 필수 접미사 |
|------|------------|
| KR | `.KS` (KOSPI) 또는 `.KQ` (KOSDAQ) |
| US | 접미사 없음 |
| JP | `.T` |

### 6.5 공통 에러 응답 포맷

```json
{ "error": "ERROR_CODE", "message": "설명 (선택적)" }
```

| HTTP | 에러 코드 | 발생 상황 |
|------|-----------|-----------|
| 401 | `UNAUTHORIZED` | JWT 없음/만료/변조 |
| 401 | `INVALID_PASSWORD` | bcrypt 비교 실패 |
| 503 | `PRICE_FETCH_FAILED` | yahoo-finance2 조회 실패 |
| 500 | `INTERNAL_ERROR` | 예상치 못한 서버 에러 |

---

## 7. Security Considerations

### 7.1 Service Role Key 서버 전용 관리

`SUPABASE_SERVICE_ROLE_KEY`는 `NEXT_PUBLIC_` 접두사가 없으므로 Next.js 빌드 시 클라이언트 번들에서 자동 제외된다. 노출 시 RLS 우회하여 DB 전체 접근 가능 — 절대 클라이언트 컴포넌트에서 참조 금지.

**검증 방법**: 빌드 후 `.next/static/` JS 파일에서 `service_role` 문자열 grep — 발견 시 즉시 수정.

### 7.2 JWT HttpOnly 쿠키

| 속성 | 방어 대상 |
|------|----------|
| `HttpOnly` | XSS (스크립트로 토큰 탈취 불가) |
| `Secure` | 중간자 공격 (HTTPS에서만 전송) |
| `SameSite=Lax` | CSRF (외부 사이트 POST 요청 시 쿠키 미포함) |

JWT 페이로드에는 식별자(`sub: "admin"`)만 포함. 비밀번호, DB 키 등 민감 정보 포함 금지.

### 7.3 Cron 엔드포인트 보호

`/api/cron/ping`은 public URL이므로 `CRON_SECRET` 헤더 검증 필수. 불일치 시 401 반환. Vercel은 Cron 요청 시 자동으로 인증 헤더를 추가하지 않으므로 직접 검증 코드 구현 필요.

### 7.4 환경변수 관리

| 파일 | Git | 용도 |
|------|-----|------|
| `.env.local` | gitignore (커밋 금지) | 실제 시크릿 값 |
| `.env.example` | 커밋 | 변수 목록 + 설명 (값은 빈 문자열) |

### 7.5 RLS 비활성화 이유 및 대안 보안

단일 사용자 서비스로 Supabase Auth 미사용. 모든 DB 접근은 `supabaseAdmin`(서버 전용)을 통해서만 이루어지며, 클라이언트가 Supabase에 직접 쿼리하는 경로는 존재하지 않는다.

**보안 계층 구조**:
```
Layer 1: Vercel HTTPS — 전송 구간 암호화
Layer 2: middleware.ts — /dashboard/* JWT 검증
Layer 3: API Routes — JWT 검증 + (쓰기 시) 비밀번호 재확인
Layer 4: supabase.ts — 모든 DB 접근을 supabaseAdmin으로 격리
```

---

## 8. Acceptance Criteria

### 8.1 Functional Acceptance Criteria

| ID | Criteria | Verification Method | Priority |
|----|----------|---------------------|----------|
| AC-01 | Given Next.js 프로젝트 생성 후 / When `npm run dev` 실행 시 / Then 에러 없이 localhost:3000 기동 | `npm run dev` 실행 + 브라우저 확인 | Must |
| AC-02 | Given `.env.local` 설정 후 / When `supabaseAdmin.from('stocks').select('id').limit(1)` 실행 시 / Then 에러 없이 응답 반환 | API Route 수동 호출 | Must |
| AC-03 | Given JWT_SECRET 설정 후 / When `signJwt({ sub: 'admin' }, '7d')` 실행 시 / Then `verifyJwt(token)` 이 `{ sub: 'admin' }` 반환 | 단위 테스트 | Must |
| AC-04 | Given AUTH_PASSWORD_HASH 설정 후 / When 올바른 평문 비밀번호로 `comparePassword()` 호출 시 / Then `true` 반환 | 단위 테스트 | Must |
| AC-05 | Given `005930.KS` 티커로 / When `getQuote('005930.KS')` 호출 시 / Then `{ price, currency: 'KRW', changePercent, name }` 반환 | 통합 테스트 | Must |
| AC-06 | Given BUY/SELL 거래 데이터로 / When `calcRealizedPnL()` 호출 시 / Then 평균법 계산 결과 반환 | 단위 테스트 (예시 데이터) | Must |
| AC-07 | Given Supabase SQL 스키마 실행 후 / When stocks 테이블에 INSERT 후 UPDATE 시 / Then `updated_at` 자동 갱신 확인 | Supabase SQL Editor | Must |
| AC-08 | Given tailwind.config.js 설정 후 / When 컴포넌트에 `bg-ink`, `text-accent`, `font-display` 클래스 적용 시 / Then 의도한 색상/폰트 렌더링 | 브라우저 DevTools 시각 확인 | Must |
| AC-09 | Given vercel.json Cron 설정 후 / When `/api/cron/ping` 요청 시 CRON_SECRET 미일치 / Then 401 반환 | curl 수동 테스트 | Must |
| AC-10 | When `tsc --noEmit` 실행 시 / Then 타입 에러 없음 | CI 또는 수동 실행 | Must |

### 8.2 Non-Functional Acceptance Criteria

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Security | `SUPABASE_SERVICE_ROLE_KEY`가 빌드 결과물 JS에 미포함 | `.next/static/` grep |
| Security | JWT 쿠키에 HttpOnly, Secure 속성 확인 | 브라우저 개발자 도구 |
| Type Safety | `any` 타입 미사용 (strict: true) | `tsc --noEmit` |
| Code Quality | `next lint` 에러 없음 | `npm run lint` |

### 8.3 Edge Cases

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| EC-01 | 환경변수 미설정 상태로 서버 기동 시 | 즉시 에러 throw, 서버 기동 실패 |
| EC-02 | 만료된 JWT 토큰으로 API 요청 시 | `verifyJwt()` null 반환 → 401 |
| EC-03 | `yahoo-finance2`가 국내 종목 데이터 반환 실패 시 | `YahooFinanceError` throw → 호출부에서 503 처리 |
| EC-04 | `calcTotalInvested([])`처럼 빈 배열 입력 시 | 모든 계산 함수가 0 또는 빈 구조 반환 |
| EC-05 | ticker UNIQUE 제약 위반으로 DB INSERT 시 | Supabase 에러 반환 → API Route에서 409 응답 |

---

## 9. TDD Test Scenarios

### 9.1 Test Strategy

- **Approach**: TDD (Red-Green-Refactor)
- **Scope**: `lib/auth.ts`, `lib/calculations.ts` 순수 함수 중심
- **Coverage Target**: 80%+
- **Test Framework**: Vitest (Next.js 14 환경 권장)

### 9.2 Test Scenario List

| ID | Target | Description | Input | Expected Output | Priority |
|----|--------|-------------|-------|-----------------|----------|
| TS-01 | `signJwt` / `verifyJwt` | JWT 발급 후 검증 성공 | `{ sub: 'admin' }`, `'7d'` | `{ sub: 'admin', iat, exp }` | Critical |
| TS-02 | `verifyJwt` | 만료 토큰 검증 | 만료된 JWT | `null` | Critical |
| TS-03 | `comparePassword` | 올바른 비밀번호 검증 | 평문 + bcrypt 해시 | `true` | Critical |
| TS-04 | `comparePassword` | 틀린 비밀번호 검증 | 평문 + 다른 해시 | `false` | Critical |
| TS-05 | `calcTotalInvested` | BUY 거래 총합 계산 | BUY [100만원, 60만원] | `1,600,000` | High |
| TS-06 | `calcRealizedPnL` | 평균법 실현손익 계산 | BUY 100주@10000, BUY 50주@12000, SELL 80주@13000 | `186,667` | High |
| TS-07 | `calcDividendIncome` | 배당 수익 합산 | DIVIDEND [5만원, 3만원] | `80,000` | High |
| TS-08 | `calcTotalReturn` | 수익률 계산 (정상) | 투자금 1M, 손익 100K, 배당 50K | `15.00` | High |
| TS-09 | `calcTotalReturn` | 수익률 계산 (투자금 0) | 빈 배열 | `0` | Medium |
| TS-10 | `calcDailyBalance` | 일별 잔고 계산 | BUY→SELL 순서 거래 | 날짜별 잔고 배열 | High |

### 9.3 Edge Cases

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| EC-01 | `calcRealizedPnL` — BUY 없이 SELL 존재 | 원가 0으로 처리 |
| EC-02 | `calcWeightByStock` — 전체 보유금액 0 | `{}` 반환 |
| EC-03 | `verifyJwt` — 잘못된 형식의 문자열 | `null` 반환 |

### 9.4 Test Implementation Order

1. TS-01, TS-02 — JWT 핵심 인증 로직 우선
2. TS-03, TS-04 — bcrypt 비밀번호 검증
3. TS-05, TS-07 — 단순 합산 계산 (의존성 없음)
4. TS-06 — 평균법 (복잡한 계산)
5. TS-08, TS-09, TS-10 — 복합 계산 및 엣지케이스

---

## 10. Implementation Guide

### 10.1 File Structure

```
이번 feature에서 생성/수정하는 파일:

src/
├── app/
│   ├── layout.tsx          (신규) 루트 레이아웃
│   └── globals.css         (신규) 전역 스타일
├── lib/
│   ├── supabase.ts         (신규) Supabase 클라이언트
│   ├── auth.ts             (신규) JWT + bcrypt
│   ├── yahoo.ts            (신규) yahoo-finance2 래퍼
│   └── calculations.ts     (신규) 계산 유틸리티
└── types/
    └── index.ts            (신규) 공통 타입 정의

vercel.json                 (신규) Cron 설정
.env.local                  (신규) 환경변수 (gitignore)
.env.example                (신규) 환경변수 템플릿
tailwind.config.js          (수정) 색상 토큰, 폰트 확장
```

### 10.2 Implementation Order

1. [ ] `npx create-next-app@latest investlog --typescript --tailwind --app`
2. [ ] `npm install @supabase/supabase-js yahoo-finance2 bcryptjs jose @types/bcryptjs`
3. [ ] `tailwind.config.js` — 색상 토큰, 폰트 패밀리 확장
4. [ ] `src/app/globals.css` — Tailwind 지시어, CSS 변수
5. [ ] `src/app/layout.tsx` — 루트 레이아웃, 폰트 로드
6. [ ] `.env.local` / `.env.example` — 환경변수 파일 구성
7. [ ] `src/types/index.ts` — Stock, Transaction 및 보조 타입 정의
8. [ ] `src/lib/supabase.ts` — supabaseAdmin / supabaseClient
9. [ ] `src/lib/auth.ts` — signJwt, verifyJwt, comparePassword
10. [ ] `src/lib/yahoo.ts` — getQuote, getHistorical, searchTicker
11. [ ] `src/lib/calculations.ts` — 계산 함수 6종
12. [ ] Supabase SQL Editor에서 DB 스키마 실행
13. [ ] `vercel.json` — Cron 설정 (`/api/cron/ping`)
14. [ ] `npm run dev` 기동 확인 + `tsc --noEmit` 통과 확인

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-10 | Initial design draft (Section 5, 9) | frontend-designer |
| 0.2 | 2026-03-10 | Section 3 (Data Model), Section 4 (Library Interface Spec), Section 6 (Error Handling) | backend-designer |
| 0.3 | 2026-03-10 | Section 2 (Architecture), Section 7 (Security), Section 1 (Overview), Section 8 (Acceptance Criteria), Section 10 통합 완성 | system-architect |
