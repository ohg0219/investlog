/**
 * TDD Test — StockPnLCard
 * Design Section 10.2: TS-01 ~ TS-07, EC-01 ~ EC-02
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import StockPnLCard from '@/components/dashboard/StockPnLCard'
import type { UnrealizedPnL } from '@/types'

const baseItem: UnrealizedPnL = {
  stock_id: 'uuid-1',
  ticker: 'AAPL',
  avgBuyPrice: 150,
  currentPrice: 169.51,
  quantity: 10,
  unrealizedPnL: 195100,
  returnRate: 13.01,
}

describe('StockPnLCard', () => {
  // TS-01: returnRate > 0 → text-accent 클래스
  it('TS-01: returnRate = 12.34 → 수익률 요소에 text-accent 클래스', () => {
    const item = { ...baseItem, returnRate: 12.34 }
    render(<StockPnLCard item={item} name="애플" />)
    const el = screen.getByText('+12.34%')
    expect(el).toHaveClass('text-accent')
  })

  // TS-02: returnRate < 0 → text-red-bright 클래스
  it('TS-02: returnRate = -5.67 → 수익률 요소에 text-red-bright 클래스', () => {
    const item = { ...baseItem, returnRate: -5.67 }
    render(<StockPnLCard item={item} name="애플" />)
    const el = screen.getByText('-5.67%')
    expect(el).toHaveClass('text-red-bright')
  })

  // TS-03: returnRate > 0 → "+12.34%" 텍스트
  it('TS-03: returnRate = 12.34 → "+12.34%" 텍스트가 화면에 존재한다', () => {
    const item = { ...baseItem, returnRate: 12.34 }
    render(<StockPnLCard item={item} name="애플" />)
    expect(screen.getByText('+12.34%')).toBeInTheDocument()
  })

  // TS-04: returnRate < 0 → "-5.67%" 텍스트
  it('TS-04: returnRate = -5.67 → "-5.67%" 텍스트가 화면에 존재한다', () => {
    const item = { ...baseItem, returnRate: -5.67 }
    render(<StockPnLCard item={item} name="애플" />)
    expect(screen.getByText('-5.67%')).toBeInTheDocument()
  })

  // TS-05: name, ticker 텍스트 각각 존재
  it('TS-05: name="애플", ticker="AAPL" → 두 텍스트 각각 존재한다', () => {
    render(<StockPnLCard item={baseItem} name="애플" />)
    expect(screen.getByText('애플')).toBeInTheDocument()
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  // TS-06: unrealizedPnL > 0 → text-accent + 양수 금액 텍스트
  it('TS-06: unrealizedPnL = 1234567 → text-accent 클래스 + 양수 금액 텍스트', () => {
    const item = { ...baseItem, unrealizedPnL: 1234567 }
    render(<StockPnLCard item={item} name="애플" />)
    const el = screen.getByText('+₩1,234,567')
    expect(el).toHaveClass('text-accent')
  })

  // TS-07: unrealizedPnL < 0 → text-red-bright + 음수 금액 텍스트
  it('TS-07: unrealizedPnL = -1234567 → text-red-bright 클래스 + 음수 금액 텍스트', () => {
    const item = { ...baseItem, unrealizedPnL: -1234567 }
    render(<StockPnLCard item={item} name="애플" />)
    const el = screen.getByText('-₩1,234,567')
    expect(el).toHaveClass('text-red-bright')
  })

  // EC-01: returnRate = 0 → text-accent (>= 0 경계값)
  it('EC-01: returnRate = 0 → text-accent 클래스 (>= 0 경계값)', () => {
    const item = { ...baseItem, returnRate: 0 }
    render(<StockPnLCard item={item} name="애플" />)
    const el = screen.getByText('+0.00%')
    expect(el).toHaveClass('text-accent')
  })

  // EC-02: unrealizedPnL = 0 → text-accent
  it('EC-02: unrealizedPnL = 0 → text-accent 클래스', () => {
    const item = { ...baseItem, unrealizedPnL: 0 }
    render(<StockPnLCard item={item} name="애플" />)
    const el = screen.getByText('+₩0')
    expect(el).toHaveClass('text-accent')
  })
})
