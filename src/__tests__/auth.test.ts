/**
 * TDD Test — lib/auth.ts
 * Design Section 9 기반: TS-01, TS-02, TS-03, TS-04
 *
 * Pre-Wave: 구현 파일이 없으므로 import 에러(Red) 상태가 정상.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { signJwt, verifyJwt, comparePassword } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// 테스트용 환경변수 설정
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-minimum-32-chars-long!!';
  process.env.AUTH_PASSWORD_HASH = '';
});

describe('signJwt / verifyJwt', () => {
  // TS-01: JWT 발급 후 검증 성공
  it('should sign and verify a JWT successfully', async () => {
    const token = await signJwt({ sub: 'admin' }, '7d');
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // header.payload.signature

    const payload = await verifyJwt(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe('admin');
    expect(typeof payload?.iat).toBe('number');
    expect(typeof payload?.exp).toBe('number');
  });

  // TS-02: 만료 토큰 검증 → null 반환
  it('should return null for an expired JWT', async () => {
    // 즉시 만료되는 토큰 발급 (-1s)
    const token = await signJwt({ sub: 'admin' }, '-1s');
    const payload = await verifyJwt(token);
    expect(payload).toBeNull();
  });

  it('should return null for an invalid JWT string', async () => {
    const payload = await verifyJwt('not.a.valid.token');
    expect(payload).toBeNull();
  });

  it('should return null for an empty string', async () => {
    const payload = await verifyJwt('');
    expect(payload).toBeNull();
  });
});

describe('comparePassword', () => {
  let hash: string;

  beforeAll(async () => {
    hash = await bcrypt.hash('correct-password', 10);
  });

  // TS-03: 올바른 비밀번호 → true
  it('should return true for a correct password', async () => {
    const result = await comparePassword('correct-password', hash);
    expect(result).toBe(true);
  });

  // TS-04: 틀린 비밀번호 → false
  it('should return false for an incorrect password', async () => {
    const result = await comparePassword('wrong-password', hash);
    expect(result).toBe(false);
  });

  it('should return false for an empty password', async () => {
    const result = await comparePassword('', hash);
    expect(result).toBe(false);
  });
});
