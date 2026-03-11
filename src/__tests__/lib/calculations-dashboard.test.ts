/**
 * TDD Test — lib/calculations.ts (dashboard 추가 함수)
 * Design Section 9.2 기반: TS-01 ~ TS-12
 *
 * Pre-Wave Red: 구현 함수가 없으므로 import 에러(Red) 상태가 정상.
 */

import { describe, it, expect } from 'vitest';
import {
  calcMonthlyBreakdown,
  calcMonthlyPnL,
  calcUnrealizedPnL,
  calcStockCumulativeReturn,
} from '@/lib/calculations';
import type {
  Transaction,
  Stock,
  PriceMap,
  MonthlyBreakdown,
  MonthlyPnL,
  StockHistoryPoint,
  UnrealizedPnL,
} from '@/types';

// 테스트용 Transaction 생성 헬퍼
const makeTx = (overrides: Partial<Transaction>): Transaction => ({
  id: 'test-id',
  stock_id: 'stock-a',
  type: 'BUY',
  date: '2025-01-01',
  quantity: 10,
  price: 100,
  amount: 1000,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

// 테스트용 Stock 생성 헬퍼
const makeStock = (overrides: Partial<Stock>): Stock => ({
  id: 'stock-a',
  ticker: 'AAPL',
  name: 'Apple Inc.',
  market: 'NASDAQ',
  country: 'US',
  currency: 'USD',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

// ============================================================
// calcMonthlyBreakdown
// ============================================================

describe('calcMonthlyBreakdown', () => {
  // TS-01: 2개월 거래 집계
  it('TS-01: should aggregate transactions by month', () => {
    const txs: Transaction[] = [
      makeTx({ type: 'BUY', date: '2025-01-10', amount: 100 }),
      makeTx({ type: 'SELL', date: '2025-01-20', amount: 80 }),
      makeTx({ type: 'DIVIDEND', date: '2025-02-05', amount: 10 }),
    ];
    const result: MonthlyBreakdown[] = calcMonthlyBreakdown(txs);
    expect(result).toEqual(
      expect.arrayContaining([
        { month: '2025-01', buy: 100, sell: 80, dividend: 0 },
        { month: '2025-02', buy: 0, sell: 0, dividend: 10 },
      ])
    );
    expect(result).toHaveLength(2);
  });

  // TS-02: 빈 배열 → []
  it('TS-02: should return empty array for empty input', () => {
    expect(calcMonthlyBreakdown([])).toEqual([]);
  });

  // TS-03: DIVIDEND만 있는 거래
  it('TS-03: should handle DIVIDEND-only transactions', () => {
    const txs: Transaction[] = [
      makeTx({ type: 'DIVIDEND', date: '2025-01-15', amount: 50 }),
    ];
    const result: MonthlyBreakdown[] = calcMonthlyBreakdown(txs);
    expect(result).toEqual([{ month: '2025-01', buy: 0, sell: 0, dividend: 50 }]);
  });
});

// ============================================================
// calcMonthlyPnL
// ============================================================

describe('calcMonthlyPnL', () => {
  // TS-04: 매수 후 매도 손익 계산
  it('TS-04: should calculate realized PnL for sell month', () => {
    const txs: Transaction[] = [
      makeTx({ type: 'BUY', date: '2025-01-10', quantity: 10, price: 100, amount: 1000 }),
      makeTx({ type: 'SELL', date: '2025-02-10', quantity: 5, price: 120, amount: 600 }),
    ];
    const result: MonthlyPnL[] = calcMonthlyPnL(txs);
    // 손익 = (120 - 100) * 5 = 100
    const feb = result.find((r) => r.month === '2025-02');
    expect(feb).toBeDefined();
    expect(feb?.pnl).toBe(100);
    expect(feb?.dividend).toBe(0);
  });

  // TS-05: 배당만 있는 월
  it('TS-05: should handle dividend-only month', () => {
    const txs: Transaction[] = [
      makeTx({ type: 'DIVIDEND', date: '2025-01-20', amount: 30 }),
    ];
    const result: MonthlyPnL[] = calcMonthlyPnL(txs);
    expect(result).toEqual(
      expect.arrayContaining([{ month: '2025-01', pnl: 0, dividend: 30 }])
    );
  });

  // TS-06: 빈 배열 → []
  it('TS-06: should return empty array for empty input', () => {
    expect(calcMonthlyPnL([])).toEqual([]);
  });
});

// ============================================================
// calcUnrealizedPnL
// ============================================================

describe('calcUnrealizedPnL', () => {
  // TS-07: 정상 케이스
  it('TS-07: should calculate unrealized PnL', () => {
    const txs: Transaction[] = [
      makeTx({ stock_id: 's1', type: 'BUY', quantity: 10, price: 100, amount: 1000 }),
    ];
    const stocks: Stock[] = [makeStock({ id: 's1', ticker: 'AAPL' })];
    const priceMap: PriceMap = {
      AAPL: { price: 120, currency: 'USD', changePercent: 1.5, name: 'Apple Inc.' },
    };
    const result: UnrealizedPnL[] = calcUnrealizedPnL(txs, stocks, priceMap);
    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe('AAPL');
    expect(result[0].avgBuyPrice).toBe(100);
    expect(result[0].currentPrice).toBe(120);
    expect(result[0].quantity).toBe(10);
    expect(result[0].unrealizedPnL).toBe(200); // (120-100)*10
    expect(result[0].returnRate).toBeCloseTo(20.0, 2); // (120-100)/100*100
  });

  // TS-08: priceMap에 null 값인 ticker → 결과 배열에서 제외
  it('TS-08: should exclude stocks with null price in priceMap', () => {
    const txs: Transaction[] = [
      makeTx({ stock_id: 's1', type: 'BUY', quantity: 10, price: 100, amount: 1000 }),
    ];
    const stocks: Stock[] = [makeStock({ id: 's1', ticker: 'AAPL' })];
    const priceMap: PriceMap = { AAPL: null };
    const result: UnrealizedPnL[] = calcUnrealizedPnL(txs, stocks, priceMap);
    expect(result).toHaveLength(0);
  });

  // TS-09: 잔여수량 0인 종목 (전량 매도) → 결과에서 제외
  it('TS-09: should exclude stocks with zero remaining quantity', () => {
    const txs: Transaction[] = [
      makeTx({ stock_id: 's1', type: 'BUY', quantity: 10, price: 100, amount: 1000 }),
      makeTx({ stock_id: 's1', type: 'SELL', quantity: 10, price: 120, amount: 1200 }),
    ];
    const stocks: Stock[] = [makeStock({ id: 's1', ticker: 'AAPL' })];
    const priceMap: PriceMap = {
      AAPL: { price: 120, currency: 'USD', changePercent: 1.5, name: 'Apple Inc.' },
    };
    const result: UnrealizedPnL[] = calcUnrealizedPnL(txs, stocks, priceMap);
    expect(result).toHaveLength(0);
  });
});

// ============================================================
// calcStockCumulativeReturn
// ============================================================

describe('calcStockCumulativeReturn', () => {
  // TS-10: 정상 케이스
  it('TS-10: should calculate cumulative return rate from avgBuyPrice', () => {
    const historicalPrices: StockHistoryPoint[] = [
      { month: '2025-01', closePrice: 110 },
      { month: '2025-02', closePrice: 90 },
      { month: '2025-03', closePrice: 120 },
    ];
    const result = calcStockCumulativeReturn(historicalPrices, 100);
    expect(result).toEqual([
      { month: '2025-01', returnRate: 10 },
      { month: '2025-02', returnRate: -10 },
      { month: '2025-03', returnRate: 20 },
    ]);
  });

  // TS-11: avgBuyPrice=0 → 모든 returnRate:0
  it('TS-11: should return 0 returnRate when avgBuyPrice is 0', () => {
    const historicalPrices: StockHistoryPoint[] = [
      { month: '2025-01', closePrice: 110 },
      { month: '2025-02', closePrice: 90 },
    ];
    const result = calcStockCumulativeReturn(historicalPrices, 0);
    expect(result).toEqual([
      { month: '2025-01', returnRate: 0 },
      { month: '2025-02', returnRate: 0 },
    ]);
  });

  // TS-12: 빈 historicalPrices → []
  it('TS-12: should return empty array for empty historicalPrices', () => {
    expect(calcStockCumulativeReturn([], 100)).toEqual([]);
  });
});
