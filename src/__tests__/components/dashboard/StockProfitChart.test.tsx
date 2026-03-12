/**
 * TDD Test — StockProfitChart
 * Design Section 8: TS-12 ~ TS-15
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="mock-linechart">{children}</div>,
  Line: ({ name }: any) => <div data-testid="mock-line" data-name={name ?? ''} />,
  ReferenceLine: ({ y }: any) => <div data-testid="mock-referenceline" data-y={String(y)} />,
  XAxis: () => <div data-testid="mock-xaxis" />,
  YAxis: () => <div data-testid="mock-yaxis" />,
  Tooltip: () => null,
  Legend: () => null,
  CartesianGrid: () => null,
}))

import StockProfitChart from '@/components/dashboard/StockProfitChart'
import type { StockChartLine } from '@/types'

const makeLine = (ticker: string, months = 3): StockChartLine => ({
  ticker,
  name: `${ticker} Inc`,
  color: '#4e9af1',
  data: Array.from({ length: months }, (_, i) => ({
    month: `2024-${String(i + 1).padStart(2, '0')}`,
    returnRate: i * 2.5,
  })),
})

describe('StockProfitChart', () => {
  // TS-12: 라인 2개 → mock-linechart 존재, mock-line 2개
  it('TS-12: lines 2개 → mock-linechart 존재, mock-line 2개 렌더링', () => {
    render(<StockProfitChart lines={[makeLine('AAPL'), makeLine('TSLA')]} />)
    expect(screen.getByTestId('mock-linechart')).toBeInTheDocument()
    expect(screen.getAllByTestId('mock-line')).toHaveLength(2)
  })

  // TS-13: 라인 1개 → mock-line 1개
  it('TS-13: lines 1개 → mock-line 1개 렌더링', () => {
    render(<StockProfitChart lines={[makeLine('AAPL')]} />)
    expect(screen.getAllByTestId('mock-line')).toHaveLength(1)
  })

  // TS-14: ReferenceLine y=0 렌더링
  it('TS-14: lines 있음 → mock-referenceline data-y="0" 존재', () => {
    render(<StockProfitChart lines={[makeLine('AAPL')]} />)
    expect(screen.getByTestId('mock-referenceline').getAttribute('data-y')).toBe('0')
  })

  // TS-15: lines 빈 배열 → 빈 상태 메시지, mock-linechart 미존재
  it('TS-15: lines=[] → "보유 종목이 없습니다", mock-linechart 미존재', () => {
    render(<StockProfitChart lines={[]} />)
    expect(screen.getByText('보유 종목이 없습니다')).toBeInTheDocument()
    expect(screen.queryByTestId('mock-linechart')).not.toBeInTheDocument()
  })
})
