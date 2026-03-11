'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import type { DailyBalancePoint } from '@/types'

interface DailyBalanceChartProps {
  data: DailyBalancePoint[]
}

function BalanceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-warm-mid/30 rounded px-3 py-2 font-mono text-xs text-paper">
      <p>{label}</p>
      <p>{payload[0].value.toLocaleString()} 원</p>
    </div>
  )
}

export default function DailyBalanceChart({ data }: DailyBalanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-mono text-xs text-warm-mid">잔고 데이터가 없습니다</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 16, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#c8a96e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#c8a96e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={(v) => v.slice(5)}
          tick={{ fontSize: 11, fill: '#a09070' }}
        />
        <YAxis
          tickFormatter={(v) => v.toLocaleString()}
          tick={{ fontSize: 11, fill: '#a09070' }}
          width={72}
        />
        <Tooltip content={<BalanceTooltip />} />
        <Area
          type="monotone"
          dataKey="balance"
          stroke="#c8a96e"
          strokeWidth={2}
          fill="url(#balanceGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
