/**
 * TDD Test — MonthlyBreakdownChart
 * Design Section 9.2: TS-05 ~ TS-08, EC-02
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
  Bar: ({ dataKey, children }: any) => <div data-testid={`mock-bar-${dataKey}`}>{children}</div>,
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

import MonthlyBreakdownChart from '@/components/dashboard/MonthlyBreakdownChart';

describe('MonthlyBreakdownChart', () => {
  // TS-05: data 존재 시 BarChart 렌더링
  it('TS-05: data 존재 시 mock-barchart가 렌더링된다', () => {
    render(<MonthlyBreakdownChart data={[{ month: '2024-01', buy: 100, sell: 50, dividend: 10 }]} />);
    expect(screen.getByTestId('mock-barchart')).toBeInTheDocument();
  });

  // TS-06: data 빈 배열 → EmptyState
  it('TS-06: data 빈 배열 → "월별 손익 데이터가 없습니다", mock-barchart 미존재', () => {
    render(<MonthlyBreakdownChart data={[]} />);
    expect(screen.getByText('월별 손익 데이터가 없습니다')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-barchart')).not.toBeInTheDocument();
  });

  // TS-07: 3개 Bar 모두 렌더링
  it('TS-07: mock-bar-buy, mock-bar-sell, mock-bar-dividend 모두 존재', () => {
    render(<MonthlyBreakdownChart data={[{ month: '2024-01', buy: 100, sell: 50, dividend: 10 }]} />);
    expect(screen.getByTestId('mock-bar-buy')).toBeInTheDocument();
    expect(screen.getByTestId('mock-bar-sell')).toBeInTheDocument();
    expect(screen.getByTestId('mock-bar-dividend')).toBeInTheDocument();
  });

  // TS-08: data 길이 BarChart data-count 반영
  it('TS-08: data 4개 항목 → mock-barchart data-count="4"', () => {
    const data = [
      { month: '2024-01', buy: 100, sell: 50, dividend: 10 },
      { month: '2024-02', buy: 200, sell: 100, dividend: 20 },
      { month: '2024-03', buy: 150, sell: 75, dividend: 15 },
      { month: '2024-04', buy: 300, sell: 200, dividend: 30 },
    ];
    render(<MonthlyBreakdownChart data={data} />);
    expect(screen.getByTestId('mock-barchart').getAttribute('data-count')).toBe('4');
  });

  // EC-02: buy/sell/dividend 모두 0
  it('EC-02: buy/sell/dividend 모두 0 → 차트 렌더링, 빈 상태 미노출', () => {
    render(<MonthlyBreakdownChart data={[{ month: '2024-01', buy: 0, sell: 0, dividend: 0 }]} />);
    expect(screen.getByTestId('mock-barchart')).toBeInTheDocument();
    expect(screen.queryByText('월별 손익 데이터가 없습니다')).not.toBeInTheDocument();
  });
});
