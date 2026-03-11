import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { getTransactions } from '@/lib/transactions';
import {
  calcDailyBalance,
  calcMonthlyBreakdown,
  calcMonthlyPnL,
} from '@/lib/calculations';

export async function GET(_request: Request): Promise<NextResponse> {
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

    const transactions = await getTransactions();

    const dailyBalance = calcDailyBalance(transactions);
    const monthlyBreakdown = calcMonthlyBreakdown(transactions);
    const monthlyPnL = calcMonthlyPnL(transactions);

    return NextResponse.json(
      { data: { dailyBalance, monthlyBreakdown, monthlyPnL } },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
