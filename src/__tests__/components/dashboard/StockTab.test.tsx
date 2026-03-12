import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import StockTab from '@/components/dashboard/StockTab'

describe('StockTab', () => {
  it('TS-08: value=ALL일 때 "전체" 버튼이 aria-selected="true"', () => {
    render(<StockTab tickers={['AAPL', 'TSLA']} value="ALL" onChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: '전체' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'AAPL' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'TSLA' })).toHaveAttribute('aria-selected', 'false')
  })

  it('TS-09: tickers 배열의 각 티커 버튼이 렌더링된다', () => {
    render(<StockTab tickers={['AAPL', 'TSLA']} value="ALL" onChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'AAPL' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'TSLA' })).toBeInTheDocument()
  })

  it('TS-10: 탭 클릭 시 onChange가 해당 ticker 값으로 1회 호출된다', () => {
    const onChange = vi.fn()
    render(<StockTab tickers={['AAPL', 'TSLA']} value="ALL" onChange={onChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'AAPL' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('AAPL')
  })

  it('TS-11: value=AAPL일 때 AAPL만 aria-selected="true", 나머지는 "false"', () => {
    render(<StockTab tickers={['AAPL', 'TSLA']} value="AAPL" onChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'AAPL' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: '전체' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'TSLA' })).toHaveAttribute('aria-selected', 'false')
  })

  it('EC-03: tickers=[]일 때 "전체" 버튼 1개만 렌더링', () => {
    render(<StockTab tickers={[]} value="ALL" onChange={vi.fn()} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(1)
    expect(tabs[0]).toHaveTextContent('전체')
  })
})
