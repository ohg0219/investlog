'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import type { MonthlyPnL } from '@/types'
import type { Period } from '@/components/dashboard/PeriodFilter'

const GREEN = '#2d6a4f'
const RED = '#ef4444'

interface MonthlyProfitChartProps {
  data: MonthlyPnL[]
  period: Period
}

export default function MonthlyProfitChart({ data, period }: MonthlyProfitChartProps) {
  const slicedData = useMemo(() => {
    switch (period) {
      case '3M':  return data.slice(-3)
      case '6M':  return data.slice(-6)
      case '1Y':  return data.slice(-12)
      case 'ALL': return data
      default:    return data
    }
  }, [data, period])

  if (slicedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-mono text-xs text-warm-mid">수익 데이터가 없습니다</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={slicedData} margin={{ top: 8, right: 8, left: 16, bottom: 0 }}>
        <XAxis
          dataKey="month"
          tickFormatter={(v) => v.slice(2)}
          tick={{ fontSize: 11, fill: '#a09070' }}
        />
        <YAxis
          tickFormatter={(v) => v.toLocaleString()}
          tick={{ fontSize: 11, fill: '#a09070' }}
          width={72}
        />
        <Tooltip formatter={(value) => (typeof value === 'number' ? value.toLocaleString() : value)} />
        <ReferenceLine y={0} stroke="#a09070" strokeDasharray="3 3" />
        <Bar dataKey="pnl">
          {slicedData.map((entry, i) => (
            <Cell key={i} fill={entry.pnl >= 0 ? GREEN : RED} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
