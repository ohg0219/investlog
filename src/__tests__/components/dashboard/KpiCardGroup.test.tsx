/**
 * TDD Test — KpiCardGroup
 * Design Section 9.2: TS-09 ~ TS-10
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import KpiCardGroup from '@/components/dashboard/KpiCardGroup';

const standardKpi = {
  totalInvested: 15_000_000,
  realizedPnL: 320_000,
  dividendIncome: 85_000,
  totalReturn: 405_000,
};

describe('KpiCardGroup', () => {
  // TS-09: 4개 KpiCard 레이블 렌더링
  it('TS-09: 4개의 KPI 레이블이 모두 DOM에 존재한다', () => {
    render(<KpiCardGroup kpi={standardKpi} />);
    expect(screen.getByText('총 투자금')).toBeInTheDocument();
    expect(screen.getByText('실현 손익')).toBeInTheDocument();
    expect(screen.getByText('배당 수익')).toBeInTheDocument();
    expect(screen.getByText('총 수익률')).toBeInTheDocument();
  });

  // TS-10: 각 KpiCard에 올바른 value 전달
  it('TS-10: 각 KpiCard에 올바른 value가 포매팅되어 표시된다', () => {
    render(
      <KpiCardGroup
        kpi={{
          totalInvested: 10_000_000,
          realizedPnL: 500_000,
          dividendIncome: 100_000,
          totalReturn: 600_000,
        }}
      />
    );
    expect(screen.getByText(/10,000,000/)).toBeInTheDocument();
    expect(screen.getByText(/500,000/)).toBeInTheDocument();
    expect(screen.getByText(/100,000/)).toBeInTheDocument();
    expect(screen.getByText(/600,000/)).toBeInTheDocument();
  });
});
