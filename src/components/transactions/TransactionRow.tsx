'use client'

import type { TransactionWithStock } from '@/types'
import TransactionTypeBadge from './TransactionTypeBadge'

interface TransactionRowProps {
  transaction: TransactionWithStock
  onEdit: (transaction: TransactionWithStock) => void
  onDelete: (transactionId: string) => void
}

const AMOUNT_COLOR: Record<string, string> = {
  BUY: 'text-red-bright',
  SELL: 'text-green-bright',
  DIVIDEND: 'text-blue-bright',
}

export default function TransactionRow({ transaction, onEdit, onDelete }: TransactionRowProps) {
  const { type, date, quantity, price, amount, memo, stock } = transaction

  const amountColor = AMOUNT_COLOR[type] ?? ''

  const formatNumber = (num: number) => num.toLocaleString()

  return (
    <tr className="group border-b border-warm-mid/10 hover:bg-warm-mid/5 transition-colors">
      {/* 날짜 */}
      <td className="px-3 py-2.5 font-mono text-xs text-warm-mid whitespace-nowrap">
        {date}
      </td>

      {/* 유형 */}
      <td className="px-3 py-2.5">
        <TransactionTypeBadge type={type} />
      </td>

      {/* 종목코드 */}
      <td className="px-3 py-2.5 font-mono text-xs text-paper">
        {stock.ticker}
      </td>

      {/* 종목명 */}
      <td className="px-3 py-2.5 font-mono text-xs text-paper max-w-[120px] truncate">
        {stock.name}
      </td>

      {/* 수량 */}
      <td className="px-3 py-2.5 font-mono text-xs text-paper text-right">
        {quantity != null ? formatNumber(quantity) : '—'}
      </td>

      {/* 단가 */}
      <td className="px-3 py-2.5 font-mono text-xs text-paper text-right">
        {price != null ? formatNumber(price) : '—'}
      </td>

      {/* 금액 */}
      <td
        data-testid="amount-cell"
        className={`px-3 py-2.5 font-mono text-xs text-right ${amountColor}`}
      >
        {formatNumber(amount)}
      </td>

      {/* 통화 */}
      <td className="px-3 py-2.5 font-mono text-xs text-warm-mid">
        {stock.currency}
      </td>

      {/* 메모 */}
      <td
        data-testid="memo-cell"
        className="px-3 py-2.5 font-mono text-xs text-warm-mid max-w-[120px] truncate"
      >
        {memo ?? ''}
      </td>

      {/* 액션 버튼 */}
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(transaction)}
            className="
              font-mono text-xs text-warm-mid
              hover:text-accent
              transition-colors
              focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
            "
          >
            [수정]
          </button>
          <button
            type="button"
            onClick={() => onDelete(transaction.id)}
            className="
              font-mono text-xs text-warm-mid
              hover:text-red-bright
              transition-colors
              focus:outline-none focus-visible:ring-1 focus-visible:ring-red-bright
            "
          >
            [삭제]
          </button>
        </div>
      </td>
    </tr>
  )
}
