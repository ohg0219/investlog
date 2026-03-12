'use client'

import { useState, useMemo } from 'react'
import StockTab from '@/components/dashboard/StockTab'
import PeriodFilter from '@/components/dashboard/PeriodFilter'
import StockProfitChart from '@/components/dashboard/StockProfitChart'
import StockPnLCard from '@/components/dashboard/StockPnLCard'
import { calcStockCumulativeReturn } from '@/lib/calculations'
import type { Period } from '@/components/dashboard/PeriodFilter'
import type { PortfolioItem, StockHistoryPoint, UnrealizedPnL, PriceMap, StockChartLine } from '@/types'

const STOCK_COLORS = [
  '#00D8A8', '#FF6B6B', '#4ECDC4', '#FFE66D',
  '#A78BFA', '#F472B6', '#60A5FA', '#FB923C',
]

interface StockProfitSectionProps {
  portfolio: PortfolioItem[]
  historyData: Record<string, StockHistoryPoint[]> | null
  unrealizedList: UnrealizedPnL[]
  priceMap?: PriceMap
}

export default function StockProfitSection({
  portfolio,
  historyData,
  unrealizedList,
  priceMap = {},
}: StockProfitSectionProps) {
  const [activeTicker, setActiveTicker] = useState<string>('ALL')
  const [period, setPeriod] = useState<Period>('ALL')

  const avgBuyPriceMap = useMemo(() => {
    const map: Record<string, number> = {}
    unrealizedList.forEach(item => { map[item.ticker] = item.avgBuyPrice })
    return map
  }, [unrealizedList])

  const allLines = useMemo<StockChartLine[]>(() => {
    if (!historyData) return []

    const now = new Date()
    const cutoffMap: Record<string, string> = {
      '3M': new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 7),
      '6M': new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 7),
      '1Y': new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 7),
      'ALL': '0000-00',
    }
    const cutoff = cutoffMap[period]

    return Object.keys(historyData)
      .filter(ticker => ticker in avgBuyPriceMap)
      .map((ticker, index) => {
        const rawData = calcStockCumulativeReturn(historyData[ticker], avgBuyPriceMap[ticker])
        const data = rawData.filter(p => p.month >= cutoff)
        const nameEntry = portfolio.find(p => p.ticker === ticker)
        return {
          ticker,
          name: nameEntry?.name ?? ticker,
          color: STOCK_COLORS[index % STOCK_COLORS.length],
          data,
        }
      })
  }, [historyData, avgBuyPriceMap, period, portfolio])

  const visibleLines = useMemo(() => {
    if (activeTicker === 'ALL') return allLines
    return allLines.filter(l => l.ticker === activeTicker)
  }, [allLines, activeTicker])

  const tickerOptions = unrealizedList.map(item => item.ticker)

  if (historyData === null) {
    return (
      <div className="bg-surface rounded-lg p-6">
        <h2 className="font-mono text-xs text-warm-mid uppercase tracking-wider mb-4">주식별 수익 추이</h2>
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <p className="font-mono text-xs text-red-bright/80">데이터를 불러올 수 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs text-warm-mid uppercase tracking-wider">주식별 수익 추이</h2>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <StockTab
        tickers={tickerOptions}
        value={activeTicker}
        onChange={setActiveTicker}
      />

      <div className="h-64">
        <StockProfitChart lines={visibleLines} showLegend={activeTicker === 'ALL'} />
      </div>

      {unrealizedList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unrealizedList.map(item => {
            const nameEntry = portfolio.find(p => p.ticker === item.ticker)
            return (
              <StockPnLCard
                key={item.ticker}
                item={item}
                name={nameEntry?.name ?? item.ticker}
                isPriceLoading={priceMap[item.ticker] === null}
              />
            )
          })}
        </div>
      )}

      {unrealizedList.length === 0 && (
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <p className="font-mono text-xs text-warm-mid">보유 종목 데이터가 없습니다.</p>
        </div>
      )}
    </div>
  )
}
