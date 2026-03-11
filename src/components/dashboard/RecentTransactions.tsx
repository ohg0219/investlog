'use client'

import Link from 'next/link'
import TransactionTypeBadge from '@/components/transactions/TransactionTypeBadge'
import type { TransactionWithStock } from '@/types'

interface RecentTransactionsProps {
  transactions: TransactionWithStock[]
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-paper text-lg tracking-wider">최근 거래</h2>
        <Link
          href="/dashboard/transactions"
          className="font-mono text-xs text-accent hover:text-accent/70"
        >
          전체 보기 →
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p className="font-mono text-xs text-warm-mid/50 text-center py-6">
          거래 없음
        </p>
      ) : (
        <table className="w-full">
          <thead>
            <tr>
              <th className="font-mono text-xs text-warm-mid/60 text-left pb-2 pr-3">
                날짜
              </th>
              <th className="font-mono text-xs text-warm-mid/60 text-left pb-2 pr-3">
                유형
              </th>
              <th className="font-mono text-xs text-warm-mid/60 text-left pb-2 pr-3">
                종목
              </th>
              <th className="font-mono text-xs text-warm-mid/60 text-right pb-2">
                금액
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id} data-testid="transaction-row">
                <td className="font-mono text-xs text-warm-mid py-1.5 pr-3">
                  {transaction.date}
                </td>
                <td className="py-1.5 pr-3">
                  <TransactionTypeBadge type={transaction.type} />
                </td>
                <td className="font-mono text-xs text-paper py-1.5 pr-3">
                  {transaction.stock.ticker}
                </td>
                <td className="font-mono text-xs text-paper text-right py-1.5">
                  ₩{transaction.amount.toLocaleString('ko-KR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
