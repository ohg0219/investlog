import { Transaction, DailyBalance, WeightByStock } from '@/types';

export function calcTotalInvested(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === 'BUY')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calcRealizedPnL(transactions: Transaction[]): number {
  // 종목별로 평균단가 계산 (Average Cost Method)
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // stock_id → { totalQuantity, totalCost }
  const costBasis = new Map<string, { totalQuantity: number; totalCost: number }>();
  let realizedPnL = 0;

  for (const t of sorted) {
    if (t.type === 'BUY') {
      const qty = t.quantity ?? 0;
      const current = costBasis.get(t.stock_id) ?? { totalQuantity: 0, totalCost: 0 };
      costBasis.set(t.stock_id, {
        totalQuantity: current.totalQuantity + qty,
        totalCost: current.totalCost + t.amount,
      });
    } else if (t.type === 'SELL') {
      const qty = t.quantity ?? 0;
      const current = costBasis.get(t.stock_id) ?? { totalQuantity: 0, totalCost: 0 };
      const avgCost =
        current.totalQuantity > 0
          ? current.totalCost / current.totalQuantity
          : 0;
      realizedPnL += t.amount - qty * avgCost;

      // 보유 수량/원가 차감
      const remainQty = Math.max(0, current.totalQuantity - qty);
      costBasis.set(t.stock_id, {
        totalQuantity: remainQty,
        totalCost: remainQty * avgCost,
      });
    }
  }

  return realizedPnL;
}

export function calcDividendIncome(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === 'DIVIDEND')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calcTotalReturn(transactions: Transaction[]): number {
  const totalInvested = calcTotalInvested(transactions);
  if (totalInvested === 0) return 0;
  return (
    (calcRealizedPnL(transactions) + calcDividendIncome(transactions)) /
    totalInvested *
    100
  );
}

export function calcWeightByStock(transactions: Transaction[]): WeightByStock {
  // 종목별 보유금액 = SUM(BUY.amount) - SUM(SELL.amount)
  const holdings = new Map<string, number>();

  for (const t of transactions) {
    if (t.type === 'BUY') {
      holdings.set(t.stock_id, (holdings.get(t.stock_id) ?? 0) + t.amount);
    } else if (t.type === 'SELL') {
      holdings.set(t.stock_id, (holdings.get(t.stock_id) ?? 0) - t.amount);
    }
  }

  // 음수 → 0 처리
  Array.from(holdings.entries()).forEach(([stockId, value]) => {
    holdings.set(stockId, Math.max(0, value));
  });

  const total = Array.from(holdings.values()).reduce((sum, v) => sum + v, 0);
  if (total === 0) return {};

  const result: WeightByStock = {};
  Array.from(holdings.entries()).forEach(([stockId, value]) => {
    if (value > 0) {
      result[stockId] = (value / total) * 100;
    }
  });
  return result;
}

export function calcDailyBalance(transactions: Transaction[]): DailyBalance[] {
  // DIVIDEND 제외, 날짜 오름차순 정렬
  const sorted = transactions
    .filter((t) => t.type !== 'DIVIDEND')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 날짜별 순 금액 집계
  const dailyMap = new Map<string, number>();
  for (const t of sorted) {
    const delta = t.type === 'BUY' ? t.amount : -t.amount;
    dailyMap.set(t.date, (dailyMap.get(t.date) ?? 0) + delta);
  }

  // 누적 잔고 계산
  const dates = Array.from(dailyMap.keys()).sort();
  let cumulative = 0;
  const result: DailyBalance[] = [];

  for (const date of dates) {
    cumulative += dailyMap.get(date) ?? 0;
    result.push({ date, balance: cumulative });
  }

  return result;
}
