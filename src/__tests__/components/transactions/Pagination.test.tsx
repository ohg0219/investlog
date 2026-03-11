/**
 * TDD Test — Pagination
 * Design Section 9.2: TS-30 ~ TS-37
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Pagination from '@/components/transactions/Pagination';

describe('Pagination', () => {
  // TS-30: 총 건수 표시
  it('TS-30: total=42 — "전체 42건" 텍스트', () => {
    render(
      <Pagination total={42} currentPage={1} limit={10} onPageChange={vi.fn()} />
    );
    expect(screen.getByText(/전체 42건/)).toBeInTheDocument();
  });

  // TS-31: 페이지 버튼 개수
  it('TS-31: total=25, limit=10 — 페이지 버튼 3개', () => {
    render(
      <Pagination total={25} currentPage={1} limit={10} onPageChange={vi.fn()} />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByText('4')).not.toBeInTheDocument();
  });

  // TS-32: 현재 페이지 강조
  it('TS-32: currentPage=2 — 2번 버튼 accent 색상 클래스', () => {
    render(
      <Pagination total={30} currentPage={2} limit={10} onPageChange={vi.fn()} />
    );
    const activePage = screen.getByTestId('page-btn-2');
    expect(activePage).toHaveClass('bg-accent');
  });

  // TS-33: 이전 버튼 비활성화 (1페이지)
  it('TS-33: currentPage=1 — [< 이전] disabled', () => {
    render(
      <Pagination total={30} currentPage={1} limit={10} onPageChange={vi.fn()} />
    );
    const prevBtn = screen.getByText(/이전/);
    expect(prevBtn).toBeDisabled();
  });

  // TS-34: 다음 버튼 비활성화 (마지막 페이지)
  it('TS-34: currentPage=3, total=25 — [다음 >] disabled', () => {
    render(
      <Pagination total={25} currentPage={3} limit={10} onPageChange={vi.fn()} />
    );
    const nextBtn = screen.getByText(/다음/);
    expect(nextBtn).toBeDisabled();
  });

  // TS-35: 페이지 클릭
  it('TS-35: 2번 버튼 클릭 → onPageChange(2) 1회 호출', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination total={30} currentPage={1} limit={10} onPageChange={onPageChange} />
    );
    await user.click(screen.getByTestId('page-btn-2'));
    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  // TS-36: 이전 버튼 클릭
  it('TS-36: currentPage=3, [< 이전] 클릭 → onPageChange(2)', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination total={30} currentPage={3} limit={10} onPageChange={onPageChange} />
    );
    await user.click(screen.getByText(/이전/));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  // TS-37: 다음 버튼 클릭
  it('TS-37: currentPage=1, [다음 >] 클릭 → onPageChange(2)', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination total={30} currentPage={1} limit={10} onPageChange={onPageChange} />
    );
    await user.click(screen.getByText(/다음/));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
