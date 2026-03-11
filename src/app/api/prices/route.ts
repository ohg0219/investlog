import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { getQuotes } from '@/lib/yahoo';

export async function GET(request: Request): Promise<NextResponse> {
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

    // tickers 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const tickersParam = searchParams.get('tickers');

    if (!tickersParam || tickersParam.trim() === '') {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'tickers 파라미터가 필요합니다' },
        { status: 400 }
      );
    }

    const tickers = tickersParam.split(',').map((t) => t.trim()).filter(Boolean);

    if (tickers.length === 0) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'tickers 파라미터가 필요합니다' },
        { status: 400 }
      );
    }

    const priceMap = await getQuotes(tickers);
    return NextResponse.json(priceMap, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
