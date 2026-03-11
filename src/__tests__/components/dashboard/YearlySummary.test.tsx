/**
 * TDD Test — YearlySummary
 * Design Section 9.2: TS-20 ~ TS-26, EC-06, EC-07
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import YearlySummary from '@/components/dashboard/YearlySummary';

// Fix system time to 2026
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('YearlySummary', () => {
  // TS-20: 현재 연도 데이터만 필터링 통계 계산
  it('TS-20: 2023년과 2026년 데이터 혼재 시 2026년 데이터만 통계 계산', () => {
    const data = [
      { month: '2023-10', pnl: 999999, dividend: 0 },
      { month: '2023-11', pnl: 888888, dividend: 0 },
      { month: '2023-12', pnl: 777777, dividend: 0 },
      { month: '2026-01', pnl: 100000, dividend: 0 },
      { month: '2026-02', pnl: 200000, dividend: 0 },
      { month: '2026-03', pnl: 300000, dividend: 0 },
      { month: '2026-04', pnl: 400000, dividend: 0 },
    ];
    render(<YearlySummary data={data} />);
    // 2026년 총손익 = 100+200+300+400 = 1,000,000
    expect(screen.getByText(/1,000,000/)).toBeInTheDocument();
    // 2023년 데이터가 반영되면 안 됨
    expect(screen.queryByText(/999,999/)).not.toBeInTheDocument();
  });

  // TS-21: 총손익 합산 표시
  it('TS-21: 총손익 합산 표시 (2026년 pnl=[100,-50,200] → 250)', () => {
    const data = [
      { month: '2026-01', pnl: 100, dividend: 0 },
      { month: '2026-02', pnl: -50, dividend: 0 },
      { month: '2026-03', pnl: 200, dividend: 0 },
    ];
    render(<YearlySummary data={data} />);
    expect(screen.getByText(/250/)).toBeInTheDocument();
  });

  // TS-22: 최고수익월 표시
  it('TS-22: 최고수익월이 2026-03인 경우 해당 월 표시', () => {
    const data = [
      { month: '2026-01', pnl: 100000, dividend: 0 },
      { month: '2026-02', pnl: 50000, dividend: 0 },
      { month: '2026-03', pnl: 300000, dividend: 0 },
    ];
    render(<YearlySummary data={data} />);
    expect(screen.getByText(/2026-03/)).toBeInTheDocument();
  });

  // TS-23: 손실월 수 표시
  it('TS-23: 손실월 수 표시 (pnl=[100,-50,-30,200] → 2개)', () => {
    const data = [
      { month: '2026-01', pnl: 100, dividend: 0 },
      { month: '2026-02', pnl: -50, dividend: 0 },
      { month: '2026-03', pnl: -30, dividend: 0 },
      { month: '2026-04', pnl: 200, dividend: 0 },
    ];
    render(<YearlySummary data={data} />);
    expect(screen.getByText('2개월')).toBeInTheDocument();
  });

  // TS-24: totalInvested 있을 때 수익률 표시
  it('TS-24: totalInvested=1000000, pnl+dividend=100000 → "10.00%" 포함', () => {
    const data = [
      { month: '2026-01', pnl: 80000, dividend: 20000 },
    ];
    render(<YearlySummary data={data} totalInvested={1000000} />);
    expect(screen.getByText(/10\.00%/)).toBeInTheDocument();
  });

  // TS-25: totalInvested 없을 때 수익률 '-'
  it('TS-25: totalInvested 미전달 → 수익률 "-" 텍스트 표시', () => {
    const data = [{ month: '2026-01', pnl: 100000, dividend: 0 }];
    render(<YearlySummary data={data} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  // TS-26: 현재 연도 데이터 없을 때 빈 상태
  it('TS-26: 현재 연도(2026) 데이터 없을 때 "올해 데이터가 없습니다" 표시', () => {
    const data = [
      { month: '2022-01', pnl: 100000, dividend: 0 },
      { month: '2022-02', pnl: 200000, dividend: 0 },
    ];
    render(<YearlySummary data={data} />);
    expect(screen.getByText('올해 데이터가 없습니다')).toBeInTheDocument();
  });

  // EC-06: totalInvested=0 → 수익률 '-'
  it('EC-06: totalInvested=0 → 수익률 "-", 0 나누기 방어', () => {
    const data = [{ month: '2026-01', pnl: 100000, dividend: 0 }];
    render(<YearlySummary data={data} totalInvested={0} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  // EC-07: 모든 월 pnl 음수
  it('EC-07: 모든 월 pnl 음수 → 오류 없이 렌더링', () => {
    const data = [
      { month: '2026-01', pnl: -100, dividend: 0 },
      { month: '2026-02', pnl: -200, dividend: 0 },
    ];
    expect(() => render(<YearlySummary data={data} />)).not.toThrow();
  });
});
