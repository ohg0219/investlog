/**
 * TDD Test — TransactionFilterBar
 * Design Section 9.2: TS-20 ~ TS-25
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TransactionFilterBar from '@/components/transactions/TransactionFilterBar';

describe('TransactionFilterBar', () => {
  // TS-20: 초기 렌더링 기본값
  it('TS-20: 초기값 — 유형 ALL, 통화 ALL', () => {
    render(<TransactionFilterBar onFilterChange={vi.fn()} />);
    const typeSelect = screen.getByLabelText('유형');
    const currencySelect = screen.getByLabelText('통화');
    expect((typeSelect as HTMLSelectElement).value).toBe('ALL');
    expect((currencySelect as HTMLSelectElement).value).toBe('ALL');
  });

  // TS-21: 유형 select 변경
  it('TS-21: 유형 select → BUY 선택 시 onFilterChange 호출', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(<TransactionFilterBar onFilterChange={onFilterChange} />);
    await user.selectOptions(screen.getByLabelText('유형'), 'BUY');
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'BUY' })
    );
  });

  // TS-22: 통화 select 변경
  it('TS-22: 통화 select → KRW 선택 시 onFilterChange 호출', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(<TransactionFilterBar onFilterChange={onFilterChange} />);
    await user.selectOptions(screen.getByLabelText('통화'), 'KRW');
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'KRW' })
    );
  });

  // TS-23: 종목 검색 input 타이핑 즉시 반영
  it('TS-23: 종목 검색 input — 타이핑 즉시 value 반영', async () => {
    const user = userEvent.setup();
    render(<TransactionFilterBar onFilterChange={vi.fn()} />);
    const searchInput = screen.getByPlaceholderText('종목 검색');
    await user.type(searchInput, '삼성');
    expect((searchInput as HTMLInputElement).value).toBe('삼성');
  });

  // TS-24: 300ms 내 재입력 — 디바운스 (onFilterChange stockSearch 미호출)
  it('TS-24: 300ms 내 연속 타이핑 — stockSearch 콜백 미호출', async () => {
    const user = userEvent.setup({ delay: 50 });
    const onFilterChange = vi.fn();
    render(<TransactionFilterBar onFilterChange={onFilterChange} />);
    const searchInput = screen.getByPlaceholderText('종목 검색');
    await user.type(searchInput, '삼성');
    // 300ms 미경과 시점: stockSearch 포함 콜백 호출 없어야 함
    const calls = onFilterChange.mock.calls.filter(
      (call) => call[0].stockSearch !== undefined && call[0].stockSearch !== ''
    );
    expect(calls.length).toBe(0);
  });

  // TS-25: 종목 검색 디바운스 완료 (300ms 후 호출)
  it('TS-25: 300ms 경과 후 stockSearch 콜백 1회 호출', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(<TransactionFilterBar onFilterChange={onFilterChange} />);
    const searchInput = screen.getByPlaceholderText('종목 검색');
    await user.type(searchInput, '삼성');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ stockSearch: '삼성' })
    );
  });
});
