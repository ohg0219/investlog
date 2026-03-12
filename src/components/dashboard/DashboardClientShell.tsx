'use client'

import { useState, useEffect, useMemo } from 'react'
import KpiCardGroup from '@/components/dashboard/KpiCardGroup'
import PortfolioPieChart from '@/components/dashboard/PortfolioPieChart'
import HoldingsList from '@/components/dashboard/HoldingsList'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import DailyBalanceChart from '@/components/dashboard/DailyBalanceChart'
import MonthlyBreakdownChart from '@/components/dashboard/MonthlyBreakdownChart'
import MonthlyProfitSection from '@/components/dashboard/MonthlyProfitSection'
import StockProfitSection from '@/components/dashboard/StockProfitSection'
import { calcUnrealizedPnL } from '@/lib/calculations'
import type { DashboardSummary, TransactionWithStock, ChartData, Stock, PriceMap, StockHistoryPoint } from '@/types'

interface DashboardClientShellProps {
  summary: DashboardSummary | null
  transactions: TransactionWithStock[] | null
  chartData: ChartData | null
  historyData: Record<string, StockHistoryPoint[]> | null
}

function DataErrorMessage() {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <p className="font-mono text-xs text-red-bright/80">데이터를 불러올 수 없습니다.</p>
      <button
        onClick={() => window.location.reload()}
        className="font-mono text-xs text-accent hover:text-accent/70 transition-colors"
      >
        새로고침
      </button>
    </div>
  )
}

export default function DashboardClientShell({
  summary,
  transactions,
  chartData,
  historyData,
}: DashboardClientShellProps) {
  const [priceMap, setPriceMap] = useState<PriceMap>({})
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [priceError, setPriceError] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchPrices = async () => {
      try {
        const res = await fetch('/api/prices')
        if (!res.ok) throw new Error('price fetch failed')
        const data = await res.json()
        if (!cancelled) {
          setPriceMap(prev => data.prices ?? prev)
          setLastUpdated(new Date())
          setIsLoading(false)
          setPriceError(false)
        }
      } catch {
        if (!cancelled) {
          setPriceError(true)
          setIsLoading(false)
        }
      }
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 60_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const unrealizedList = useMemo(() => {
    if (!transactions || !summary) return []
    const stocks: Stock[] = summary.portfolio.map(p => ({
      id: p.stock_id,
      ticker: p.ticker,
      name: p.name,
      market: '',
      country: '',
      currency: '',
      created_at: '',
      updated_at: '',
    }))
    return calcUnrealizedPnL(transactions, stocks, priceMap)
  }, [transactions, summary, priceMap])

  void isLoading

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-baseline gap-3">
        <h1 className="font-display text-paper text-4xl">대시보드</h1>
        <span className={[
          'font-mono text-xs px-2 py-0.5 rounded',
          priceError
            ? 'bg-red-bright/20 text-red-bright'
            : 'bg-accent/20 text-accent',
        ].join(' ')}>
          REALTIME
        </span>
        <span aria-live="polite" className="font-mono text-xs text-warm-mid">
          {lastUpdated ? lastUpdated.toLocaleTimeString('ko-KR') : '--:--:--'}
        </span>
      </div>

      {/* KPI 섹션 */}
      {summary !== null ? (
        <KpiCardGroup kpi={summary.kpi} priceMap={priceMap} />
      ) : (
        <DataErrorMessage />
      )}

      {/* 포트폴리오 섹션 */}
      {summary !== null && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PortfolioPieChart items={summary.portfolio} />
          <HoldingsList items={summary.portfolio} />
        </div>
      )}

      {/* 일별 잔고 추이 섹션 */}
      {chartData !== null ? (
        <div className="bg-surface rounded-lg p-6">
          <h2 className="font-mono text-xs text-warm-mid uppercase tracking-wider mb-4">일별 잔고 추이</h2>
          <div className="h-64">
            <DailyBalanceChart data={chartData.dailyBalance} />
          </div>
        </div>
      ) : (
        <DataErrorMessage />
      )}

      {/* 월별 손익 현황 섹션 */}
      {chartData !== null && (
        <div className="bg-surface rounded-lg p-6">
          <h2 className="font-mono text-xs text-warm-mid uppercase tracking-wider mb-4">월별 손익 현황</h2>
          <div className="h-64">
            <MonthlyBreakdownChart data={chartData.monthlyBreakdown} />
          </div>
        </div>
      )}

      {/* 최근 거래 섹션 */}
      {transactions !== null ? (
        <RecentTransactions transactions={transactions.slice(0, 5)} />
      ) : (
        <DataErrorMessage />
      )}

      {/* 월별 수익 추이 섹션 */}
      {chartData !== null && (
        <div className="bg-surface rounded-lg p-6">
          <h2 className="font-mono text-xs text-warm-mid uppercase tracking-wider mb-4">월별 수익 추이</h2>
          <MonthlyProfitSection
            data={chartData.monthlyPnL}
            totalInvested={summary?.kpi?.totalInvested}
          />
        </div>
      )}

      {/* 주식별 수익 추이 섹션 */}
      {summary !== null && (
        <StockProfitSection
          portfolio={summary.portfolio}
          historyData={historyData}
          unrealizedList={unrealizedList}
          priceMap={priceMap}
        />
      )}
    </div>
  )
}
