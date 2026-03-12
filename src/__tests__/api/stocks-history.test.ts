/**
 * TDD Test — app/api/stocks/[id]/history/route.ts
 * Design Section 9.2 기반: TS-17 ~ TS-19
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// next/headers mock
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// server-only mock
vi.mock('server-only', () => ({}));

// @/lib/auth mock
vi.mock('@/lib/auth', () => ({
  verifyJwt: vi.fn(),
}));

// @/lib/yahoo mock
vi.mock('@/lib/yahoo', () => ({
  getHistorical: vi.fn(),
}));

import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import { getHistorical } from '@/lib/yahoo';

// 샘플 히스토리컬 데이터
const sampleHistoricalData = [
  {
    date: '2024-01-31',
    open: 168.0,
    high: 172.0,
    low: 167.5,
    close: 170.5,
    volume: 50000000,
  },
  {
    date: '2024-02-29',
    open: 170.0,
    high: 175.0,
    low: 169.0,
    close: 173.0,
    volume: 45000000,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret-key-minimum-32-chars-long!!';
});

// ============================================================
// GET /api/stocks/[id]/history
// ============================================================

describe('GET /api/stocks/[id]/history', () => {
  // TS-17: 정상 인증 + 유효한 period → 200
  it('TS-17: should return 200 with historical data when authenticated and period is valid', async () => {
    const mockCookieStore = { get: vi.fn().mockReturnValue({ value: 'valid-token' }) };
    vi.mocked(cookies).mockReturnValue(mockCookieStore as any);
    vi.mocked(verifyJwt).mockResolvedValue({ sub: 'owner', iat: 0, exp: 9999999999 });
    vi.mocked(getHistorical).mockResolvedValue(sampleHistoricalData);

    const { GET } = await import('@/app/api/stocks/[id]/history/route');
    const request = new Request('http://localhost/api/stocks/AAPL/history?period=1Y');
    const response = await GET(request, { params: Promise.resolve({ id: 'AAPL' }) });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('ticker', 'AAPL');
    expect(body.data).toHaveProperty('period', '1Y');
    expect(body.data).toHaveProperty('history');
    expect(Array.isArray(body.data.history)).toBe(true);
  });

  // TS-18: 유효하지 않은 period → 400 INVALID_PERIOD
  it('TS-18: should return 400 INVALID_PERIOD for invalid period query param', async () => {
    const mockCookieStore = { get: vi.fn().mockReturnValue({ value: 'valid-token' }) };
    vi.mocked(cookies).mockReturnValue(mockCookieStore as any);
    vi.mocked(verifyJwt).mockResolvedValue({ sub: 'owner', iat: 0, exp: 9999999999 });

    const { GET } = await import('@/app/api/stocks/[id]/history/route');
    const request = new Request('http://localhost/api/stocks/AAPL/history?period=INVALID');
    const response = await GET(request, { params: Promise.resolve({ id: 'AAPL' }) });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('INVALID_PERIOD');
  });

  // TS-19: 인증 없음 → 401
  it('TS-19: should return 401 when not authenticated', async () => {
    const mockCookieStore = { get: vi.fn().mockReturnValue(undefined) };
    vi.mocked(cookies).mockReturnValue(mockCookieStore as any);

    const { GET } = await import('@/app/api/stocks/[id]/history/route');
    const request = new Request('http://localhost/api/stocks/AAPL/history?period=1Y');
    const response = await GET(request, { params: Promise.resolve({ id: 'AAPL' }) });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('UNAUTHORIZED');
  });
});
