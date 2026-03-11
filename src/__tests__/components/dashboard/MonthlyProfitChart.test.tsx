/**
 * TDD Test — MonthlyProfitChart
 * Design Section 9.2: TS-14 ~ TS-19, EC-04, EC-05
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
  ReferenceLine: ({ y }: any) => <div data-testid="mock-referenceline" data-y={String(y)} />,
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

import MonthlyProfitChart from '@/components/dashboard/MonthlyProfitChart';

const makeData = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    month: `2024-${String(i + 1).padStart(2, '0')}`,
    pnl: i % 3 === 0 ? -10000 : 50000,
    dividend: 5000,
  }));

describe('MonthlyProfitChart', () => {
  // TS-14: period='3M' 시 마지막 3개 항목 전달
  it('TS-14: period="3M", data 6개 → data-count="3"', () => {
    render(<MonthlyProfitChart data={makeData(6)} period="3M" />);
    expect(screen.getByTestId('mock-barchart').getAttribute('data-count')).toBe('3');
  });

  // TS-15: period='6M' 시 마지막 6개 항목 전달
  it('TS-15: period="6M", data 10개 → data-count="6"', () => {
    render(<MonthlyProfitChart data={makeData(10)} period="6M" />);
    expect(screen.getByTestId('mock-barchart').getAttribute('data-count')).toBe('6');
  });

  // TS-16: period='1Y' 시 마지막 12개 항목 전달
  it('TS-16: period="1Y", data 15개 → data-count="12"', () => {
    render(<MonthlyProfitChart data={makeData(15)} period="1Y" />);
    expect(screen.getByTestId('mock-barchart').getAttribute('data-count')).toBe('12');
  });

  // TS-17: period='ALL' 시 전체 데이터 전달
  it('TS-17: period="ALL", data 20개 → data-count="20"', () => {
    render(<MonthlyProfitChart data={makeData(20)} period="ALL" />);
    expect(screen.getByTestId('mock-barchart').getAttribute('data-count')).toBe('20');
  });

  // TS-18: ReferenceLine y=0 렌더링
  it('TS-18: ReferenceLine y=0 렌더링', () => {
    render(<MonthlyProfitChart data={makeData(1)} period="ALL" />);
    expect(screen.getByTestId('mock-referenceline').getAttribute('data-y')).toBe('0');
  });

  // TS-19: data 빈 배열 → EmptyState
  it('TS-19: data 빈 배열 → "수익 데이터가 없습니다", mock-barchart 미존재', () => {
    render(<MonthlyProfitChart data={[]} period="3M" />);
    expect(screen.getByText('수익 데이터가 없습니다')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-barchart')).not.toBeInTheDocument();
  });

  // EC-04: data.length < period slice count
  it('EC-04: data 2개, period="6M" → data-count="2" (전체 데이터)', () => {
    render(<MonthlyProfitChart data={makeData(2)} period="6M" />);
    expect(screen.getByTestId('mock-barchart').getAttribute('data-count')).toBe('2');
  });

  // EC-05: pnl=0 경계값 → green 처리
  it('EC-05: pnl=0 → Cell fill이 green (#2d6a4f)', () => {
    render(<MonthlyProfitChart data={[{ month: '2024-01', pnl: 0, dividend: 0 }]} period="ALL" />);
    const cells = screen.getAllByTestId('mock-cell');
    expect(cells[0].getAttribute('data-fill')).toBe('#2d6a4f');
  });
});
