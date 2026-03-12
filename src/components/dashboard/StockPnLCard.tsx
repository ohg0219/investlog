import type { UnrealizedPnL } from '@/types'

interface StockPnLCardProps {
  item: UnrealizedPnL
  name: string
  isPriceLoading?: boolean
}

export default function StockPnLCard({ item, name, isPriceLoading }: StockPnLCardProps) {
  const { ticker, returnRate, unrealizedPnL } = item

  const returnRateText =
    returnRate >= 0
      ? `+${returnRate.toFixed(2)}%`
      : `${returnRate.toFixed(2)}%`

  const returnRateClass =
    returnRate >= 0 ? 'text-accent' : 'text-red-bright'

  const absAmount = Math.abs(unrealizedPnL)
  const formattedAmount = new Intl.NumberFormat('ko-KR').format(absAmount)
  const pnlText =
    unrealizedPnL >= 0
      ? `+₩${formattedAmount}`
      : `-₩${formattedAmount}`

  const pnlClass =
    unrealizedPnL >= 0 ? 'text-accent' : 'text-red-bright'

  return (
    <div className="bg-surface rounded-lg p-4 space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="font-display text-paper text-sm">{name}</span>
        <div className="flex items-baseline gap-2">
          {isPriceLoading && (
            <span className="font-mono text-xs text-warm-mid">가격 조회 중</span>
          )}
          <span className="font-mono text-xs text-warm-mid">{ticker}</span>
        </div>
      </div>
      <p className={`font-mono text-xl font-bold ${returnRateClass}`}>
        {returnRateText}
      </p>
      <div className="flex justify-between items-baseline">
        <span className="font-mono text-xs text-warm-mid">평가손익</span>
        <span className={`font-mono text-sm ${pnlClass}`}>{pnlText}</span>
      </div>
    </div>
  )
}
