/**
 * TDD Test — PeriodFilter
 * Design Section 9.2: TS-09 ~ TS-13, EC-03
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import PeriodFilter from '@/components/dashboard/PeriodFilter';

describe('PeriodFilter', () => {
  // TS-09: 4개 버튼 렌더링
  it('TS-09: 4개 기간 버튼이 렌더링된다', () => {
    render(<PeriodFilter value="3M" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '3개월' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '6개월' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1년' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '전체' })).toBeInTheDocument();
  });

  // TS-10: 현재 value 버튼 active 상태
  it('TS-10: value="6M"일 때 6개월 버튼이 active 클래스를 가진다', () => {
    render(<PeriodFilter value="6M" onChange={vi.fn()} />);
    const activeBtn = screen.getByRole('button', { name: '6개월' });
    expect(activeBtn.className).toContain('bg-accent');
  });

  // TS-11: 비활성 버튼은 active 미적용
  it('TS-11: value="6M"일 때 나머지 버튼은 active 클래스가 없다', () => {
    render(<PeriodFilter value="6M" onChange={vi.fn()} />);
    const inactiveBtn = screen.getByRole('button', { name: '3개월' });
    expect(inactiveBtn.className).not.toContain('bg-accent');
  });

  // TS-12: 버튼 클릭 시 onChange 호출
  it('TS-12: 1년 버튼 클릭 시 onChange("1Y") 1회 호출', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PeriodFilter value="3M" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '1년' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('1Y');
  });

  // TS-13: 현재 value 버튼 클릭 시에도 onChange 호출
  it('TS-13: 현재 value 버튼(ALL) 클릭 시에도 onChange 호출', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PeriodFilter value="ALL" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '전체' }));
    expect(onChange).toHaveBeenCalledWith('ALL');
  });

  // EC-03: 알 수 없는 value
  it('EC-03: 알 수 없는 value 전달 시 4개 버튼 모두 active 미적용, 오류 없음', () => {
    // @ts-expect-error testing invalid value
    render(<PeriodFilter value="INVALID" onChange={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    buttons.forEach(btn => {
      expect(btn.className).not.toContain('bg-accent');
    });
  });
});
