import type { PortfolioItem } from '@/types'

interface HoldingsListProps {
  items: PortfolioItem[]
}

export default function HoldingsList({ items }: HoldingsListProps) {
  if (items.length === 0) return null

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.stock_id} className="flex items-center gap-3">
          <span className="font-mono text-xs text-paper w-20 shrink-0">
            {item.ticker}
          </span>

          <div className="flex-1 max-w-[200px] bg-warm-mid/20 h-1.5">
            <div
              className="h-full bg-accent"
              style={{ width: `${Math.min(item.weight, 100)}%` }}
            />
          </div>

          <span className="font-mono text-xs text-warm-mid w-14 text-right shrink-0">
            {item.weight.toFixed(2)}%
          </span>

          <span className="font-mono text-xs text-paper text-right flex-1">
            ₩{item.amount.toLocaleString('ko-KR')}
          </span>
        </li>
      ))}
    </ul>
  )
}
