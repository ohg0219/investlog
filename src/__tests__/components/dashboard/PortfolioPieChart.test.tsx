/**
 * TDD Test — PortfolioPieChart
 * Design Section 9.2: TS-11 ~ TS-13, EC-04 ~ EC-05
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PortfolioPieChart from '@/components/dashboard/PortfolioPieChart';
import type { PortfolioItem } from '@/types';

// Recharts 모킹 — PieChart 컴포넌트를 testid가 있는 div로 대체
vi.mock('recharts', () => {
  const MockPieChart = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-piechart">{children}</div>
  );
  const MockPie = ({ data }: { data?: unknown[] }) => (
    <div data-testid="mock-pie" data-count={data?.length ?? 0} />
  );
  const MockCell = () => <div data-testid="mock-cell" />;
  const MockTooltip = () => null;
  const MockResponsiveContainer = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-responsive-container">{children}</div>
  );
  return {
    PieChart: MockPieChart,
    Pie: MockPie,
    Cell: MockCell,
    Tooltip: MockTooltip,
    ResponsiveContainer: MockResponsiveContainer,
  };
});

const makeItem = (ticker: string, weight: number, amount: number): PortfolioItem => ({
  stock_id: `stock-${ticker}`,
  ticker,
  name: `${ticker} Corp`,
  weight,
  amount,
});

describe('PortfolioPieChart', () => {
  // TS-11: items 존재 시 차트 컨테이너 렌더링
  it('TS-11: items 존재 시 차트 컨테이너가 렌더링된다', () => {
    const items = [makeItem('AAPL', 60, 6000000), makeItem('MSFT', 40, 4000000)];
    render(<PortfolioPieChart items={items} />);
    expect(screen.getByTestId('mock-piechart')).toBeInTheDocument();
  });

  // TS-12: items 빈 배열 → "종목 없음" 빈 상태
  it('TS-12: items 빈 배열 → "종목 없음" 텍스트 표시, 차트 미렌더링', () => {
    render(<PortfolioPieChart items={[]} />);
    expect(screen.getByText('종목 없음')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-piechart')).not.toBeInTheDocument();
  });

  // TS-13: weight=0, NaN 항목 필터링
  it('TS-13: weight=0, NaN 항목은 차트 data에서 제외된다', () => {
    const items = [
      makeItem('AAPL', 50, 5000000),
      makeItem('BAD1', 0, 0),
      { ...makeItem('BAD2', NaN, 0) },
    ];
    render(<PortfolioPieChart items={items} />);
    const pie = screen.getByTestId('mock-pie');
    // 필터 후 유효한 항목은 1개 (AAPL만)
    expect(pie.getAttribute('data-count')).toBe('1');
  });

  // EC-04: 전체 항목 weight=0 → 빈 상태 폴백
  it('EC-04: 모든 항목 weight=0 → "종목 없음" 빈 상태', () => {
    const items = [makeItem('A', 0, 0), makeItem('B', 0, 0)];
    render(<PortfolioPieChart items={items} />);
    expect(screen.getByText('종목 없음')).toBeInTheDocument();
  });

  // EC-05: weight=Infinity → 필터 제외
  it('EC-05: weight=Infinity 항목은 필터 제외, 오류 없음', () => {
    const items = [{ ...makeItem('INF', Infinity, 0) }];
    render(<PortfolioPieChart items={items} />);
    // Infinity는 필터 제거 → 빈 상태
    expect(screen.getByText('종목 없음')).toBeInTheDocument();
  });
});
