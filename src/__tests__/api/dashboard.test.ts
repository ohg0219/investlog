/**
 * TDD Test — app/api/dashboard/summary/route.ts, app/api/dashboard/chart-data/route.ts
 * Design Section 9.2 기반: TS-13 ~ TS-16
 *
 * Pre-Wave Red: route 파일이 없으므로 import 에러(Red) 상태가 정상.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// next/headers mock
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// server-only mock (lib/transactions가 server-only import 사용)
vi.mock('server-only', () => ({}));

// @/lib/auth mock
vi.mock('@/lib/auth', () => ({
  verifyJwt: vi.fn(),
}));

// @/lib/transactions mock
vi.mock('@/lib/transactions', () => ({
  getTransactions: vi.fn(),
}));

// @/lib/supabase mock (summary route가 stocks 조회)
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    in: vi.fn(),
  },
}));

import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import { getTransactions } from '@/lib/transactions';
import { supabaseAdmin } from '@/lib/supabase';

// 샘플 트랜잭션
const sampleTransactions = [
  {
    id: 'tx-1',
    stock_id: 'stock-1',
    type: 'BUY' as const,
    date: '2025-01-15',
    quantity: 10,
    price: 100,
    amount: 1000,
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
    stock: { ticker: 'AAPL', name: 'Apple Inc.', currency: 'USD' },
  },
];

// 샘플 주식 데이터
const sampleStocks = [
  {
    id: 'stock-1',
    ticker: 'AAPL',
    name: 'Apple Inc.',
    market: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret-key-minimum-32-chars-long!!';
});

// ============================================================
// GET /api/dashboard/summary
// ============================================================

describe('GET /api/dashboard/summary', () => {
  // TS-13: 정상 인증 → 200
  it('TS-13: should return 200 with kpi and portfolio when authenticated', async () => {
    const mockCookieStore = { get: vi.fn().mockReturnValue({ value: 'valid-token' }) };
    vi.mocked(cookies).mockReturnValue(mockCookieStore as any);
    vi.mocked(verifyJwt).mockResolvedValue({ sub: 'owner', iat: 0, exp: 9999999999 });
    vi.mocked(getTransactions).mockResolvedValue(sampleTransactions as any);
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: sampleStocks, error: null }),
      }),
    } as any);

    const { GET } = await import('@/app/api/dashboard/summary/route');
    const request = new Request('http://localhost/api/dashboard/summary');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('kpi');
    expect(body.kpi).toHaveProperty('totalInvested');
    expect(body.kpi).toHaveProperty('realizedPnL');
    expect(body.kpi).toHaveProperty('dividendIncome');
    expect(body.kpi).toHaveProperty('totalReturn');
    expect(body).toHaveProperty('portfolio');
    expect(Array.isArray(body.portfolio)).toBe(true);
  });

  // TS-14: 인증 없음 → 401
  it('TS-14: should return 401 when not authenticated', async () => {
    const mockCookieStore = { get: vi.fn().mockReturnValue(undefined) };
    vi.mocked(cookies).mockReturnValue(mockCookieStore as any);

    const { GET } = await import('@/app/api/dashboard/summary/route');
    const request = new Request('http://localhost/api/dashboard/summary');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('UNAUTHORIZED');
  });
});

// ============================================================
// GET /api/dashboard/chart-data
// ============================================================

describe('GET /api/dashboard/chart-data', () => {
  // TS-15: 정상 인증 → 200
  it('TS-15: should return 200 with chart data when authenticated', async () => {
    const mockCookieStore = { get: vi.fn().mockReturnValue({ value: 'valid-token' }) };
    vi.mocked(cookies).mockReturnValue(mockCookieStore as any);
    vi.mocked(verifyJwt).mockResolvedValue({ sub: 'owner', iat: 0, exp: 9999999999 });
    vi.mocked(getTransactions).mockResolvedValue(sampleTransactions as any);

    const { GET } = await import('@/app/api/dashboard/chart-data/route');
    const request = new Request('http://localhost/api/dashboard/chart-data');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('dailyBalance');
    expect(body.data).toHaveProperty('monthlyBreakdown');
    expect(body.data).toHaveProperty('monthlyPnL');
  });

  // TS-16: 인증 없음 → 401
  it('TS-16: should return 401 when not authenticated', async () => {
    const mockCookieStore = { get: vi.fn().mockReturnValue(undefined) };
    vi.mocked(cookies).mockReturnValue(mockCookieStore as any);

    const { GET } = await import('@/app/api/dashboard/chart-data/route');
    const request = new Request('http://localhost/api/dashboard/chart-data');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('UNAUTHORIZED');
  });
});
