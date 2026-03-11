/**
 * TDD Test — DailyBalanceChart
 * Design Section 9.2: TS-01 ~ TS-04, EC-01
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="mock-responsive-container">{children}</div>,
  AreaChart: ({ children, data }: any) => <div data-testid="mock-areachart" data-count={data?.length ?? 0}>{children}</div>,
  Area: ({ dataKey }: any) => <div data-testid={`mock-area-${dataKey}`} />,
  BarChart: ({ children, data }: any) => <div data-testid="mock-barchart" data-count={data?.length ?? 0}>{children}</div>,
  Bar: ({ dataKey }: any) => <div data-testid={`mock-bar-${dataKey}`} />,
  ReferenceLine: ({ y }: any) => <div data-testid="mock-referenceline" data-y={y} />,
  XAxis: () => <div data-testid="mock-xaxis" />,
  YAxis: () => <div data-testid="mock-yaxis" />,
  Tooltip: () => null,
  CartesianGrid: () => null,
  Legend: () => null,
  Cell: ({ fill }: any) => <div data-testid="mock-cell" data-fill={fill} />,
  defs: ({ children }: any) => <>{children}</>,
  linearGradient: ({ children }: any) => <>{children}</>,
  stop: () => null,
}));

import DailyBalanceChart from '@/components/dashboard/DailyBalanceChart';

describe('DailyBalanceChart', () => {
  // TS-01: data 존재 시 AreaChart 렌더링
  it('TS-01: data 존재 시 mock-areachart가 렌더링된다', () => {
    render(<DailyBalanceChart data={[{ date: '2024-01-01', balance: 1000000 }]} />);
    expect(screen.getByTestId('mock-areachart')).toBeInTheDocument();
  });

  // TS-02: data 빈 배열 → EmptyState 렌더링
  it('TS-02: data 빈 배열 → "잔고 데이터가 없습니다" 텍스트, mock-areachart 미존재', () => {
    render(<DailyBalanceChart data={[]} />);
    expect(screen.getByText('잔고 데이터가 없습니다')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-areachart')).not.toBeInTheDocument();
  });

  // TS-03: data 길이가 AreaChart data-count에 반영
  it('TS-03: data 3개 항목 → mock-areachart data-count="3"', () => {
    const data = [
      { date: '2024-01-01', balance: 100 },
      { date: '2024-01-02', balance: 200 },
      { date: '2024-01-03', balance: 300 },
    ];
    render(<DailyBalanceChart data={data} />);
    expect(screen.getByTestId('mock-areachart').getAttribute('data-count')).toBe('3');
  });

  // TS-04: Area dataKey="balance" 렌더링
  it('TS-04: Area dataKey="balance" 렌더링', () => {
    render(<DailyBalanceChart data={[{ date: '2024-01-01', balance: 500 }]} />);
    expect(screen.getByTestId('mock-area-balance')).toBeInTheDocument();
  });

  // EC-01: balance=0 데이터
  it('EC-01: balance=0 데이터 → 차트 렌더링, EmptyState 미노출', () => {
    render(<DailyBalanceChart data={[{ date: '2024-01-01', balance: 0 }]} />);
    expect(screen.getByTestId('mock-areachart')).toBeInTheDocument();
    expect(screen.queryByText('잔고 데이터가 없습니다')).not.toBeInTheDocument();
  });
});
