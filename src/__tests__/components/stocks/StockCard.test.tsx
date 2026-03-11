/**
 * TDD Test — StockCard
 * Design Section 9.2: FE-10 ~ FE-16
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import StockCard from '@/components/stocks/StockCard';
import type { Stock, PriceQuote } from '@/types';

const baseStock: Stock = {
  id: 'stock-id-1',
  ticker: 'AAPL',
  name: 'Apple',
  market: 'NASDAQ',
  country: 'US',
  currency: 'USD',
  sector: 'Technology',
  memo: undefined,
  created_at: '2026-03-11T10:00:00.000+09:00',
  updated_at: '2026-03-11T10:00:00.000+09:00',
};

const basePriceQuote: PriceQuote = {
  price: 182.4,
  currency: 'USD',
  changePercent: 1.2,
  name: 'Apple Inc.',
};

describe('StockCard', () => {
  // FE-10: ticker, name, market, currency, sector 텍스트 DOM 존재
  it('FE-10: 기본 정보가 렌더링된다', () => {
    render(
      <StockCard
        stock={baseStock}
        priceQuote={basePriceQuote}
        isPriceLoading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText(/NASDAQ/)).toBeInTheDocument();
    expect(screen.getByText(/USD/)).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
  });

  // FE-11: changePercent > 0 → text-green-bright 클래스, "▲ +1.2%" 형식
  it('FE-11: 상승 등락률 — green 클래스와 "▲ +1.2%" 텍스트', () => {
    render(
      <StockCard
        stock={baseStock}
        priceQuote={{ ...basePriceQuote, changePercent: 1.2 }}
        isPriceLoading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const changeEl = screen.getByText(/▲/);
    expect(changeEl).toHaveTextContent('▲ +1.2%');
    expect(changeEl).toHaveClass('text-green-bright');
  });

  // FE-12: changePercent < 0 → text-red-bright 클래스, "▼ -0.3%" 형식
  it('FE-12: 하락 등락률 — red 클래스와 "▼ -0.3%" 텍스트', () => {
    render(
      <StockCard
        stock={baseStock}
        priceQuote={{ ...basePriceQuote, changePercent: -0.3 }}
        isPriceLoading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const changeEl = screen.getByText(/▼/);
    expect(changeEl).toHaveTextContent('▼ -0.3%');
    expect(changeEl).toHaveClass('text-red-bright');
  });

  // FE-13: changePercent === 0 → text-warm-mid, 방향 화살표 없음
  it('FE-13: 보합 등락률 — warm-mid 클래스, 화살표 없음', () => {
    render(
      <StockCard
        stock={baseStock}
        priceQuote={{ ...basePriceQuote, changePercent: 0 }}
        isPriceLoading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    // 화살표 없음 확인
    expect(screen.queryByText(/▲/)).not.toBeInTheDocument();
    expect(screen.queryByText(/▼/)).not.toBeInTheDocument();
    // 0.0% 텍스트 존재, warm-mid 클래스
    const changeEl = screen.getByText('0.0%');
    expect(changeEl).toHaveClass('text-warm-mid');
  });

  // FE-14: [수정] 클릭 → onEdit(stock) 1회 호출
  it('FE-14: [수정] 클릭 → onEdit(stock) 1회 호출', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <StockCard
        stock={baseStock}
        priceQuote={basePriceQuote}
        isPriceLoading={false}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />
    );
    await user.click(screen.getByText('[수정]'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(baseStock);
  });

  // FE-15: [삭제] 클릭 → onDelete(stock.id) 1회 호출
  it('FE-15: [삭제] 클릭 → onDelete(stock.id) 1회 호출', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <StockCard
        stock={baseStock}
        priceQuote={basePriceQuote}
        isPriceLoading={false}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />
    );
    await user.click(screen.getByText('[삭제]'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith('stock-id-1');
  });

  // FE-16: sector undefined → sector 영역 렌더링 안 됨
  it('FE-16: sector 없을 때 sector 영역이 렌더링되지 않는다', () => {
    const stockNoSector = { ...baseStock, sector: undefined };
    render(
      <StockCard
        stock={stockNoSector}
        priceQuote={basePriceQuote}
        isPriceLoading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.queryByText('Technology')).not.toBeInTheDocument();
  });

  // priceQuote null → "—" 표시
  it('priceQuote === null → 가격 영역 "—" 표시', () => {
    render(
      <StockCard
        stock={baseStock}
        priceQuote={null}
        isPriceLoading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  // isPriceLoading → "—" 표시
  it('isPriceLoading=true → 가격 영역 "—" 표시', () => {
    render(
      <StockCard
        stock={baseStock}
        priceQuote={basePriceQuote}
        isPriceLoading={true}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
