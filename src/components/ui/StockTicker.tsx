'use client'

/**
 * StockTicker — Client Component (onMouseEnter/onMouseLeave 사용)
 * Design Section 5.2, 5.4, 3.1
 *
 * - items를 2벌 복제해 seamless CSS marquee loop 구현 (FE-24)
 * - 상승(change > 0): text-green-bright (FE-21)
 * - 하락(change < 0): text-red-bright (FE-22)
 * - 보합(change = 0): text-warm-mid (EC-08)
 * - 호버 시 animation-play-state: paused
 */

interface TickerItem {
  symbol: string
  change: number
  changePercent: string
}

interface StockTickerProps {
  items: TickerItem[]
}

function getChangeColor(change: number): string {
  if (change > 0) return 'text-green-bright'
  if (change < 0) return 'text-red-bright'
  return 'text-warm-mid'
}

function getChangeSign(change: number): string {
  if (change > 0) return '+'
  return ''
}

function TickerItemNode({ item }: { item: TickerItem }) {
  const colorClass = getChangeColor(item.change)
  const sign = getChangeSign(item.change)

  return (
    <span
      className="inline-flex items-center gap-2 px-6 font-mono text-sm"
      aria-label={`${item.symbol} ${sign}${item.changePercent}`}
    >
      <span className="text-paper font-medium">{item.symbol}</span>
      <span className={colorClass}>
        {sign}
        {item.changePercent}
      </span>
    </span>
  )
}

export default function StockTicker({ items }: StockTickerProps) {
  if (items.length === 0) {
    return (
      <div
        className="w-full overflow-hidden bg-ink border-y border-warm-mid/20 py-2"
        aria-label="주가 티커"
        role="marquee"
      />
    )
  }

  // seamless loop: 동일 아이템을 2벌 렌더링 (FE-24)
  const doubled = [...items, ...items]

  return (
    <div
      className="w-full overflow-hidden bg-ink border-y border-warm-mid/20 py-2"
      aria-label="주가 티커"
      role="marquee"
    >
      <div
        className="flex whitespace-nowrap"
        style={{
          animation: 'marquee 30s linear infinite',
          animationPlayState: 'var(--ticker-play-state, running)',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.animationPlayState =
            'paused'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.animationPlayState =
            'running'
        }}
      >
        {doubled.map((item, index) => (
          <TickerItemNode
            key={`${item.symbol}-${index}`}
            item={item}
          />
        ))}
      </div>
    </div>
  )
}
