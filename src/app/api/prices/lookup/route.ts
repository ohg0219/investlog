import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { lookupTickers } from '@/lib/yahoo';

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

    // q 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.trim() === '') {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'q 파라미터가 필요합니다' },
        { status: 400 }
      );
    }

    let results;
    try {
      results = await lookupTickers(q.trim());
    } catch (err) {
      console.error('[prices/lookup] yahoo search error', err instanceof Error ? err.message : String(err));
      return NextResponse.json(
        {
          error: 'UPSTREAM_ERROR',
          message: '종목 검색에 실패했습니다. 티커를 직접 입력해 주세요',
        },
        { status: 502 }
      );
    }

    return NextResponse.json(results, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
