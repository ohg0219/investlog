/**
 * TDD Test — StocksClientShell
 * 주요 케이스: 모달 열림/닫힘 동작
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import StocksClientShell from '@/components/stocks/StocksClientShell';
import type { Stock } from '@/types';

// next/navigation mock
const mockRefresh = vi.fn();
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: mockPush }),
}));

// MSW 서버
const server = setupServer(
  http.get('/api/prices', () => {
    return HttpResponse.json({
      AAPL: { price: 182.4, currency: 'USD', changePercent: 1.2, name: 'Apple Inc.' },
    });
  }),
  http.post('/api/stocks', () => {
    return HttpResponse.json({ data: { id: 'new-id' } }, { status: 201 });
  }),
  http.delete('/api/stocks/:id', () => {
    return new HttpResponse(null, { status: 204 });
  })
);

beforeEach(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
  mockRefresh.mockClear();
  mockPush.mockClear();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const mockStocks: Stock[] = [
  {
    id: 'stock-id-1',
    ticker: 'AAPL',
    name: 'Apple Inc.',
    market: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    sector: 'Technology',
    memo: undefined,
    created_at: '2026-03-11T10:00:00.000+09:00',
    updated_at: '2026-03-11T10:00:00.000+09:00',
  },
];

describe('StocksClientShell', () => {
  it('[+ 종목 추가] 클릭 → StockFormModal 열림', async () => {
    const user = userEvent.setup();
    render(<StocksClientShell stocks={mockStocks} />);
    await user.click(screen.getByText(/\+ 종목 추가/));
    await waitFor(() => {
      expect(screen.getByText('종목 추가')).toBeInTheDocument();
    });
  });

  it('카드 [삭제] 클릭 → PasswordConfirmModal 열림', async () => {
    const user = userEvent.setup();
    render(<StocksClientShell stocks={mockStocks} />);
    await user.click(screen.getByText('[삭제]'));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('카드 [수정] 클릭 → StockFormModal(수정 모드) 열림', async () => {
    const user = userEvent.setup();
    render(<StocksClientShell stocks={mockStocks} />);
    await user.click(screen.getByText('[수정]'));
    await waitFor(() => {
      expect(screen.getByText('종목 수정')).toBeInTheDocument();
    });
  });

  it('주식상품 관리 헤더 텍스트 존재', () => {
    render(<StocksClientShell stocks={[]} />);
    expect(screen.getByText('주식상품 관리')).toBeInTheDocument();
  });
});
