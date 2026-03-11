'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'
import type { MonthlyBreakdown } from '@/types'

interface MonthlyBreakdownChartProps {
  data: MonthlyBreakdown[]
}

const BAR_COLORS = {
  buy:      '#2d6a4f',
  sell:     '#b5832a',
  dividend: '#3b82f6',
} as const

export default function MonthlyBreakdownChart({ data }: MonthlyBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-mono text-xs text-warm-mid">월별 손익 데이터가 없습니다</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barCategoryGap="20%" barGap={2}>
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
        <Tooltip
          formatter={(value) => (typeof value === 'number' ? value.toLocaleString() : value)}
        />
        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
        <Bar dataKey="buy" name="매수" fill={BAR_COLORS.buy} radius={[2, 2, 0, 0]} />
        <Bar dataKey="sell" name="매도" fill={BAR_COLORS.sell} radius={[2, 2, 0, 0]} />
        <Bar dataKey="dividend" name="배당" fill={BAR_COLORS.dividend} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
