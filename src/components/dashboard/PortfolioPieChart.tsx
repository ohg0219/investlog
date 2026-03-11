'use client'

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import type { PortfolioItem } from '@/types'

const CHART_COLORS = [
  '#c8a96e', '#6898cc', '#6bba8a', '#d07070',
  '#a08060', '#8888aa', '#aa8866', '#66aaaa',
] as const

interface PortfolioPieChartProps {
  items: PortfolioItem[]
  outerRadius?: number
  innerRadius?: number
}

interface TooltipPayloadEntry {
  payload: PortfolioItem
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const item = payload[0].payload

  return (
    <div className="bg-ink border border-warm-mid/30 px-3 py-2 text-left">
      <p className="font-mono text-xs text-paper">{item.name}</p>
      <p className="font-mono text-xs text-accent">{item.weight.toFixed(2)}%</p>
      <p className="font-mono text-xs text-warm-mid">
        ₩{item.amount.toLocaleString('ko-KR')}
      </p>
    </div>
  )
}

export default function PortfolioPieChart({
  items,
  outerRadius = 160,
  innerRadius = 88,
}: PortfolioPieChartProps) {
  const filteredItems = items.filter(
    (item) => item.weight > 0 && Number.isFinite(item.weight)
  )

  if (filteredItems.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ height: outerRadius * 2 }}
      >
        <div
          className="rounded-full border border-dashed border-warm-mid/30"
          style={{ width: outerRadius * 2, height: outerRadius * 2 }}
        >
          <div className="flex items-center justify-center h-full">
            <p className="font-mono text-xs text-warm-mid/50">종목 없음</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={outerRadius * 2}>
      <PieChart>
        <Pie
          data={filteredItems}
          dataKey="weight"
          nameKey="name"
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          paddingAngle={2}
          stroke="none"
        >
          {filteredItems.map((item, index) => (
            <Cell
              key={item.stock_id}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )
}
