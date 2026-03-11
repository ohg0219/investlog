'use client'

import { useState } from 'react'
import PeriodFilter, { type Period } from '@/components/dashboard/PeriodFilter'
import MonthlyProfitChart from '@/components/dashboard/MonthlyProfitChart'
import YearlySummary from '@/components/dashboard/YearlySummary'
import type { MonthlyPnL } from '@/types'

interface MonthlyProfitSectionProps {
  data: MonthlyPnL[]
  totalInvested?: number
}

export default function MonthlyProfitSection({ data, totalInvested }: MonthlyProfitSectionProps) {
  const [period, setPeriod] = useState<Period>('ALL')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-2">
        <PeriodFilter value={period} onChange={setPeriod} />
        <div className="h-64">
          <MonthlyProfitChart data={data} period={period} />
        </div>
      </div>
      <YearlySummary data={data} totalInvested={totalInvested} />
    </div>
  )
}
