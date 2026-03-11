/**
 * TDD Test — TransactionTable
 * Design Section 9.2: TS-40 ~ TS-43
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TransactionTable from '@/components/transactions/TransactionTable';
import { mockTransactionsWithStock } from '@/__tests__/fixtures/transactions';

describe('TransactionTable', () => {
  // TS-40: 거래 목록 렌더링
  it('TS-40: transactions 3건 → 행 3개 DOM 존재', () => {
    render(
      <TransactionTable
        transactions={mockTransactionsWithStock}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAddFirst={vi.fn()}
      />
    );
    const rows = screen.getAllByRole('row');
    // header row + 3 data rows
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });

  // TS-41: 빈 상태 메시지
  it('TS-41: transactions=[] → "등록된 거래 내역이 없습니다" 텍스트', () => {
    render(
      <TransactionTable
        transactions={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAddFirst={vi.fn()}
      />
    );
    expect(screen.getByText(/등록된 거래 내역이 없습니다/)).toBeInTheDocument();
  });

  // TS-42: 빈 상태 추가 버튼
  it('TS-42: transactions=[] → "첫 거래 추가하기" 버튼 존재', () => {
    render(
      <TransactionTable
        transactions={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAddFirst={vi.fn()}
      />
    );
    expect(screen.getByText(/첫 거래 추가하기/)).toBeInTheDocument();
  });

  // TS-43: 테이블 헤더 컬럼
  it('TS-43: 테이블 헤더 — 날짜/유형/종목코드/종목명/수량/단가/금액/통화 존재', () => {
    render(
      <TransactionTable
        transactions={mockTransactionsWithStock}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAddFirst={vi.fn()}
      />
    );
    expect(screen.getByText('날짜')).toBeInTheDocument();
    expect(screen.getByText('유형')).toBeInTheDocument();
    expect(screen.getByText('종목코드')).toBeInTheDocument();
    expect(screen.getByText('종목명')).toBeInTheDocument();
    expect(screen.getByText('수량')).toBeInTheDocument();
    expect(screen.getByText('단가')).toBeInTheDocument();
    expect(screen.getByText('금액')).toBeInTheDocument();
    expect(screen.getByText('통화')).toBeInTheDocument();
  });
});
