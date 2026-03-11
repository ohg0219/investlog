'use client'

import type { Stock, PriceQuote } from '@/types'

interface StockCardProps {
  stock: Stock
  priceQuote: PriceQuote | null
  isPriceLoading: boolean
  onEdit: (stock: Stock) => void
  onDelete: (stockId: string) => void
}

function formatPrice(price: number, currency: string): string {
  if (currency === 'KRW') {
    return `₩${price.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
  }
  if (currency === 'JPY') {
    return `¥${price.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}`
  }
  // USD 등 나머지
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function StockCard({
  stock,
  priceQuote,
  isPriceLoading,
  onEdit,
  onDelete,
}: StockCardProps) {
  const showPrice = !isPriceLoading && priceQuote !== null

  const renderChange = () => {
    if (!showPrice || priceQuote === null) return null
    const { changePercent } = priceQuote
    if (changePercent > 0) {
      return (
        <span className="font-mono text-sm text-green-bright">
          {`▲ +${changePercent.toFixed(1)}%`}
        </span>
      )
    }
    if (changePercent < 0) {
      return (
        <span className="font-mono text-sm text-red-bright">
          {`▼ ${changePercent.toFixed(1)}%`}
        </span>
      )
    }
    return (
      <span className="font-mono text-sm text-warm-mid">
        {`${changePercent.toFixed(1)}%`}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-4 bg-ink border border-warm-mid/20 rounded">
      {/* 종목 기본 정보 */}
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-xs text-warm-mid tracking-widest">
          {stock.ticker}
        </span>
        <span className="font-display text-base text-paper">
          {stock.name}
        </span>
        <span className="font-mono text-xs text-warm-mid">
          {stock.market} · {stock.currency}
        </span>
        {stock.sector && (
          <span className="font-mono text-xs text-accent">
            {stock.sector}
          </span>
        )}
      </div>

      {/* 가격 영역 */}
      <div className="flex flex-col gap-0.5 mt-1">
        {showPrice && priceQuote !== null ? (
          <>
            <span className="font-mono text-lg text-paper">
              {formatPrice(priceQuote.price, priceQuote.currency)}
            </span>
            {renderChange()}
          </>
        ) : (
          <span className="font-mono text-lg text-warm-mid">—</span>
        )}
      </div>

      {/* 버튼 */}
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={() => onEdit(stock)}
          className="
            px-3 py-1
            font-mono text-sm tracking-widest text-warm-mid
            border border-warm-mid/20
            hover:text-paper hover:border-warm-mid/60
            transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
          "
        >
          [수정]
        </button>
        <button
          type="button"
          onClick={() => onDelete(stock.id)}
          className="
            px-3 py-1
            font-mono text-sm tracking-widest text-warm-mid
            border border-warm-mid/20
            hover:text-red-bright hover:border-red-bright/40
            transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
          "
        >
          [삭제]
        </button>
      </div>
    </div>
  )
}
