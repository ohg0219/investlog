export const revalidate = 3600;

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { getHistorical } from '@/lib/yahoo';
import { StockHistoryPoint } from '@/types';

const VALID_PERIODS = ['6M', '1Y', 'ALL'] as const;
type Period = (typeof VALID_PERIODS)[number];

function getDateRange(period: string): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);

  if (period === '6M') {
    const from = new Date(now);
    from.setMonth(from.getMonth() - 6);
    return { from: from.toISOString().slice(0, 10), to };
  }
  if (period === '1Y') {
    const from = new Date(now);
    from.setFullYear(from.getFullYear() - 1);
    return { from: from.toISOString().slice(0, 10), to };
  }
  // 'ALL'
  const from = new Date(now);
  from.setFullYear(from.getFullYear() - 5);
  return { from: from.toISOString().slice(0, 10), to };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
): Promise<NextResponse> {
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

    const { ticker } = await params;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') ?? '1Y';

    if (!VALID_PERIODS.includes(period as Period)) {
      return NextResponse.json({ error: 'INVALID_PERIOD' }, { status: 400 });
    }

    const { from, to } = getDateRange(period);
    const historicalData = await getHistorical(ticker, from, to, '1mo');

    if (historicalData.length === 0) {
      return NextResponse.json({ error: 'TICKER_NOT_FOUND' }, { status: 404 });
    }

    const history: StockHistoryPoint[] = historicalData.map((item) => ({
      month: item.date.slice(0, 7),
      closePrice: item.close,
    }));

    return NextResponse.json(
      { data: { ticker, period, history } },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
