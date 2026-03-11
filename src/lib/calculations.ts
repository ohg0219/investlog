import { Transaction, DailyBalance, WeightByStock, Stock, PriceMap, MonthlyBreakdown, MonthlyPnL, StockHistoryPoint, UnrealizedPnL } from '@/types';

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

/**
 * FR-01: 월별 거래 유형별 금액 집계
 * - transactions를 date 필드 기준 YYYY-MM으로 그루핑
 * - 각 월의 BUY / SELL / DIVIDEND amount 합산
 * - 결과는 month 오름차순 정렬
 */
export function calcMonthlyBreakdown(transactions: Transaction[]): MonthlyBreakdown[] {
  if (transactions.length === 0) return [];

  const monthMap = new Map<string, { buy: number; sell: number; dividend: number }>();

  for (const t of transactions) {
    const month = t.date.slice(0, 7); // YYYY-MM
    const current = monthMap.get(month) ?? { buy: 0, sell: 0, dividend: 0 };

    if (t.type === 'BUY') {
      current.buy += t.amount;
    } else if (t.type === 'SELL') {
      current.sell += t.amount;
    } else if (t.type === 'DIVIDEND') {
      current.dividend += t.amount;
    }

    monthMap.set(month, current);
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { buy, sell, dividend }]) => ({ month, buy, sell, dividend }));
}

/**
 * FR-02: 월별 실현손익 + 배당 집계
 * - 전체 누계 컨텍스트에서 해당 월 매도분 평균단가법 적용
 * - 해당 월 DIVIDEND amount 합산
 * - 결과는 month 오름차순 정렬
 * - 주의: 월별로 단순 슬라이싱 후 calcRealizedPnL 재호출 방식은 평균단가 오류 야기
 */
export function calcMonthlyPnL(transactions: Transaction[]): MonthlyPnL[] {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const costBasis = new Map<string, { totalQuantity: number; totalCost: number }>();
  const monthMap = new Map<string, { pnl: number; dividend: number }>();

  for (const t of sorted) {
    const month = t.date.slice(0, 7); // YYYY-MM

    if (!monthMap.has(month)) {
      monthMap.set(month, { pnl: 0, dividend: 0 });
    }

    const monthData = monthMap.get(month)!;

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
        current.totalQuantity > 0 ? current.totalCost / current.totalQuantity : 0;

      monthData.pnl += t.amount - qty * avgCost;

      const remainQty = Math.max(0, current.totalQuantity - qty);
      costBasis.set(t.stock_id, {
        totalQuantity: remainQty,
        totalCost: remainQty * avgCost,
      });
    } else if (t.type === 'DIVIDEND') {
      monthData.dividend += t.amount;
    }
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { pnl, dividend }]) => ({ month, pnl, dividend }));
}

/**
 * FR-03: 종목별 미실현 평가손익 계산
 * - priceMap에서 ticker별 현재가 취득 (null이면 해당 종목 결과에서 제외)
 * - 잔여수량 = BUY 누계 - SELL 누계 (0 이하인 종목 제외)
 * - stocks 배열을 외부에서 주입받아 ticker 매핑에 사용
 */
export function calcUnrealizedPnL(
  transactions: Transaction[],
  stocks: Stock[],
  priceMap: PriceMap
): UnrealizedPnL[] {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const costBasis = new Map<string, { totalQuantity: number; totalCost: number }>();

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
        current.totalQuantity > 0 ? current.totalCost / current.totalQuantity : 0;

      const remainQty = Math.max(0, current.totalQuantity - qty);
      costBasis.set(t.stock_id, {
        totalQuantity: remainQty,
        totalCost: remainQty * avgCost,
      });
    }
  }

  // stock_id → ticker 매핑
  const stockMap = new Map<string, Stock>(stocks.map((s) => [s.id, s]));

  const result: UnrealizedPnL[] = [];

  for (const [stock_id, { totalQuantity, totalCost }] of Array.from(costBasis.entries())) {
    const quantity = totalQuantity;
    if (quantity <= 0) continue;

    const stock = stockMap.get(stock_id);
    if (!stock) continue;

    const { ticker } = stock;
    const priceQuote = priceMap[ticker];
    if (priceQuote === null || priceQuote === undefined) continue;

    const avgBuyPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;
    const currentPrice = priceQuote.price;
    const unrealizedPnL = (currentPrice - avgBuyPrice) * quantity;
    const rawReturnRate =
      avgBuyPrice > 0 ? ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100 : 0;
    const returnRate = Math.round(rawReturnRate * 100) / 100;

    result.push({
      stock_id,
      ticker,
      avgBuyPrice,
      currentPrice,
      quantity,
      unrealizedPnL,
      returnRate,
    });
  }

  return result;
}

/**
 * FR-04: 종목의 월별 누적 수익률 시계열 생성
 * - returnRate = (closePrice - avgBuyPrice) / avgBuyPrice × 100
 * - avgBuyPrice = 0 인 경우 returnRate = 0 (division by zero 방어)
 */
export function calcStockCumulativeReturn(
  historicalPrices: StockHistoryPoint[],
  avgBuyPrice: number
): Array<{ month: string; returnRate: number }> {
  return historicalPrices.map(({ month, closePrice }) => {
    const rawReturnRate =
      avgBuyPrice > 0 ? ((closePrice - avgBuyPrice) / avgBuyPrice) * 100 : 0;
    const returnRate = Math.round(rawReturnRate * 100) / 100;
    return { month, returnRate };
  });
}
