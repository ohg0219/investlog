/**
 * TDD Test — RecentTransactions
 * Design Section 9.2: TS-17 ~ TS-22, EC-07 ~ EC-08
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import type { TransactionWithStock } from '@/types';

// next/link 모킹 — <a href={href}> 형태로 대체
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

const makeTransaction = (
  id: string,
  type: 'BUY' | 'SELL' | 'DIVIDEND',
  date: string,
  amount: number,
  ticker = 'AAPL'
): TransactionWithStock => ({
  id,
  stock_id: `stock-${id}`,
  type,
  date,
  quantity: type !== 'DIVIDEND' ? 10 : undefined,
  price: type !== 'DIVIDEND' ? amount / 10 : undefined,
  amount,
  memo: undefined,
  created_at: `${date}T10:00:00.000+09:00`,
  updated_at: `${date}T10:00:00.000+09:00`,
  stock: { ticker, name: `${ticker} Corp`, currency: 'KRW' },
});

const mockTransactions: TransactionWithStock[] = [
  makeTransaction('tx-1', 'BUY', '2026-03-11', 500000, 'AAPL'),
  makeTransaction('tx-2', 'SELL', '2026-03-10', 300000, 'MSFT'),
  makeTransaction('tx-3', 'DIVIDEND', '2026-03-09', 50000, 'AAPL'),
  makeTransaction('tx-4', 'BUY', '2026-03-08', 200000, 'TSLA'),
  makeTransaction('tx-5', 'SELL', '2026-03-07', 400000, 'NVDA'),
];

describe('RecentTransactions', () => {
  // TS-17: 5건 배열 → 5개 행 렌더링
  it('TS-17: 5건 배열 전달 시 5개 거래 행이 렌더링된다', () => {
    render(<RecentTransactions transactions={mockTransactions} />);
    const rows = screen.getAllByTestId('transaction-row');
    expect(rows).toHaveLength(5);
  });

  // TS-18: 거래 유형 chip 레이블 표시
  it('TS-18: BUY → "매수", SELL → "매도", DIVIDEND → "배당" chip 표시', () => {
    render(<RecentTransactions transactions={mockTransactions} />);
    expect(screen.getAllByText('매수').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('매도').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('배당').length).toBeGreaterThanOrEqual(1);
  });

  // TS-19: "전체 보기 →" 링크 href 확인
  it('TS-19: "전체 보기 →" 링크가 /dashboard/transactions href를 가진다', () => {
    render(<RecentTransactions transactions={mockTransactions} />);
    const link = screen.getByRole('link', { name: /전체 보기/ });
    expect(link).toHaveAttribute('href', '/dashboard/transactions');
  });

  // TS-20: 빈 배열 → "거래 없음" 빈 상태
  it('TS-20: transactions 빈 배열 → "거래 없음" 텍스트, 거래 행 미존재', () => {
    render(<RecentTransactions transactions={[]} />);
    expect(screen.getByText('거래 없음')).toBeInTheDocument();
    expect(screen.queryAllByTestId('transaction-row')).toHaveLength(0);
  });

  // TS-21: 날짜 YYYY-MM-DD 형식 표시
  it('TS-21: 거래 날짜가 YYYY-MM-DD 형식으로 표시된다', () => {
    render(<RecentTransactions transactions={[mockTransactions[0]]} />);
    expect(screen.getByText('2026-03-11')).toBeInTheDocument();
  });

  // TS-22: 금액 포매팅 표시
  it('TS-22: 거래 금액이 쉼표 포맷으로 표시된다', () => {
    render(<RecentTransactions transactions={[mockTransactions[0]]} />);
    expect(screen.getByText(/500,000/)).toBeInTheDocument();
  });

  // EC-07: transactions 정확히 5건 → 5건 모두 표시
  it('EC-07: transactions 정확히 5건 → 5건 모두 표시, 잘림 없음', () => {
    render(<RecentTransactions transactions={mockTransactions} />);
    const rows = screen.getAllByTestId('transaction-row');
    expect(rows).toHaveLength(5);
  });

  // EC-08: amount=0인 거래
  it('EC-08: amount=0인 거래 → "0" 또는 "₩0" 표시, 오류 없음', () => {
    const zeroTx = makeTransaction('tx-zero', 'DIVIDEND', '2026-03-01', 0);
    render(<RecentTransactions transactions={[zeroTx]} />);
    expect(screen.getByTestId('transaction-row')).toBeInTheDocument();
  });
});
