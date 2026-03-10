import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { JwtPayload } from '@/types';

if (!process.env.JWT_SECRET) {
  throw new Error('Missing environment variable: JWT_SECRET');
}

const JWT_SECRET = process.env.JWT_SECRET;

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

export async function signJwt(
  payload: { sub: string },
  expiresIn: string
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecretKey());
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function comparePassword(
  plain: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
