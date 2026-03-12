import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import DashboardClientShell from '@/components/dashboard/DashboardClientShell'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

vi.mock('@/components/dashboard/KpiCardGroup', () => ({
  default: () => <div data-testid="mock-kpi-card-group" />,
}))
vi.mock('@/components/dashboard/StockProfitSection', () => ({
  default: () => <div data-testid="mock-stock-profit-section" />,
}))
vi.mock('@/components/dashboard/PortfolioPieChart', () => ({
  default: () => <div data-testid="mock-portfolio-pie-chart" />,
}))
vi.mock('@/components/dashboard/HoldingsList', () => ({
  default: () => <div data-testid="mock-holdings-list" />,
}))
vi.mock('@/components/dashboard/DailyBalanceChart', () => ({
  default: () => <div data-testid="mock-daily-balance-chart" />,
}))
vi.mock('@/components/dashboard/MonthlyBreakdownChart', () => ({
  default: () => <div data-testid="mock-monthly-breakdown-chart" />,
}))
vi.mock('@/components/dashboard/RecentTransactions', () => ({
  default: () => <div data-testid="mock-recent-transactions" />,
}))
vi.mock('@/components/dashboard/MonthlyProfitSection', () => ({
  default: () => <div data-testid="mock-monthly-profit-section" />,
}))

const mockSummary = {
  kpi: { totalInvested: 1000000, realizedPnL: 50000, dividendIncome: 10000, totalReturn: 60000 },
  portfolio: [{ stock_id: 'uuid-1', ticker: 'AAPL', name: 'Apple', weight: 100, amount: 1000000 }],
}
const mockTransactions = [] as never[]
const mockChartData = { dailyBalance: [], monthlyBreakdown: [], monthlyPnL: [] }

function renderShell() {
  return render(
    <DashboardClientShell
      summary={mockSummary}
      transactions={mockTransactions}
      chartData={mockChartData}
      historyData={null}
    />
  )
}

/** fake timers 환경에서 pending Promise를 모두 flush한다 */
async function flushPromises() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('DashboardClientShell', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('TS-17: 마운트 즉시 fetch("/api/prices") 1회 호출', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ prices: {} }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await act(async () => { renderShell() })
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/prices')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('TS-18: fetch 성공 → REALTIME 배지 text-accent 클래스 보유', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ prices: {} }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await act(async () => { renderShell() })
    await flushPromises()

    const badge = screen.getByText('REALTIME')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('text-accent')
  })

  it('TS-20: fetch HTTP 500 실패 → REALTIME 배지 text-red-bright 클래스', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    await act(async () => { renderShell() })
    await flushPromises()

    const badge = screen.getByText('REALTIME')
    expect(badge).toHaveClass('text-red-bright')
  })

  it('TS-22: 60초 경과 후 fetch 재호출 (총 2회)', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ prices: {} }) })
    vi.stubGlobal('fetch', fetchMock)

    await act(async () => { renderShell() })
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('TS-23: 언마운트 후 추가 fetch 미발생', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ prices: {} }),
    })
    vi.stubGlobal('fetch', fetchMock)

    let unmount!: () => void
    await act(async () => {
      const result = renderShell()
      unmount = result.unmount
    })
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(1)

    unmount()
    vi.advanceTimersByTime(120_000)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('EC-07: 네트워크 오류(fetch reject) → REALTIME 배지 text-red-bright', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('Network'))
    vi.stubGlobal('fetch', fetchMock)

    await act(async () => { renderShell() })
    await flushPromises()

    const badge = screen.getByText('REALTIME')
    expect(badge).toHaveClass('text-red-bright')
  })
})
