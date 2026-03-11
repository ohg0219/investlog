/**
 * MSW 핸들러 — transactions API mock
 * msw v2 패턴: http, HttpResponse
 */

import { http, HttpResponse } from 'msw';
import type { TransactionWithStock } from '@/types';

// ── Mock 데이터 ────────────────────────────────────────────────

export const mockTransactions: TransactionWithStock[] = [
  {
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
  },
  {
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
  },
  {
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
  },
];

// ── 핸들러 ────────────────────────────────────────────────────

export const transactionHandlers = [
  // GET /api/transactions → 전체 또는 stock_id 필터
  http.get('/api/transactions', ({ request }) => {
    const url = new URL(request.url);
    const stockId = url.searchParams.get('stock_id');
    const data = stockId
      ? mockTransactions.filter((t) => t.stock_id === stockId)
      : mockTransactions;
    return HttpResponse.json({ data });
  }),

  // POST /api/transactions → 201 성공
  http.post('/api/transactions', async ({ request }) => {
    const body = await request.json() as { password: string; data: Record<string, unknown> };
    if (body.password === 'wrong') {
      return HttpResponse.json({ error: 'FORBIDDEN', message: '비밀번호가 올바르지 않습니다' }, { status: 403 });
    }
    return HttpResponse.json(
      {
        data: {
          id: 'new-tx-id',
          ...body.data,
          created_at: '2026-03-11T10:05:00.000+09:00',
          updated_at: '2026-03-11T10:05:00.000+09:00',
          stock: { ticker: '005930.KS', name: '삼성전자', currency: 'KRW' },
        },
      },
      { status: 201 }
    );
  }),

  // PUT /api/transactions/:id → 200 성공
  http.put('/api/transactions/:id', async ({ request, params }) => {
    const body = await request.json() as { password: string; data: Record<string, unknown> };
    if (body.password === 'wrong') {
      return HttpResponse.json({ error: 'FORBIDDEN', message: '비밀번호가 올바르지 않습니다' }, { status: 403 });
    }
    const existing = mockTransactions.find((t) => t.id === params.id);
    if (!existing) {
      return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return HttpResponse.json({
      data: { ...existing, ...body.data, updated_at: '2026-03-11T10:10:00.000+09:00' },
    });
  }),

  // DELETE /api/transactions/:id → 204 성공
  http.delete('/api/transactions/:id', async ({ request, params }) => {
    const body = await request.json() as { password: string };
    if (body.password === 'wrong') {
      return HttpResponse.json({ error: 'FORBIDDEN', message: '비밀번호가 올바르지 않습니다' }, { status: 403 });
    }
    const exists = mockTransactions.some((t) => t.id === params.id);
    if (!exists) {
      return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /api/prices → single ticker price (주식 선택 시 현재가)
  http.get('/api/prices', ({ request }) => {
    const url = new URL(request.url);
    const ticker = url.searchParams.get('ticker');
    if (ticker === '005930.KS') {
      return HttpResponse.json({ price: 78500, currency: 'KRW', changePercent: 0.4, name: '삼성전자' });
    }
    if (ticker === 'AAPL') {
      return HttpResponse.json({ price: 182.4, currency: 'USD', changePercent: 1.2, name: 'Apple Inc.' });
    }
    return HttpResponse.json(null);
  }),
];
