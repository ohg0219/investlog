/**
 * MSW 핸들러 — stocks & prices API mock
 * msw v2 패턴: http, HttpResponse
 */

import { http, HttpResponse } from 'msw';
import type { Stock, PriceQuote, LookupResult } from '@/types';

// ── Mock 데이터 ────────────────────────────────────────────────

export const mockStocks: Stock[] = [
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

export const mockPriceMap: Record<string, PriceQuote | null> = {
  '005930.KS': {
    price: 78500,
    currency: 'KRW',
    changePercent: 0.4,
    name: '삼성전자',
  },
  AAPL: {
    price: 182.4,
    currency: 'USD',
    changePercent: 1.2,
    name: 'Apple Inc.',
  },
};

export const mockLookupResults: LookupResult[] = [
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NMS',
    type: 'EQUITY',
  },
  {
    ticker: 'AAPL.BA',
    name: 'Apple Inc. (BA)',
    exchange: 'BUE',
    type: 'EQUITY',
  },
];

// ── 핸들러 ────────────────────────────────────────────────────

export const stockHandlers = [
  // GET /api/stocks → 기본 mock 데이터 2개 반환
  http.get('/api/stocks', () => {
    return HttpResponse.json({ data: mockStocks });
  }),

  // POST /api/stocks → 201 성공
  http.post('/api/stocks', async ({ request }) => {
    const body = await request.json() as { password: string; data: { ticker: string; name: string } };
    return HttpResponse.json(
      {
        data: {
          id: 'new-stock-id',
          ...body.data,
          created_at: '2026-03-11T10:05:00.000+09:00',
          updated_at: '2026-03-11T10:05:00.000+09:00',
        },
      },
      { status: 201 }
    );
  }),

  // PUT /api/stocks/:id → 200 성공
  http.put('/api/stocks/:id', async ({ request, params }) => {
    const body = await request.json() as { password: string; data: Record<string, unknown> };
    return HttpResponse.json({
      data: {
        id: params.id,
        ...body.data,
        updated_at: '2026-03-11T10:10:00.000+09:00',
      },
    });
  }),

  // DELETE /api/stocks/:id → 204 성공
  http.delete('/api/stocks/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /api/prices → priceMap mock 반환
  http.get('/api/prices', () => {
    return HttpResponse.json(mockPriceMap);
  }),

  // GET /api/prices/lookup → LookupResult[] mock 반환
  http.get('/api/prices/lookup', () => {
    return HttpResponse.json(mockLookupResults);
  }),
];
