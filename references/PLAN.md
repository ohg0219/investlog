# 투자 내역 관리 사이트 기획서

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | investlog (Investment Log) |
| 슬로건 | Your Investment, Logged. |
| 목적 | 개인 투자 내역(매수/매도/배당금)을 안전하게 기록·시각화 |
| 배포 환경 | Vercel (Next.js App Router) |
| 인증 방식 | 비밀번호 기반 (환경변수 보관, JWT 세션) |

---

## 2. 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS |
| 차트 | Recharts |
| DB | Supabase (Postgres) — 무료 플랜 |
| DB 클라이언트 | `@supabase/supabase-js` |
| 인증 | bcryptjs + jose (JWT) |
| 주가 API | yahoo-finance2 (국내·해외 통합, API Key 불필요) |
| 배포 | Vercel |

> **Supabase 선택 이유**: 무료 플랜에서 500MB Postgres + 풍부한 대시보드 제공.  
> 단, **1주 미접속 시 프로젝트 자동 일시정지** → Vercel Cron으로 일 1회 핑으로 해결.

---

## 3. 환경변수 (.env.local)

```
AUTH_PASSWORD_HASH=        # bcrypt 해시된 비밀번호
JWT_SECRET=                # JWT 서명용 시크릿 (32자 이상 랜덤 문자열)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=  # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY= # 서버 전용 service role key (DB 직접 조작용)

# Cron 보안
CRON_SECRET=               # Cron 엔드포인트 무단 호출 방지용 시크릿
```

> `yahoo-finance2`는 API Key 없이 동작하므로 별도 환경변수 불필요.  
> `NEXT_PUBLIC_` 접두사 변수는 클라이언트에 노출됨. DB 쓰기는 반드시 `SUPABASE_SERVICE_ROLE_KEY` 사용.

---

## 4. 페이지 구성

### 4-1. 로그인 페이지 `/`
- 비밀번호 입력 폼
- 제출 시 `/api/auth/login` 호출
- 성공: JWT 쿠키 발급 후 `/dashboard` 리다이렉트
- 실패: 에러 메시지 표시

### 4-2. 대시보드 `/dashboard`
- 인증 미들웨어로 보호 (미인증 시 `/` 리다이렉트)
- 구성 섹션:
  1. **요약 카드** — 총 투자금, 실현 손익, 배당 수익, 총 수익률
  2. **포트폴리오 비중** — 종목별 파이차트
  3. **일별 잔고 추이** — 에어리어 라인차트
  4. **월별 손익 바차트** — 매수·매도·배당 구분
  5. **월별 수익 추이** — 기간 필터(3M/6M/1Y/전체), 실시간 배지, 수익/손실 상하 바차트 + 연간 요약 사이드바
  6. **주식별 월별 수익 추이** — 종목 탭 + 기간 필터, 멀티라인 차트, 매수 평균단가 기준선, 종목별 평가손익 카드
  7. **최근 거래 내역 테이블** — 최근 20건

### 4-3. 주식상품 관리 `/dashboard/stocks`
- 등록된 주식상품 목록 (카드 그리드)
- 상품 추가 / 수정 / 삭제
- Yahoo Finance로 티커 입력 시 종목명·거래소·통화 자동 조회
- 삭제 시 연결된 거래내역 존재 여부 경고

### 4-4. 거래 내역 관리 `/dashboard/transactions`
- 전체 내역 테이블 (종목 필터, 유형 필터, 기간 필터, 검색)
- 추가 시 등록된 주식상품 목록에서 선택 → 나머지 필드 자동 입력
- 추가 / 수정 / 삭제 (쓰기 작업 시 비밀번호 재확인)

---

## 5. 데이터 모델

### Stock (주식상품)
```typescript
interface Stock {
  id: string;          // UUID
  ticker: string;      // Yahoo Finance 티커 (예: 005930.KS, AAPL)
  name: string;        // 종목명 (예: 삼성전자, Apple Inc.)
  market: string;      // 거래소 (예: KRX, NASDAQ, NYSE)
  country: 'KR' | 'US' | 'JP' | string;
  currency: 'KRW' | 'USD' | 'JPY' | string;
  sector?: string;
  memo?: string;
  created_at: string;
  updated_at: string;
}
```

### Transaction (거래내역)
```typescript
type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND';

interface Transaction {
  id: string;
  stock_id: string;     // stocks.id FK
  type: TransactionType;
  date: string;         // YYYY-MM-DD
  quantity?: number;    // BUY/SELL
  price?: number;       // 단가, Stock.currency 기준
  amount: number;       // 총 금액
  memo?: string;
  created_at: string;
  updated_at: string;
}
```

### DB Schema (Supabase SQL Editor에서 실행)
```sql
-- 주식상품
CREATE TABLE stocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 거래내역
CREATE TABLE transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id    UUID         NOT NULL REFERENCES stocks(id),
  type        VARCHAR(10)  NOT NULL CHECK (type IN ('BUY','SELL','DIVIDEND')),
  date        DATE         NOT NULL,
  quantity    NUMERIC,
  price       NUMERIC,
  amount      NUMERIC      NOT NULL,
  memo        TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_stock_id ON transactions(stock_id);
CREATE INDEX idx_transactions_date     ON transactions(date DESC);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stocks_updated_at
  BEFORE UPDATE ON stocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 6. API 설계

### 인증

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/login` | 비밀번호 검증, JWT 쿠키 발급 |
| POST | `/api/auth/logout` | 쿠키 삭제 |

---

### 주가 조회 (yahoo-finance2)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/api/prices?tickers=AAPL,005930.KS` | 현재가 일괄 조회 | JWT |
| GET | `/api/prices/lookup?q=삼성전자` | 티커 검색 (종목 등록 자동완성) | JWT |

**현재가 Response**
```json
{
  "AAPL":      { "price": 182.40, "currency": "USD", "changePercent": 1.2, "name": "Apple Inc." },
  "005930.KS": { "price": 78500,  "currency": "KRW", "changePercent": -0.4, "name": "삼성전자" }
}
```

**yahoo-finance2 사용 예시**
```typescript
import yahooFinance from 'yahoo-finance2';

// 현재가 (국내·해외 동일)
const quote = await yahooFinance.quote('005930.KS');

// 과거 데이터 (월별 수익 추이)
const history = await yahooFinance.historical('005930.KS', {
  period1: '2024-01-01',
  period2: '2025-01-01',
  interval: '1mo',
});

// 티커 자동완성
const results = await yahooFinance.search('삼성전자');
```

**Yahoo Finance 티커 규칙**
| 시장 | 형식 | 예시 |
|------|------|------|
| 한국 KOSPI | `종목코드.KS` | `005930.KS` |
| 한국 KOSDAQ | `종목코드.KQ` | `247540.KQ` |
| 미국 | 그대로 | `AAPL`, `NVDA` |
| 일본 | `코드.T` | `7203.T` |

---

### 주식상품 CRUD

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/api/stocks` | 전체 조회 | JWT |
| POST | `/api/stocks` | 등록 | JWT + 비밀번호 |
| PUT | `/api/stocks/[id]` | 수정 | JWT + 비밀번호 |
| DELETE | `/api/stocks/[id]` | 삭제 | JWT + 비밀번호 |

---

### 거래 내역 CRUD

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/api/transactions` | 전체 조회 (stock_id 필터 가능) | JWT |
| POST | `/api/transactions` | 추가 | JWT + 비밀번호 |
| PUT | `/api/transactions/[id]` | 수정 | JWT + 비밀번호 |
| DELETE | `/api/transactions/[id]` | 삭제 | JWT + 비밀번호 |

**쓰기 공통 Request Body**
```json
{
  "password": "string",
  "data": { /* Stock 또는 Transaction 필드 */ }
}
```

---

### Cron (Supabase 일시정지 방지)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/api/cron/ping` | Supabase에 더미 쿼리로 활성 유지 | `CRON_SECRET` 헤더 |

**구현**
```typescript
// app/api/cron/ping/route.ts
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from('stocks')
    .select('id')
    .limit(1);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, pinged_at: new Date().toISOString() });
}
```

**vercel.json — 매일 오전 9시(KST) 실행**
```json
{
  "crons": [
    {
      "path": "/api/cron/ping",
      "schedule": "0 0 * * *"
    }
  ]
}
```
> Vercel Cron은 UTC 기준. `0 0 * * *` = UTC 00:00 = KST 09:00.  
> Vercel Hobby 플랜은 Cron 2개까지 무료, 최소 주기 1일.  
> Cron 요청 시 Vercel이 자동으로 `Authorization: Bearer <CRON_SECRET>` 헤더를 추가하지 않으므로 `vercel.json`의 `headers` 또는 `CRON_SECRET` 환경변수로 직접 검증.

---

## 7. 인증 흐름

```
[클라이언트]
  └─ POST /api/auth/login { password }
       └─ bcrypt.compare(password, AUTH_PASSWORD_HASH)
            ├─ 실패 → 401
            └─ 성공 → JWT 생성 → Set-Cookie: token=<jwt>; HttpOnly; Secure

[미들웨어 - middleware.ts]
  └─ /dashboard/* 요청마다 쿠키의 JWT 검증
       ├─ 유효 → 통과
       └─ 무효/만료 → 302 → /

[쓰기 API — stocks, transactions POST/PUT/DELETE]
  └─ JWT 검증 + bcrypt.compare(body.password, AUTH_PASSWORD_HASH)
       ├─ 둘 다 통과 → Supabase 서비스 롤 클라이언트로 DB 작업
       └─ 하나라도 실패 → 401
```

---

## 8. Supabase 클라이언트 구성 (lib/supabase.ts)

```typescript
import { createClient } from '@supabase/supabase-js';

// 서버 전용 (API Route, Server Component)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // RLS 무시, 쓰기 가능
);

// 클라이언트용 (읽기 전용 용도라면 anon key도 무방)
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

> 이 프로젝트는 단일 사용자이므로 Supabase Auth를 사용하지 않고  
> JWT + bcrypt 이중 검증으로 직접 인증 처리.  
> RLS는 비활성화하거나, service role key로만 접근하도록 설정.

---

## 9. 디렉토리 구조

```
investment-tracker/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                        # 로그인
│   │   ├── dashboard/
│   │   │   ├── page.tsx                    # 대시보드
│   │   │   ├── stocks/
│   │   │   │   └── page.tsx                # 주식상품 관리
│   │   │   └── transactions/
│   │   │       └── page.tsx                # 거래 내역 관리
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   └── logout/route.ts
│   │       ├── cron/
│   │       │   └── ping/route.ts           # Supabase 활성 유지 (일 1회)
│   │       ├── prices/
│   │       │   ├── route.ts                # GET ?tickers=
│   │       │   └── lookup/route.ts         # GET ?q= (자동완성)
│   │       ├── stocks/
│   │       │   ├── route.ts                # GET, POST
│   │       │   └── [id]/route.ts           # PUT, DELETE
│   │       └── transactions/
│   │           ├── route.ts                # GET, POST
│   │           └── [id]/route.ts           # PUT, DELETE
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginForm.tsx
│   │   ├── dashboard/
│   │   │   ├── SummaryCards.tsx
│   │   │   ├── PortfolioPieChart.tsx
│   │   │   ├── MonthlyBarChart.tsx
│   │   │   ├── MonthlyProfitChart.tsx
│   │   │   ├── StockProfitChart.tsx
│   │   │   ├── DailyLineChart.tsx
│   │   │   └── RecentTransactions.tsx
│   │   ├── stocks/
│   │   │   ├── StockGrid.tsx
│   │   │   ├── StockForm.tsx               # 티커 자동완성 포함
│   │   │   └── PasswordConfirmModal.tsx
│   │   └── transactions/
│   │       ├── TransactionTable.tsx
│   │       ├── TransactionForm.tsx         # 주식상품 선택 드롭다운
│   │       └── PasswordConfirmModal.tsx
│   ├── lib/
│   │   ├── auth.ts                         # JWT 발급·검증, bcrypt
│   │   ├── supabase.ts                     # supabaseAdmin / supabaseClient
│   │   ├── yahoo.ts                        # yahoo-finance2 래퍼
│   │   └── calculations.ts                 # 손익·수익률 계산
│   ├── types/
│   │   └── index.ts
│   └── middleware.ts
├── vercel.json                             # Cron 설정
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## 10. 주요 계산 로직 (calculations.ts)

```
총 투자금  = SUM(BUY.amount)
실현 손익  = SUM(SELL.amount) - SUM(SELL 시점 매입원가)  ← FIFO 또는 평균법
배당 수익  = SUM(DIVIDEND.amount)
총 수익률  = (실현 손익 + 배당 수익) / 총 투자금 × 100

종목별 비중     = 종목별 보유금액 / 전체 보유금액 × 100
월별 손익      = 해당 월 SELL 실현손익 + DIVIDEND
일별 잔고      = 누적 BUY.amount - 누적 SELL.amount (날짜순)

# 월별 수익 추이 (실시간 반영)
월별수익[N]    = 실현손익(해당월) + DIVIDEND(해당월)
현재월 미실현  = (현재가 - 평균매수가) × 보유수량  ← yahoo-finance2 실시간
갱신주기       = 진입 시 1회 + 60초 interval (SWR)

# 주식별 월별 수익 추이
누적수익률[ticker][N] = (해당월말 종가 - 평균매수가) / 평균매수가 × 100
과거 종가             = yahooFinance.historical(ticker, { interval: '1mo' })
```

---

## 11. 개발 순서 (권장)

1. `npx create-next-app@latest investlog --typescript --tailwind --app`
2. `npm install @supabase/supabase-js yahoo-finance2 bcryptjs jose`
3. Supabase 프로젝트 생성 → SQL Editor에서 스키마 실행
4. `.env.local` 환경변수 설정
5. `lib/supabase.ts`, `lib/auth.ts` 구현
6. 인증 API + `middleware.ts` 구현
7. `vercel.json` Cron 설정 + `/api/cron/ping` 구현
8. 주식상품 API (`/api/stocks`, `/api/prices/lookup`)
9. 거래 내역 API (`/api/transactions`)
10. 로그인 페이지 UI
11. 주식상품 관리 페이지 UI
12. 거래 내역 관리 페이지 UI
13. 대시보드 UI (차트·KPI)
14. Vercel 배포 + 환경변수 등록

---

## 12. Vercel 배포 체크리스트

- [ ] `AUTH_PASSWORD_HASH` 환경변수 등록
- [ ] `JWT_SECRET` 환경변수 등록
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 환경변수 등록
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 환경변수 등록
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 환경변수 등록
- [ ] `CRON_SECRET` 환경변수 등록
- [ ] `vercel.json` Cron 경로·스케줄 확인
- [ ] Supabase 프로젝트 DB 스키마 마이그레이션 완료
- [ ] 도메인 설정 (커스텀 도메인 사용 시)
