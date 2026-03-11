// ============================================================
// Stock (주식상품)
// ============================================================

export interface Stock {
  id: string;          // UUID, Primary Key
  ticker: string;      // Yahoo Finance 티커 (예: 005930.KS, AAPL, 7203.T)
  name: string;        // 종목명 (예: 삼성전자, Apple Inc.)
  market: string;      // 거래소 식별자 (예: KRX, NASDAQ, NYSE, TSE)
  country: 'KR' | 'US' | 'JP' | (string & {}); // ISO 2자리 국가 코드
  currency: 'KRW' | 'USD' | 'JPY' | (string & {}); // ISO 통화 코드
  sector?: string;     // 업종 (예: Technology, 반도체)
  memo?: string;       // 사용자 메모
  created_at: string;  // ISO 8601 timestamp
  updated_at: string;  // ISO 8601 timestamp
}

// ============================================================
// Transaction (거래내역)
// ============================================================

export type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND';

export interface Transaction {
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

// ============================================================
// lib/yahoo.ts 반환 타입
// ============================================================

export interface PriceQuote {
  price: number;
  currency: string;
  changePercent: number;
  name: string;
}

export interface HistoricalData {
  date: string;   // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;  // 수정 종가 기준
  volume: number;
}

export interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;  // Yahoo 코드 (KSC, NMS, NYQ 등)
  market: string;    // 정규화된 거래소 명칭
  country: string;
  currency: string;
}

// ============================================================
// lib/auth.ts 반환 타입
// ============================================================

export interface JwtPayload {
  sub: string;   // 항상 'owner'
  iat: number;
  exp: number;
}

// ============================================================
// lib/calculations.ts 반환 타입
// ============================================================

export interface DailyBalance {
  date: string;    // YYYY-MM-DD
  balance: number; // 누적 잔고 (BUY 누적 - SELL 누적)
}

export type WeightByStock = Record<string, number>; // Key: stock_id, Value: 비중(%)

// ============================================================
// 03-stocks 추가 타입
// ============================================================

/** POST/PUT 요청 바디 내 stock 데이터 (id, created_at, updated_at 제외) */
export interface StockInput {
  ticker: string;   // 필수
  name: string;     // 필수
  market: string;   // 필수
  country: string;  // 필수
  currency: string; // 필수
  sector?: string;
  memo?: string;
}

/** 쓰기 요청 공통 바디 */
export interface WriteRequest<T> {
  password: string; // 평문 비밀번호 — bcrypt 검증 후 즉시 폐기
  data: T;
}

/** DELETE 요청 바디 */
export interface DeleteRequest {
  password: string;
}

// ============================================================
// 04-transactions 추가 타입
// ============================================================

/** Transaction + stocks JOIN 응답 */
export interface TransactionWithStock extends Transaction {
  stock: {
    ticker: string;
    name: string;
    currency: string;
  };
}

/** POST/PUT 요청 바디 내 transaction 데이터 */
export interface TransactionInput {
  stock_id: string;        // 필수, UUID
  type: TransactionType;   // 필수: BUY | SELL | DIVIDEND
  date: string;            // 필수: YYYY-MM-DD
  quantity?: number;       // BUY/SELL 필수, DIVIDEND 생략 가능
  price?: number;          // BUY/SELL 필수, DIVIDEND 생략 가능
  amount: number;          // 필수, 양수
  memo?: string;
}

/** POST /api/transactions 요청 바디 */
export type CreateTransactionRequest = WriteRequest<TransactionInput>;

/** PUT /api/transactions/[id] 요청 바디 */
export type UpdateTransactionRequest = WriteRequest<TransactionInput>;

/** GET /api/prices 응답 전체 맵 */
export type PriceMap = Record<string, PriceQuote | null>;

/** GET /api/prices/lookup 응답 단일 항목 */
export interface LookupResult {
  ticker: string;   // Yahoo Finance 심볼
  name: string;     // 종목명
  exchange: string; // Yahoo 거래소 코드 (KSC, NMS, NYQ 등)
  type: string;     // 항상 'EQUITY' (필터됨)
}

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
