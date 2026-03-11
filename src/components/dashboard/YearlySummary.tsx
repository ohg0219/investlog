'use client'

import type { MonthlyPnL } from '@/types'

interface YearlySummaryProps {
  data: MonthlyPnL[]
  totalInvested?: number
}

export default function YearlySummary({ data, totalInvested }: YearlySummaryProps) {
  const currentYear = String(new Date().getFullYear())
  const yearData = data.filter((d) => d.month.startsWith(currentYear))

  if (yearData.length === 0) {
    return (
      <div className="bg-surface rounded-lg p-6 flex items-center justify-center">
        <p className="font-mono text-xs text-warm-mid">올해 데이터가 없습니다</p>
      </div>
    )
  }

  const totalPnL = yearData.reduce((s, d) => s + d.pnl, 0)
  const dividendSum = yearData.reduce((s, d) => s + d.dividend, 0)
  const bestMonth = yearData.reduce((max, d) => (d.pnl > max.pnl ? d : max), yearData[0])?.month ?? '-'
  const lossMonths = yearData.filter((d) => d.pnl < 0).length

  const returnRate =
    totalInvested && totalInvested > 0
      ? ((totalPnL + dividendSum) / totalInvested * 100).toFixed(2) + '%'
      : '-'

  const pnlColor =
    totalPnL > 0 ? 'text-green-400' : totalPnL < 0 ? 'text-red-bright' : 'text-paper'

  return (
    <div className="bg-surface rounded-lg p-6 space-y-4">
      <h3 className="font-mono text-xs text-warm-mid uppercase tracking-wider">연간 요약</h3>
      <dl className="space-y-3">
        <div>
          <dt className="font-mono text-xs text-warm-mid">총손익</dt>
          <dd className={`font-mono text-sm font-semibold ${pnlColor}`}>
            {totalPnL.toLocaleString()} 원
          </dd>
        </div>
        <div>
          <dt className="font-mono text-xs text-warm-mid">최고수익월</dt>
          <dd className="font-mono text-sm text-paper">{bestMonth}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs text-warm-mid">손실 월 수</dt>
          <dd className="font-mono text-sm text-paper">{lossMonths}개월</dd>
        </div>
        <div>
          <dt className="font-mono text-xs text-warm-mid">배당포함 수익률</dt>
          <dd className="font-mono text-sm text-paper">{returnRate}</dd>
        </div>
      </dl>
    </div>
  )
}
