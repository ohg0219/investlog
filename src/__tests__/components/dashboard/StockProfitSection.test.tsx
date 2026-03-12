/**
 * TDD Test — StockProfitSection
 * Design Section 10.2: TS-24, TS-25, EC-10, TS-16
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => (
    <div data-testid="mock-linechart">{children}</div>
  ),
  Line: ({ name, data }: any) => (
    <div data-testid="mock-line" data-name={name ?? ''} data-count={String(data?.length ?? 0)} />
  ),
  ReferenceLine: ({ y }: any) => <div data-testid="mock-referenceline" data-y={String(y)} />,
  XAxis: () => <div data-testid="mock-xaxis" />,
  YAxis: () => <div data-testid="mock-yaxis" />,
  Tooltip: () => null,
  Legend: () => null,
  CartesianGrid: () => null,
}))

vi.mock('@/lib/calculations', () => ({
  calcStockCumulativeReturn: (_data: any[], _avgBuyPrice: number) => {
    return (_data ?? []).map((p: any) => ({ month: p.month, returnRate: 0 }))
  },
}))

import StockProfitSection from '@/components/dashboard/StockProfitSection'
import type { PortfolioItem, UnrealizedPnL, StockHistoryPoint } from '@/types'

const mockPortfolio: PortfolioItem[] = [
  { stock_id: 'uuid-1', ticker: 'AAPL', name: 'Apple', weight: 60, amount: 600000 },
  { stock_id: 'uuid-2', ticker: 'TSLA', name: 'Tesla', weight: 40, amount: 400000 },
]

const mockUnrealizedList: UnrealizedPnL[] = [
  { stock_id: 'uuid-1', ticker: 'AAPL', avgBuyPrice: 150, currentPrice: 170, quantity: 10, unrealizedPnL: 20000, returnRate: 13.33 },
  { stock_id: 'uuid-2', ticker: 'TSLA', avgBuyPrice: 200, currentPrice: 220, quantity: 5, unrealizedPnL: 10000, returnRate: 10.0 },
]

/** 현재 날짜 기준 최근 N개월 이전부터 지금까지 총 12개월 히스토리 생성 */
const make12MonthHistory = (): StockHistoryPoint[] => {
  const now = new Date()
  // '6M' cutoff: now.getMonth() - 5, filter >= cutoff → 6 months
  // '1Y' cutoff: now.getMonth() - 11, filter >= cutoff → 12 months
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { month, closePrice: 150 + i * 2 }
  })
}

/** 6M cutoff 기준 예상 개수를 동적으로 계산 */
function get6MExpectedCount(history: StockHistoryPoint[]): number {
  const now = new Date()
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 7)
  return history.filter(p => p.month >= cutoff).length
}

const mockHistoryData: Record<string, StockHistoryPoint[]> = {
  AAPL: make12MonthHistory(),
  TSLA: make12MonthHistory(),
}

describe('StockProfitSection', () => {
  // TS-24: 초기 activeTicker='ALL' → StockTab value='ALL' 렌더링
  it('TS-24: 초기 activeTicker="ALL" → "전체" 탭 aria-selected="true"', () => {
    render(
      <StockProfitSection
        portfolio={mockPortfolio}
        historyData={mockHistoryData}
        unrealizedList={mockUnrealizedList}
        priceMap={{}}
      />
    )
    const allTab = screen.getByRole('tab', { name: '전체' })
    expect(allTab).toHaveAttribute('aria-selected', 'true')
  })

  // TS-25: 탭 클릭 시 activeTicker 상태 변경 → StockProfitChart에 영향
  it('TS-25: AAPL 탭 클릭 → AAPL 탭 aria-selected="true", 전체 탭 false', () => {
    render(
      <StockProfitSection
        portfolio={mockPortfolio}
        historyData={mockHistoryData}
        unrealizedList={mockUnrealizedList}
        priceMap={{}}
      />
    )
    fireEvent.click(screen.getByRole('tab', { name: 'AAPL' }))
    expect(screen.getByRole('tab', { name: 'AAPL' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: '전체' })).toHaveAttribute('aria-selected', 'false')
  })

  // EC-10: historyData=null → DataErrorMessage 렌더링
  it('EC-10: historyData=null → 에러 메시지 표시, mock-linechart 미존재', () => {
    render(
      <StockProfitSection
        portfolio={mockPortfolio}
        historyData={null}
        unrealizedList={mockUnrealizedList}
        priceMap={{}}
      />
    )
    expect(screen.getByText('데이터를 불러올 수 없습니다.')).toBeInTheDocument()
    expect(screen.queryByTestId('mock-linechart')).not.toBeInTheDocument()
  })

  // TS-16: period='6M' → 최근 6개월 데이터만 각 라인에 전달
  it('TS-16: period="6M" 선택 → 각 Line data-count가 "전체" 대비 줄어들고 동적 계산과 일치', () => {
    render(
      <StockProfitSection
        portfolio={mockPortfolio}
        historyData={mockHistoryData}
        unrealizedList={mockUnrealizedList}
        priceMap={{}}
      />
    )
    // ALL 상태에서 data-count 확인
    const linesAll = screen.getAllByTestId('mock-line')
    const countAll = parseInt(linesAll[0].getAttribute('data-count') ?? '0', 10)
    expect(countAll).toBe(12)

    // PeriodFilter에서 '6개월' 버튼 클릭
    const sixMBtn = screen.getByRole('button', { name: '6개월' })
    fireEvent.click(sixMBtn)
    const lines6M = screen.getAllByTestId('mock-line')
    const count6M = parseInt(lines6M[0].getAttribute('data-count') ?? '0', 10)
    const expected6M = get6MExpectedCount(mockHistoryData['AAPL'])
    expect(count6M).toBe(expected6M)
    expect(count6M).toBeLessThan(12)
  })
})
