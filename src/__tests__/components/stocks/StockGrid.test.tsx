/**
 * TDD Test — StockGrid
 * Design Section 9.2: FE-01 ~ FE-06
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import StockGrid from '@/components/stocks/StockGrid';
import type { Stock, PriceMap } from '@/types';

const makeStock = (overrides: Partial<Stock> & { id: string; ticker: string }): Stock => ({
  id: overrides.id,
  ticker: overrides.ticker,
  name: overrides.name ?? `Stock ${overrides.ticker}`,
  market: overrides.market ?? 'NASDAQ',
  country: overrides.country ?? 'US',
  currency: overrides.currency ?? 'USD',
  sector: overrides.sector,
  memo: overrides.memo,
  created_at: '2026-03-11T10:00:00.000+09:00',
  updated_at: '2026-03-11T10:00:00.000+09:00',
});

const stock1 = makeStock({ id: 'id-1', ticker: 'AAPL', name: 'Apple Inc.' });
const stock2 = makeStock({ id: 'id-2', ticker: 'NVDA', name: 'NVIDIA' });
const stock3 = makeStock({ id: 'id-3', ticker: 'TSLA', name: 'Tesla' });

const defaultPriceMap: PriceMap = {
  AAPL: { price: 182.4, currency: 'USD', changePercent: 1.2, name: 'Apple Inc.' },
  NVDA: { price: 891.2, currency: 'USD', changePercent: -0.3, name: 'NVIDIA' },
  TSLA: { price: 250.0, currency: 'USD', changePercent: 0, name: 'Tesla' },
};

describe('StockGrid', () => {
  // FE-01: stocks 3개 → 카드 3개 DOM 존재
  it('FE-01: stocks 3개 → 카드 3개 렌더링', () => {
    render(
      <StockGrid
        stocks={[stock1, stock2, stock3]}
        priceMap={defaultPriceMap}
        isPriceLoading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAddFirst={vi.fn()}
      />
    );
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('NVIDIA')).toBeInTheDocument();
    expect(screen.getByText('Tesla')).toBeInTheDocument();
  });

  // FE-02: stocks=[] → "등록된 주식상품이 없습니다" 텍스트
  it('FE-02: stocks=[] → 빈 상태 메시지 표시', () => {
    render(
      <StockGrid
        stocks={[]}
        priceMap={{}}
        isPriceLoading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAddFirst={vi.fn()}
      />
    );
    expect(screen.getByText(/등록된 주식상품이 없습니다/)).toBeInTheDocument();
  });

  // FE-03: stocks=[] → "첫 종목 추가하기" 버튼
  it('FE-03: stocks=[] → "첫 종목 추가하기" 버튼 존재', () => {
    render(
      <StockGrid
        stocks={[]}
        priceMap={{}}
        isPriceLoading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAddFirst={vi.fn()}
      />
    );
    expect(screen.getByText(/첫 종목 추가하기/)).toBeInTheDocument();
  });

  // FE-04: priceMap에 가격 있으면 카드에 표시
  it('FE-04: priceMap에 가격 있으면 카드에 표시된다', () => {
    render(
      <StockGrid
        stocks={[stock1]}
        priceMap={{ AAPL: { price: 182.4, currency: 'USD', changePercent: 1.2, name: 'Apple Inc.' } }}
        isPriceLoading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAddFirst={vi.fn()}
      />
    );
    expect(screen.getByText('$182.40')).toBeInTheDocument();
  });

  // FE-05: priceMap[ticker]=null → 해당 카드 "—"
  it('FE-05: priceMap[ticker]=null → 해당 카드 "—" 표시', () => {
    render(
      <StockGrid
        stocks={[stock1]}
        priceMap={{ AAPL: null }}
        isPriceLoading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAddFirst={vi.fn()}
      />
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  // FE-06: isPriceLoading=true → 모든 카드 가격 영역 "—"
  it('FE-06: isPriceLoading=true → 모든 카드 가격 영역 "—" 표시', () => {
    render(
      <StockGrid
        stocks={[stock1, stock2]}
        priceMap={defaultPriceMap}
        isPriceLoading={true}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAddFirst={vi.fn()}
      />
    );
    const dashes = screen.getAllByText('—');
    expect(dashes).toHaveLength(2);
  });

  // 빈 상태 버튼 클릭 → onAddFirst 호출
  it('첫 종목 추가하기 버튼 클릭 → onAddFirst 호출', async () => {
    const user = userEvent.setup();
    const onAddFirst = vi.fn();
    render(
      <StockGrid
        stocks={[]}
        priceMap={{}}
        isPriceLoading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAddFirst={onAddFirst}
      />
    );
    await user.click(screen.getByText(/첫 종목 추가하기/));
    expect(onAddFirst).toHaveBeenCalledTimes(1);
  });
});
