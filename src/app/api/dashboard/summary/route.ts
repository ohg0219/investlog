import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { getTransactions } from '@/lib/transactions';
import {
  calcTotalInvested,
  calcRealizedPnL,
  calcDividendIncome,
  calcWeightByStock,
} from '@/lib/calculations';
import { supabaseAdmin } from '@/lib/supabase';
import { DashboardSummary, PortfolioItem } from '@/types';

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

    const transactionWithStocks = await getTransactions();
    // TransactionWithStock[] → Transaction[] (상위 호환)
    const transactions = transactionWithStocks;

    const totalInvested = calcTotalInvested(transactions);
    const realizedPnL = calcRealizedPnL(transactions);
    const dividendIncome = calcDividendIncome(transactions);
    const totalReturn = realizedPnL + dividendIncome;

    const weightByStock = calcWeightByStock(transactions);
    const stockIds = Object.keys(weightByStock).filter((id) => weightByStock[id] > 0);

    let stockRows: { id: string; ticker: string; name: string }[] = [];
    if (stockIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('stocks')
        .select('id, ticker, name')
        .in('id', stockIds);
      stockRows = (data ?? []) as { id: string; ticker: string; name: string }[];
    }

    const stockMap = new Map(stockRows.map((s) => [s.id, s]));

    const portfolio: PortfolioItem[] = stockIds
      .map((stock_id) => {
        const stock = stockMap.get(stock_id);
        if (!stock) return null;
        const weight = Math.round(weightByStock[stock_id] * 100) / 100;
        const amount = totalInvested * (weightByStock[stock_id] / 100);
        return {
          stock_id,
          ticker: stock.ticker,
          name: stock.name,
          weight,
          amount,
        };
      })
      .filter((item): item is PortfolioItem => item !== null)
      .sort((a, b) => b.weight - a.weight);

    const summary: DashboardSummary = {
      kpi: {
        totalInvested,
        realizedPnL,
        dividendIncome,
        totalReturn,
      },
      portfolio,
    };

    return NextResponse.json(summary, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
