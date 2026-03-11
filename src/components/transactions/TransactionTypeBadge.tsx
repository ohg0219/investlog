'use client'

import type { TransactionType } from '@/types'

interface TransactionTypeBadgeProps {
  type: TransactionType
}

const BADGE_CONFIG: Record<TransactionType, { label: string; className: string }> = {
  BUY: { label: '매수', className: 'text-green-bright bg-green-bright/20' },
  SELL: { label: '매도', className: 'text-red-bright bg-red-bright/20' },
  DIVIDEND: { label: '배당', className: 'text-blue-bright bg-blue-bright/20' },
}

export default function TransactionTypeBadge({ type }: TransactionTypeBadgeProps) {
  const config = BADGE_CONFIG[type]

  return (
    <span
      className={`
        font-mono text-xs tracking-widest
        border px-1.5 py-0.5
        ${config.className}
        border-current
      `}
    >
      {config.label}
    </span>
  )
}
