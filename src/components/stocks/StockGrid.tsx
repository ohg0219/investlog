'use client'

import type { Stock, PriceMap } from '@/types'
import StockCard from './StockCard'

interface StockGridProps {
  stocks: Stock[]
  priceMap: PriceMap
  isPriceLoading: boolean
  onEdit: (stock: Stock) => void
  onDelete: (stockId: string) => void
  onAddFirst: () => void
}

export default function StockGrid({
  stocks,
  priceMap,
  isPriceLoading,
  onEdit,
  onDelete,
  onAddFirst,
}: StockGridProps) {
  if (stocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="font-mono text-warm-mid">등록된 주식상품이 없습니다.</p>
        <button
          type="button"
          onClick={onAddFirst}
          className="
            px-6 py-3
            bg-accent text-ink
            font-mono text-sm tracking-widest
            hover:bg-accent/80
            transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
          "
        >
          + 첫 종목 추가하기
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {stocks.map((stock) => (
        <StockCard
          key={stock.id}
          stock={stock}
          priceQuote={priceMap[stock.ticker] ?? null}
          isPriceLoading={isPriceLoading}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
