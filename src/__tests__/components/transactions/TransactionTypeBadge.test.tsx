/**
 * TDD Test — TransactionTypeBadge
 * Design Section 9.2: TS-01 ~ TS-03
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TransactionTypeBadge from '@/components/transactions/TransactionTypeBadge';

describe('TransactionTypeBadge', () => {
  // TS-01: BUY badge
  it('TS-01: BUY 유형 — "매수" 텍스트, text-green-bright 클래스', () => {
    render(<TransactionTypeBadge type="BUY" />);
    const badge = screen.getByText('매수');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('text-green-bright');
  });

  // TS-02: SELL badge
  it('TS-02: SELL 유형 — "매도" 텍스트, text-red-bright 클래스', () => {
    render(<TransactionTypeBadge type="SELL" />);
    const badge = screen.getByText('매도');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('text-red-bright');
  });

  // TS-03: DIVIDEND badge
  it('TS-03: DIVIDEND 유형 — "배당" 텍스트, text-blue-bright 클래스', () => {
    render(<TransactionTypeBadge type="DIVIDEND" />);
    const badge = screen.getByText('배당');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('text-blue-bright');
  });
});
