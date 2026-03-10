/**
 * TDD Test — lib/calculations.ts
 * Design Section 9 기반: TS-05 ~ TS-10, EC-01, EC-02
 *
 * Pre-Wave: 구현 파일이 없으므로 import 에러(Red) 상태가 정상.
 */

import { describe, it, expect } from 'vitest';
import {
  calcTotalInvested,
  calcRealizedPnL,
  calcDividendIncome,
  calcTotalReturn,
  calcWeightByStock,
  calcDailyBalance,
} from '@/lib/calculations';
import type { Transaction } from '@/types';

// 테스트용 Transaction 생성 헬퍼
const makeTx = (overrides: Partial<Transaction>): Transaction => ({
  id: 'test-id',
  stock_id: 'stock-a',
  type: 'BUY',
  date: '2024-01-01',
  quantity: 100,
  price: 10000,
  amount: 1000000,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('calcTotalInvested', () => {
  // TS-05: BUY 거래 총합
  it('should sum all BUY amounts', () => {
    const txs: Transaction[] = [
      makeTx({ type: 'BUY', amount: 1000000 }),
      makeTx({ type: 'BUY', amount: 600000 }),
      makeTx({ type: 'SELL', amount: 500000 }),  // SELL 제외
      makeTx({ type: 'DIVIDEND', amount: 50000 }), // DIVIDEND 제외
    ];
    expect(calcTotalInvested(txs)).toBe(1600000);
  });

  it('should return 0 for empty array', () => {
    expect(calcTotalInvested([])).toBe(0);
  });
});

describe('calcRealizedPnL', () => {
  // TS-06: 평균법 실현손익 계산
  // BUY 100주@10,000 + BUY 50주@12,000 → 평균단가 10,667원
  // SELL 80주@13,000 → 원가 80×10,667 = 853,333원 → 손익 1,040,000 - 853,333 = 186,667원
  it('should calculate realized PnL using average cost method', () => {
    const txs: Transaction[] = [
      makeTx({ type: 'BUY', date: '2024-01-01', quantity: 100, price: 10000, amount: 1000000 }),
      makeTx({ type: 'BUY', date: '2024-01-15', quantity: 50, price: 12000, amount: 600000 }),
      makeTx({ type: 'SELL', date: '2024-02-01', quantity: 80, price: 13000, amount: 1040000 }),
    ];
    const pnl = calcRealizedPnL(txs);
    // 186,667 ±1 (반올림 오차 허용)
    expect(Math.round(pnl)).toBeCloseTo(186667, -1);
  });

  it('should return 0 for empty array', () => {
    expect(calcRealizedPnL([])).toBe(0);
  });

  // EC-01: BUY 없이 SELL 존재 시 원가 0 처리
  it('should treat cost as 0 when no BUY exists before SELL', () => {
    const txs: Transaction[] = [
      makeTx({ type: 'SELL', quantity: 10, price: 5000, amount: 50000 }),
    ];
    expect(calcRealizedPnL(txs)).toBe(50000);
  });
});

describe('calcDividendIncome', () => {
  // TS-07: 배당 수익 합산
  it('should sum all DIVIDEND amounts', () => {
    const txs: Transaction[] = [
      makeTx({ type: 'DIVIDEND', amount: 50000 }),
      makeTx({ type: 'DIVIDEND', amount: 30000 }),
      makeTx({ type: 'BUY', amount: 1000000 }), // BUY 제외
    ];
    expect(calcDividendIncome(txs)).toBe(80000);
  });

  it('should return 0 for empty array', () => {
    expect(calcDividendIncome([])).toBe(0);
  });
});

describe('calcTotalReturn', () => {
  // TS-08: 수익률 계산 (정상)
  // 투자금 1,000,000 / 손익 100,000 + 배당 50,000 → 15.00%
  it('should calculate total return percentage', () => {
    const txs: Transaction[] = [
      makeTx({ type: 'BUY', amount: 1000000 }),
      makeTx({ type: 'SELL', date: '2024-06-01', quantity: 50, price: 12000, amount: 600000 }),
      // BUY 50주@10,000=500,000 → SELL 50주@12,000=600,000 → 손익 100,000
      makeTx({ type: 'DIVIDEND', amount: 50000 }),
    ];
    const result = calcTotalReturn(txs);
    expect(result).toBeGreaterThan(0);
  });

  // TS-09: 수익률 계산 (투자금 0)
  it('should return 0 when total invested is 0', () => {
    expect(calcTotalReturn([])).toBe(0);
  });
});

describe('calcWeightByStock', () => {
  it('should calculate weight percentage per stock_id', () => {
    const txs: Transaction[] = [
      makeTx({ stock_id: 'stock-a', type: 'BUY', amount: 600000 }),
      makeTx({ stock_id: 'stock-b', type: 'BUY', amount: 400000 }),
    ];
    const weights = calcWeightByStock(txs);
    expect(weights['stock-a']).toBeCloseTo(60, 1);
    expect(weights['stock-b']).toBeCloseTo(40, 1);
  });

  // EC-02: 전체 보유금액 0 시 빈 객체
  it('should return empty object when total is 0', () => {
    expect(calcWeightByStock([])).toEqual({});
  });
});

describe('calcDailyBalance', () => {
  // TS-10: 일별 잔고 계산
  it('should calculate daily balance (BUY - SELL cumulative)', () => {
    const txs: Transaction[] = [
      makeTx({ type: 'BUY', date: '2024-01-01', amount: 1000000 }),
      makeTx({ type: 'BUY', date: '2024-01-15', amount: 500000 }),
      makeTx({ type: 'SELL', date: '2024-02-01', amount: 300000 }),
      makeTx({ type: 'DIVIDEND', date: '2024-02-15', amount: 20000 }), // 제외
    ];
    const result = calcDailyBalance(txs);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].date).toBe('2024-01-01');
    // 최종 잔고: 1,000,000 + 500,000 - 300,000 = 1,200,000
    const last = result[result.length - 1];
    expect(last.balance).toBe(1200000);
  });

  it('should return empty array for empty input', () => {
    expect(calcDailyBalance([])).toEqual([]);
  });
});
