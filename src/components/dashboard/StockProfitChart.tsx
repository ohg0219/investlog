'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts'
import type { StockChartLine } from '@/types'

interface StockProfitChartProps {
  lines: StockChartLine[]
  height?: number
  showLegend?: boolean
}

export default function StockProfitChart({ lines, height, showLegend = true }: StockProfitChartProps) {
  if (lines.length === 0 || lines.every((l) => l.data.length === 0)) {
    return (
      <div className="h-64 flex items-center justify-center text-warm-mid font-mono text-sm">
        보유 종목이 없습니다
      </div>
    )
  }

  return (
    <div aria-label="주식별 수익 추이 차트">
    <ResponsiveContainer width="100%" height={height ?? 256}>
      <LineChart margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#a09080' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: '#a09080' }}
          width={48}
        />
        <Tooltip
          formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
          contentStyle={{ background: '#1e1a17', border: '1px solid #3a3530' }}
          labelStyle={{ color: '#e8ddd0' }}
        />
        {showLegend && (
          <Legend
            verticalAlign="top"
            iconType="line"
            wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
          />
        )}
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 2" />
        {lines.map((line) => (
          <Line
            key={line.ticker}
            type="monotone"
            data={line.data}
            dataKey="returnRate"
            name={line.name}
            stroke={line.color}
            dot={false}
            activeDot={{ r: 4 }}
            strokeWidth={2}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
    </div>
  )
}
