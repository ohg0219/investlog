'use client'

import { useEffect } from 'react'
import type { Stock, TransactionWithStock } from '@/types'
import TransactionForm from './TransactionForm'

interface TransactionFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  editTarget?: TransactionWithStock
  stocks: Stock[]
  onClose: () => void
}

export default function TransactionFormModal({
  open,
  mode,
  editTarget,
  stocks,
  onClose,
}: TransactionFormModalProps) {
  // Escape 키 처리
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const title = mode === 'create' ? '거래 추가' : '거래 수정'
  const subTitle = mode === 'create' ? 'NEW TRANSACTION' : 'EDIT TRANSACTION'

  return (
    <div
      className="
        fixed inset-0 z-50 flex items-center justify-center bg-ink/70
        animate-in fade-in duration-200
      "
      aria-hidden="false"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="
          w-full max-w-lg mx-4
          bg-ink border border-warm-mid/20
          max-h-[90vh] overflow-y-auto
          animate-in zoom-in-95 duration-200
        "
      >
        {/* modal-strip */}
        <div className="h-1.5 bg-gradient-to-r from-accent via-green-bright to-blue-bright" />

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-mid/20">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-lg text-paper">{title}</h2>
            <span className="font-mono text-xs text-warm-mid tracking-widest">{subTitle}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="
              font-mono text-sm text-warm-mid
              hover:text-paper
              transition-colors
              focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
            "
          >
            ✕
          </button>
        </div>

        {/* 폼 */}
        <TransactionForm
          stocks={stocks}
          editTarget={editTarget}
          onSuccess={onClose}
          onCancel={onClose}
        />
      </div>
    </div>
  )
}
