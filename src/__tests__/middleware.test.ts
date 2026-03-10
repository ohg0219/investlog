/**
 * TDD Test — middleware.ts + API Routes
 * Design Section 9: BE-01 ~ BE-07
 * Pre-Wave Red: middleware.ts, API 라우트가 없으므로 Red 상태가 정상.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { signJwt } from '@/lib/auth';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-minimum-32-chars-long!!';
  process.env.AUTH_PASSWORD_HASH = '';
});

/**
 * NOTE: Next.js App Router의 route handler와 Edge middleware는
 * Vitest 환경에서 직접 import/실행이 제한됩니다.
 * lib/auth.ts 유닛 테스트로 핵심 로직을 검증하고,
 * 통합 테스트는 E2E(Playwright) 또는 수동 테스트로 보완합니다.
 */

// BE-05/BE-06/BE-07: verifyJwt를 통한 미들웨어 핵심 로직 검증
describe('middleware 핵심 로직 (verifyJwt 기반)', () => {
  // BE-05: 유효 JWT → 검증 성공 (null 아님)
  it('BE-05: 유효한 JWT는 verifyJwt에서 payload를 반환한다', async () => {
    const { verifyJwt } = await import('@/lib/auth');
    const token = await signJwt({ sub: 'owner' }, '7d');
    const payload = await verifyJwt(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe('owner');
  });

  // BE-06: 쿠키 없음 → null 반환
  it('BE-06: 토큰이 없으면 verifyJwt는 null을 반환한다', async () => {
    const { verifyJwt } = await import('@/lib/auth');
    const payload = await verifyJwt('');
    expect(payload).toBeNull();
  });

  // BE-07: 만료 JWT → null 반환
  it('BE-07: 만료된 JWT는 verifyJwt에서 null을 반환한다', async () => {
    const { verifyJwt } = await import('@/lib/auth');
    const expired = await signJwt({ sub: 'owner' }, '-1s');
    const payload = await verifyJwt(expired);
    expect(payload).toBeNull();
  });
});

/**
 * BE-04: 로그아웃 — POST /api/auth/logout → 200 + Max-Age=0 쿠키
 * Next.js Route Handler를 직접 import하여 응답 검증
 */
describe('logout API (POST /api/auth/logout)', () => {
  it('BE-04: POST /api/auth/logout은 200 응답과 Max-Age=0 Set-Cookie를 반환한다', async () => {
    const { POST } = await import('@/app/api/auth/logout/route');
    const response = await POST();

    expect(response.status).toBe(200);

    // 응답 바디 검증
    const body = await response.json();
    expect(body).toEqual({ ok: true });

    // Set-Cookie 헤더에 Max-Age=0 포함 여부 검증
    const setCookieHeader = response.headers.get('set-cookie');
    expect(setCookieHeader).not.toBeNull();
    expect(setCookieHeader).toMatch(/Max-Age=0/i);
  });
});

/**
 * API Route 핵심 로직 검증 (comparePassword + signJwt)
 * BE-01/BE-02: login 로직
 */
describe('login API 핵심 로직 (comparePassword 기반)', () => {
  let correctHash: string;

  beforeAll(async () => {
    const bcrypt = await import('bcryptjs');
    correctHash = await bcrypt.default.hash('correct-password', 10);
    process.env.AUTH_PASSWORD_HASH = correctHash;
  });

  // BE-01: 올바른 비밀번호 → true
  it('BE-01: 올바른 비밀번호는 comparePassword에서 true를 반환한다', async () => {
    const { comparePassword } = await import('@/lib/auth');
    const result = await comparePassword('correct-password', correctHash);
    expect(result).toBe(true);
  });

  // BE-02: 잘못된 비밀번호 → false
  it('BE-02: 잘못된 비밀번호는 comparePassword에서 false를 반환한다', async () => {
    const { comparePassword } = await import('@/lib/auth');
    const result = await comparePassword('wrong-password', correctHash);
    expect(result).toBe(false);
  });

  // BE-03: 빈 password → false
  it('BE-03: 빈 비밀번호는 comparePassword에서 false를 반환한다', async () => {
    const { comparePassword } = await import('@/lib/auth');
    const result = await comparePassword('', correctHash);
    expect(result).toBe(false);
  });
});
