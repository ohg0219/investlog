/**
 * Mock 데이터 픽스처 — transactions
 * BUY / SELL / DIVIDEND 각 1건, stocks 2건
 */

import type { TransactionWithStock, Stock } from '@/types';

export const mockBuyTransaction: TransactionWithStock = {
  id: 'tx-id-1',
  stock_id: 'stock-id-1',
  type: 'BUY',
  date: '2026-03-10',
  quantity: 10,
  price: 78500,
  amount: 785000,
  memo: '분할 매수',
  created_at: '2026-03-10T10:00:00.000+09:00',
  updated_at: '2026-03-10T10:00:00.000+09:00',
  stock: { ticker: '005930.KS', name: '삼성전자', currency: 'KRW' },
};

export const mockSellTransaction: TransactionWithStock = {
  id: 'tx-id-2',
  stock_id: 'stock-id-2',
  type: 'SELL',
  date: '2026-03-09',
  quantity: 5,
  price: 182.4,
  amount: 912,
  memo: undefined,
  created_at: '2026-03-09T10:00:00.000+09:00',
  updated_at: '2026-03-09T10:00:00.000+09:00',
  stock: { ticker: 'AAPL', name: 'Apple Inc.', currency: 'USD' },
};

export const mockDividendTransaction: TransactionWithStock = {
  id: 'tx-id-3',
  stock_id: 'stock-id-2',
  type: 'DIVIDEND',
  date: '2026-03-05',
  quantity: undefined,
  price: undefined,
  amount: 150.0,
  memo: undefined,
  created_at: '2026-03-05T10:00:00.000+09:00',
  updated_at: '2026-03-05T10:00:00.000+09:00',
  stock: { ticker: 'AAPL', name: 'Apple Inc.', currency: 'USD' },
};

export const mockTransactionsWithStock: TransactionWithStock[] = [
  mockBuyTransaction,
  mockSellTransaction,
  mockDividendTransaction,
];

export const mockStocksForDropdown: Stock[] = [
  {
    id: 'stock-id-1',
    ticker: '005930.KS',
    name: '삼성전자',
    market: 'KRX',
    country: 'KR',
    currency: 'KRW',
    sector: '반도체',
    memo: undefined,
    created_at: '2026-03-11T10:00:00.000+09:00',
    updated_at: '2026-03-11T10:00:00.000+09:00',
  },
  {
    id: 'stock-id-2',
    ticker: 'AAPL',
    name: 'Apple Inc.',
    market: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    sector: 'Technology',
    memo: undefined,
    created_at: '2026-03-11T10:01:00.000+09:00',
    updated_at: '2026-03-11T10:01:00.000+09:00',
  },
];
