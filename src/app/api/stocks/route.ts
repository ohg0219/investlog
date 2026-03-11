import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyJwt, comparePassword } from '@/lib/auth';
import { getStocks, createStock } from '@/lib/stocks';
import { WriteRequest, StockInput } from '@/types';

if (!process.env.AUTH_PASSWORD_HASH) {
  throw new Error('AUTH_PASSWORD_HASH is not set');
}
const AUTH_PASSWORD_HASH = process.env.AUTH_PASSWORD_HASH;

export async function GET(): Promise<NextResponse> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const payload = await verifyJwt(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const stocks = await getStocks();
    return NextResponse.json({ data: stocks }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // JWT 검증
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '인증이 필요합니다' },
        { status: 401 }
      );
    }
    const payload = await verifyJwt(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 요청 바디 파싱
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: '요청 바디를 파싱할 수 없습니다' },
        { status: 400 }
      );
    }

    if (
      typeof body !== 'object' ||
      body === null ||
      !('password' in body) ||
      typeof (body as Record<string, unknown>).password !== 'string' ||
      (body as Record<string, unknown>).password === '' ||
      !('data' in body) ||
      typeof (body as Record<string, unknown>).data !== 'object' ||
      (body as Record<string, unknown>).data === null
    ) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: '필수 필드가 누락되었습니다' },
        { status: 400 }
      );
    }

    const { password, data } = body as WriteRequest<Record<string, unknown>>;

    // 필수 필드 검증
    const required = ['ticker', 'name', 'market', 'country', 'currency'] as const;
    for (const field of required) {
      if (typeof data[field] !== 'string' || data[field] === '') {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: `${field} 필드가 필요합니다` },
          { status: 400 }
        );
      }
    }

    // bcrypt 비밀번호 검증
    const isValid = await comparePassword(password, AUTH_PASSWORD_HASH);
    if (!isValid) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '비밀번호가 올바르지 않습니다' },
        { status: 403 }
      );
    }

    const stockInput: StockInput = {
      ticker: data.ticker as string,
      name: data.name as string,
      market: data.market as string,
      country: data.country as string,
      currency: data.currency as string,
      sector: typeof data.sector === 'string' ? data.sector : undefined,
      memo: typeof data.memo === 'string' ? data.memo : undefined,
    };

    const created = await createStock(stockInput);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    // ticker UNIQUE 위반 감지
    if (
      err instanceof Error &&
      err.message.toLowerCase().includes('duplicate')
    ) {
      return NextResponse.json(
        { error: 'DUPLICATE_TICKER', message: '이미 등록된 티커입니다' },
        { status: 409 }
      );
    }
    // Supabase PostgrestError에는 code 필드가 있음
    const pgErr = err as { code?: string; message?: string };
    if (pgErr.code === '23505') {
      return NextResponse.json(
        { error: 'DUPLICATE_TICKER', message: '이미 등록된 티커입니다' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
