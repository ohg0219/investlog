/**
 * TDD Test — TransactionRow
 * Design Section 9.2: TS-10 ~ TS-17
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TransactionRow from '@/components/transactions/TransactionRow';
import {
  mockBuyTransaction,
  mockSellTransaction,
  mockDividendTransaction,
} from '@/__tests__/fixtures/transactions';

describe('TransactionRow', () => {
  // TS-10: BUY 행 기본 렌더링
  it('TS-10: BUY 행 — 날짜/chip/ticker/name/수량/단가/금액 DOM 존재', () => {
    render(
      <table>
        <tbody>
          <TransactionRow
            transaction={mockBuyTransaction}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>
    );
    expect(screen.getByText('2026-03-10')).toBeInTheDocument();
    expect(screen.getByText('005930.KS')).toBeInTheDocument();
    expect(screen.getByText('삼성전자')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('78,500')).toBeInTheDocument();
    expect(screen.getByText('785,000')).toBeInTheDocument();
  });

  // TS-11: DIVIDEND 행 — 수량/단가 "—" 표시
  it('TS-11: DIVIDEND 행 — 수량/단가 컬럼 "—" 표시', () => {
    render(
      <table>
        <tbody>
          <TransactionRow
            transaction={mockDividendTransaction}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>
    );
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  // TS-12: BUY 금액 색상
  it('TS-12: BUY 금액 — text-red-bright 클래스', () => {
    render(
      <table>
        <tbody>
          <TransactionRow
            transaction={mockBuyTransaction}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>
    );
    const amountCell = screen.getByTestId('amount-cell');
    expect(amountCell).toHaveClass('text-red-bright');
  });

  // TS-13: SELL 금액 색상
  it('TS-13: SELL 금액 — text-green-bright 클래스', () => {
    render(
      <table>
        <tbody>
          <TransactionRow
            transaction={mockSellTransaction}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>
    );
    const amountCell = screen.getByTestId('amount-cell');
    expect(amountCell).toHaveClass('text-green-bright');
  });

  // TS-14: DIVIDEND 금액 색상
  it('TS-14: DIVIDEND 금액 — text-blue-bright 클래스', () => {
    render(
      <table>
        <tbody>
          <TransactionRow
            transaction={mockDividendTransaction}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>
    );
    const amountCell = screen.getByTestId('amount-cell');
    expect(amountCell).toHaveClass('text-blue-bright');
  });

  // TS-15: [수정] 버튼 클릭
  it('TS-15: [수정] 클릭 → onEdit(transaction) 1회 호출', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <table>
        <tbody>
          <TransactionRow
            transaction={mockBuyTransaction}
            onEdit={onEdit}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>
    );
    await user.click(screen.getByText('[수정]'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(mockBuyTransaction);
  });

  // TS-16: [삭제] 버튼 클릭
  it('TS-16: [삭제] 클릭 → onDelete(transaction.id) 1회 호출', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <table>
        <tbody>
          <TransactionRow
            transaction={mockBuyTransaction}
            onEdit={vi.fn()}
            onDelete={onDelete}
          />
        </tbody>
      </table>
    );
    await user.click(screen.getByText('[삭제]'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith('tx-id-1');
  });

  // TS-17: 긴 메모 truncate
  it('TS-17: 긴 메모 — truncate 클래스 적용', () => {
    const longMemoTx = { ...mockBuyTransaction, memo: '매우 긴 메모 텍스트 30자 이상입니다. 테스트를 위한 긴 텍스트' };
    render(
      <table>
        <tbody>
          <TransactionRow
            transaction={longMemoTx}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>
    );
    const memoCell = screen.getByTestId('memo-cell');
    expect(memoCell).toHaveClass('truncate');
  });
});
