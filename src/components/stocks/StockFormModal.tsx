'use client'

import type { Stock } from '@/types'
import StockForm from './StockForm'

type ModalMode = 'create' | 'edit'

interface StockFormState {
  ticker: string
  name: string
  market: string
  country: string
  currency: string
  sector: string
  memo: string
}

interface StockFormModalProps {
  open: boolean
  mode: ModalMode
  editTarget: Stock | null
  onSubmit: (data: StockFormState) => void
  onClose: () => void
}

export default function StockFormModal({
  open,
  mode,
  editTarget,
  onSubmit,
  onClose,
}: StockFormModalProps) {
  const title = mode === 'create' ? '종목 추가' : '종목 수정'

  return (
    <>
      {/* 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/60"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* 슬라이드 오버 패널 */}
      <div
        className={`
          fixed top-0 right-0 z-50
          h-full w-full max-w-md
          bg-ink border-l border-warm-mid/20
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
        aria-hidden={!open}
      >
        {open && (
          <>
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-warm-mid/20">
              <h2 className="font-display text-lg text-paper">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="
                  font-mono text-warm-mid text-xl leading-none
                  hover:text-paper
                  transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
                "
                aria-label="모달 닫기"
              >
                ✕
              </button>
            </div>

            {/* 폼 영역 */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <StockForm
                initialData={editTarget}
                onSubmit={onSubmit}
                onCancel={onClose}
              />
            </div>
          </>
        )}
      </div>
    </>
  )
}
