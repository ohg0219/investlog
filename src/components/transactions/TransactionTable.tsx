'use client'

import type { TransactionWithStock } from '@/types'
import TransactionRow from './TransactionRow'

interface TransactionTableProps {
  transactions: TransactionWithStock[]
  onEdit: (transaction: TransactionWithStock) => void
  onDelete: (transactionId: string) => void
  onAddFirst: () => void
}

export default function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  onAddFirst,
}: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="font-mono text-sm text-warm-mid">
          등록된 거래 내역이 없습니다.
        </p>
        <button
          type="button"
          onClick={onAddFirst}
          className="
            px-5 py-2
            bg-accent text-ink
            font-mono text-sm tracking-widest
            hover:bg-accent/80
            transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
          "
        >
          + 첫 거래 추가하기
        </button>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead>
          <tr className="border-b border-warm-mid/20">
            <th className="px-3 py-2.5 font-mono text-xs text-warm-mid tracking-widest text-left">
              날짜
            </th>
            <th className="px-3 py-2.5 font-mono text-xs text-warm-mid tracking-widest text-left">
              유형
            </th>
            <th className="px-3 py-2.5 font-mono text-xs text-warm-mid tracking-widest text-left">
              종목코드
            </th>
            <th className="px-3 py-2.5 font-mono text-xs text-warm-mid tracking-widest text-left">
              종목명
            </th>
            <th className="px-3 py-2.5 font-mono text-xs text-warm-mid tracking-widest text-right">
              수량
            </th>
            <th className="px-3 py-2.5 font-mono text-xs text-warm-mid tracking-widest text-right">
              단가
            </th>
            <th className="px-3 py-2.5 font-mono text-xs text-warm-mid tracking-widest text-right">
              금액
            </th>
            <th className="px-3 py-2.5 font-mono text-xs text-warm-mid tracking-widest text-left">
              통화
            </th>
            <th className="px-3 py-2.5 font-mono text-xs text-warm-mid tracking-widest text-left">
              메모
            </th>
            <th className="px-3 py-2.5 font-mono text-xs text-warm-mid tracking-widest text-right">
              {/* 액션 컬럼 헤더 (빈 열) */}
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
