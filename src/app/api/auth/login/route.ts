import { comparePassword, signJwt } from '@/lib/auth';
import { NextResponse } from 'next/server';

if (!process.env.AUTH_PASSWORD_HASH) {
  throw new Error('AUTH_PASSWORD_HASH is not set');
}
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set');
}

const AUTH_PASSWORD_HASH = process.env.AUTH_PASSWORD_HASH;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'password 필드가 필요합니다' },
        { status: 400 }
      );
    }

    if (
      typeof body !== 'object' ||
      body === null ||
      !('password' in body) ||
      typeof (body as Record<string, unknown>).password !== 'string' ||
      (body as Record<string, string>).password === ''
    ) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'password 필드가 필요합니다' },
        { status: 400 }
      );
    }

    const { password } = body as { password: string };

    const isValid = await comparePassword(password, AUTH_PASSWORD_HASH);

    if (!isValid) {
      return NextResponse.json(
        { error: 'INVALID_PASSWORD', message: '비밀번호가 올바르지 않습니다' },
        { status: 401 }
      );
    }

    const token = await signJwt({ sub: 'owner' }, '7d');

    const response = NextResponse.json({ ok: true }, { status: 200 });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 604800,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
