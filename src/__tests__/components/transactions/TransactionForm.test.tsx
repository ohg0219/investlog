/**
 * TDD Test — TransactionForm
 * Design Section 9.2: TS-50 ~ TS-70
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import TransactionForm from '@/components/transactions/TransactionForm';
import {
  mockBuyTransaction,
  mockDividendTransaction,
  mockStocksForDropdown,
} from '@/__tests__/fixtures/transactions';

const server = setupServer(
  http.get('/api/prices', ({ request }) => {
    const url = new URL(request.url);
    const ticker = url.searchParams.get('ticker');
    if (ticker === '005930.KS') {
      return HttpResponse.json({ price: 78500, currency: 'KRW', changePercent: 0.4, name: '삼성전자' });
    }
    if (ticker === 'AAPL') {
      return HttpResponse.json({ price: 182.4, currency: 'USD', changePercent: 1.2, name: 'Apple Inc.' });
    }
    return HttpResponse.json(null);
  }),
  http.post('/api/transactions', async ({ request }) => {
    const body = await request.json() as { password: string };
    if (body.password === 'wrong') {
      return HttpResponse.json(
        { error: 'FORBIDDEN', message: '비밀번호가 올바르지 않습니다' },
        { status: 403 }
      );
    }
    return HttpResponse.json({ data: { id: 'new-tx-id' } }, { status: 201 });
  }),
  http.put('/api/transactions/:id', async ({ request }) => {
    const body = await request.json() as { password: string };
    if (body.password === 'wrong') {
      return HttpResponse.json(
        { error: 'FORBIDDEN', message: '비밀번호가 올바르지 않습니다' },
        { status: 403 }
      );
    }
    return HttpResponse.json({ data: { id: 'tx-id-1' } });
  })
);

beforeEach(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('TransactionForm', () => {
  // TS-50: 초기 렌더링 필드 존재
  it('TS-50: 초기 렌더링 — 주식 드롭다운, 유형 버튼 3개, 날짜, 수량, 단가, 금액, 메모, 비밀번호', () => {
    render(
      <TransactionForm
        stocks={mockStocksForDropdown}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/주식/)).toBeInTheDocument();
    expect(screen.getByText('BUY')).toBeInTheDocument();
    expect(screen.getByText('SELL')).toBeInTheDocument();
    expect(screen.getByText('DIVIDEND')).toBeInTheDocument();
    expect(screen.getByLabelText(/날짜/)).toBeInTheDocument();
    expect(screen.getByLabelText(/수량/)).toBeInTheDocument();
    expect(screen.getByLabelText(/단가/)).toBeInTheDocument();
    expect(screen.getByLabelText(/금액/)).toBeInTheDocument();
    expect(screen.getByLabelText(/메모/)).toBeInTheDocument();
    expect(screen.getByLabelText(/비밀번호/)).toBeInTheDocument();
  });

  // TS-51: 주식 선택 → 배지 표시
  it('TS-51: 주식 선택 → ticker/market/currency 배지 렌더링', async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        stocks={mockStocksForDropdown}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    await user.selectOptions(screen.getByLabelText(/주식/), 'stock-id-1');
    expect(screen.getByText(/005930\.KS/)).toBeInTheDocument();
    expect(screen.getByText(/KRX/)).toBeInTheDocument();
    expect(screen.getByText(/KRW/)).toBeInTheDocument();
  });

  // TS-52: 주식 선택 → 현재가 fetch
  it('TS-52: 주식 선택 → 현재가 배지 표시', async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        stocks={mockStocksForDropdown}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    await user.selectOptions(screen.getByLabelText(/주식/), 'stock-id-1');
    await waitFor(() => {
      expect(screen.getByText(/78,500/)).toBeInTheDocument();
    });
  });

  // TS-54: BUY 유형 선택
  it('TS-54: BUY 선택 → 수량/단가 필드 DOM 존재, BUY 버튼 active', async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        stocks={mockStocksForDropdown}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    await user.click(screen.getByText('BUY'));
    expect(screen.getByLabelText(/수량/)).toBeInTheDocument();
    expect(screen.getByLabelText(/단가/)).toBeInTheDocument();
    const buyBtn = screen.getByText('BUY');
    expect(buyBtn).toHaveClass('bg-accent');
  });

  // TS-55: DIVIDEND 유형 선택
  it('TS-55: DIVIDEND 선택 → 수량/단가 필드 DOM 미존재, 금액만 존재', async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        stocks={mockStocksForDropdown}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    await user.click(screen.getByText('DIVIDEND'));
    expect(screen.queryByLabelText(/수량/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/단가/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/금액/)).toBeInTheDocument();
  });

  // TS-56: BUY → DIVIDEND 전환 시 수량/단가 제거
  it('TS-56: BUY → DIVIDEND 전환 → 수량/단가 DOM 제거', async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        stocks={mockStocksForDropdown}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    await user.click(screen.getByText('BUY'));
    expect(screen.getByLabelText(/수량/)).toBeInTheDocument();
    await user.click(screen.getByText('DIVIDEND'));
    expect(screen.queryByLabelText(/수량/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/단가/)).not.toBeInTheDocument();
  });

  // TS-57: DIVIDEND → BUY 전환 시 수량/단가 재마운트
  it('TS-57: DIVIDEND → BUY 전환 → 수량/단가 DOM 재마운트', async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        stocks={mockStocksForDropdown}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    await user.click(screen.getByText('DIVIDEND'));
    await user.click(screen.getByText('BUY'));
    expect(screen.getByLabelText(/수량/)).toBeInTheDocument();
    expect(screen.getByLabelText(/단가/)).toBeInTheDocument();
  });

  // TS-58: 수량×단가 자동 계산
  it('TS-58: 수량 10, 단가 78500 → amount "785000"', async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        stocks={mockStocksForDropdown}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    await user.click(screen.getByText('BUY'));
    await user.type(screen.getByLabelText(/수량/), '10');
    await user.type(screen.getByLabelText(/단가/), '78500');
    const amountInput = screen.getByLabelText(/금액/) as HTMLInputElement;
    expect(amountInput.value).toBe('785000');
  });

  // TS-60: 주식 미선택 저장 시도
  it('TS-60: 주식 미선택 → API 호출 없음, 주식 선택 오류 메시지', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(
      <TransactionForm
        stocks={mockStocksForDropdown}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    await user.click(screen.getByText(/저장하기/));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/주식을 선택/)).toBeInTheDocument();
    fetchSpy.mockRestore();
  });

  // TS-62: 비밀번호 미입력 저장 시도
  it('TS-62: 비밀번호 미입력 → 거래 API 호출 없음, 비밀번호 오류 메시지', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    // editTarget으로 stock/type 기본값 채운 상태에서 비밀번호만 미입력
    render(
      <TransactionForm
        stocks={mockStocksForDropdown}
        editTarget={mockBuyTransaction}
        onSuccess={onSuccess}
        onCancel={vi.fn()}
      />
    );
    // 비밀번호 미입력 상태에서 저장 시도
    await user.click(screen.getByText(/저장하기/));
    // API 호출 없음 (onSuccess 미호출)
    expect(onSuccess).not.toHaveBeenCalled();
    // 비밀번호 오류 메시지 표시
    expect(screen.getByText(/비밀번호/)).toBeInTheDocument();
  });

  // TS-63: edit 모드 BUY 초기값
  it('TS-63: edit 모드 BUY — 기존 stock_id/type/date/quantity/price/amount/memo 채움', () => {
    render(
      <TransactionForm
        stocks={mockStocksForDropdown}
        editTarget={mockBuyTransaction}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect((screen.getByLabelText(/수량/) as HTMLInputElement).value).toBe('10');
    expect((screen.getByLabelText(/단가/) as HTMLInputElement).value).toBe('78500');
    expect((screen.getByLabelText(/금액/) as HTMLInputElement).value).toBe('785000');
    expect((screen.getByLabelText(/메모/) as HTMLInputElement).value).toBe('분할 매수');
  });

  // TS-64: edit 모드 DIVIDEND 초기값
  it('TS-64: edit 모드 DIVIDEND — 수량/단가 없음, 금액 기존값', () => {
    render(
      <TransactionForm
        stocks={mockStocksForDropdown}
        editTarget={mockDividendTransaction}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByLabelText(/수량/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/단가/)).not.toBeInTheDocument();
    expect((screen.getByLabelText(/금액/) as HTMLInputElement).value).toBe('150');
  });

  // TS-65: 성공적인 폼 제출 (create)
  it('TS-65: create 모드 제출 → POST 201 → onSuccess 호출', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(
      <TransactionForm
        stocks={mockStocksForDropdown}
        onSuccess={onSuccess}
        onCancel={vi.fn()}
      />
    );
    await user.selectOptions(screen.getByLabelText(/주식/), 'stock-id-1');
    await user.click(screen.getByText('BUY'));
    await user.type(screen.getByLabelText(/날짜/), '2026-03-11');
    await user.type(screen.getByLabelText(/수량/), '5');
    await user.type(screen.getByLabelText(/단가/), '79000');
    await user.type(screen.getByLabelText(/비밀번호/), 'correct');
    await user.click(screen.getByText(/저장하기/));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  // TS-66: 성공적인 폼 제출 (edit)
  it('TS-66: edit 모드 제출 → PUT 200 → onSuccess 호출', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(
      <TransactionForm
        stocks={mockStocksForDropdown}
        editTarget={mockBuyTransaction}
        onSuccess={onSuccess}
        onCancel={vi.fn()}
      />
    );
    await user.type(screen.getByLabelText(/비밀번호/), 'correct');
    await user.click(screen.getByText(/저장하기/));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  // TS-67: 비밀번호 불일치 403
  it('TS-67: 비밀번호 불일치 → 403 → 에러 메시지, 비밀번호 초기화', async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        stocks={mockStocksForDropdown}
        editTarget={mockBuyTransaction}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    await user.type(screen.getByLabelText(/비밀번호/), 'wrong');
    await user.click(screen.getByText(/저장하기/));
    await waitFor(() => {
      expect(screen.getByText(/비밀번호가 올바르지 않습니다/)).toBeInTheDocument();
    });
    expect((screen.getByLabelText(/비밀번호/) as HTMLInputElement).value).toBe('');
  });

  // TS-68: 제출 중 로딩 상태
  it('TS-68: 제출 중 — [저장하기] disabled + "저장 중..." 텍스트', async () => {
    const user = userEvent.setup();
    server.use(
      http.put('/api/transactions/:id', async () => {
        await new Promise((r) => setTimeout(r, 500));
        return HttpResponse.json({ data: { id: 'tx-id-1' } });
      })
    );
    render(
      <TransactionForm
        stocks={mockStocksForDropdown}
        editTarget={mockBuyTransaction}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    await user.type(screen.getByLabelText(/비밀번호/), 'correct');
    await user.click(screen.getByText(/저장하기/));
    expect(screen.getByText(/저장 중/)).toBeInTheDocument();
    expect(screen.getByText(/저장 중/)).toBeDisabled();
  });

  // TS-70: [취소] 클릭
  it('TS-70: [취소] 클릭 → onCancel 1회 호출', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <TransactionForm
        stocks={mockStocksForDropdown}
        onSuccess={vi.fn()}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByText(/취소/));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
