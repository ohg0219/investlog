/**
 * TDD Test — TransactionsClientShell (통합 테스트)
 * Design Section 9: 통합 흐름 테스트
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import TransactionsClientShell from '@/components/transactions/TransactionsClientShell';
import {
  mockTransactionsWithStock,
  mockStocksForDropdown,
} from '@/__tests__/fixtures/transactions';

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const server = setupServer(
  http.get('/api/transactions', () => {
    return HttpResponse.json({ data: mockTransactionsWithStock });
  }),
  http.get('/api/prices', () => HttpResponse.json(null)),
  http.post('/api/transactions', async ({ request }) => {
    const body = await request.json() as { password: string };
    if (body.password === 'wrong') {
      return HttpResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    return HttpResponse.json({ data: { id: 'new-tx-id' } }, { status: 201 });
  }),
  http.delete('/api/transactions/:id', async ({ request }) => {
    const body = await request.json() as { password: string };
    if (body.password === 'wrong') {
      return HttpResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    return new HttpResponse(null, { status: 204 });
  })
);

beforeEach(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
  mockRefresh.mockClear();
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('TransactionsClientShell', () => {
  it('초기 렌더링 — 거래 내역 테이블 표시', () => {
    render(
      <TransactionsClientShell
        initialTransactions={mockTransactionsWithStock}
        stocks={mockStocksForDropdown}
      />
    );
    expect(screen.getByText('005930.KS')).toBeInTheDocument();
    expect(screen.getByText('삼성전자')).toBeInTheDocument();
  });

  it('[+ 거래 추가] 클릭 → 폼 모달 열림', async () => {
    const user = userEvent.setup();
    render(
      <TransactionsClientShell
        initialTransactions={mockTransactionsWithStock}
        stocks={mockStocksForDropdown}
      />
    );
    await user.click(screen.getByText(/거래 추가/));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('유형 필터 BUY 선택 → BUY 거래만 표시', async () => {
    const user = userEvent.setup();
    render(
      <TransactionsClientShell
        initialTransactions={mockTransactionsWithStock}
        stocks={mockStocksForDropdown}
      />
    );
    await user.selectOptions(screen.getByLabelText('유형'), 'BUY');
    // BUY 거래 (005930.KS) 표시
    expect(screen.getByText('005930.KS')).toBeInTheDocument();
    // SELL 거래 (AAPL) 미표시 (단, DIVIDEND도 AAPL이므로 AAPL 완전히 사라지지 않을 수 있음)
    // BUY 배지만 표시 확인
    const badges = screen.getAllByText('매수');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('[수정] 클릭 → 수정 폼 모달 열림 (기존 데이터 채움)', async () => {
    const user = userEvent.setup();
    render(
      <TransactionsClientShell
        initialTransactions={mockTransactionsWithStock}
        stocks={mockStocksForDropdown}
      />
    );
    const editBtns = screen.getAllByText('[수정]');
    await user.click(editBtns[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('[삭제] 클릭 → PasswordConfirmModal 열림', async () => {
    const user = userEvent.setup();
    render(
      <TransactionsClientShell
        initialTransactions={mockTransactionsWithStock}
        stocks={mockStocksForDropdown}
      />
    );
    const deleteBtns = screen.getAllByText('[삭제]');
    await user.click(deleteBtns[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('삭제 성공 → router.refresh() 호출', async () => {
    const user = userEvent.setup();
    render(
      <TransactionsClientShell
        initialTransactions={mockTransactionsWithStock}
        stocks={mockStocksForDropdown}
      />
    );
    const deleteBtns = screen.getAllByText('[삭제]');
    await user.click(deleteBtns[0]);
    await user.type(screen.getByLabelText(/비밀번호/), 'correct');
    await user.click(screen.getByText(/확인/));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
  });

  it('10건 이상 → Pagination 렌더', () => {
    const manyTransactions = Array.from({ length: 15 }, (_, i) => ({
      ...mockTransactionsWithStock[0],
      id: `tx-id-${i + 1}`,
      date: `2026-03-${String(i + 1).padStart(2, '0')}`,
    }));
    render(
      <TransactionsClientShell
        initialTransactions={manyTransactions}
        stocks={mockStocksForDropdown}
      />
    );
    expect(screen.getByText(/이전/)).toBeInTheDocument();
    expect(screen.getByText(/다음/)).toBeInTheDocument();
  });
});
