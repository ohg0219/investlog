'use client'

import { useState, useEffect } from 'react'

export type WriteAction = 'create' | 'edit' | 'delete'

interface StockFormState {
  ticker: string
  name: string
  market: string
  country: string
  currency: string
  sector: string
  memo: string
}

interface PasswordConfirmModalProps {
  open: boolean
  action: WriteAction
  stockId?: string
  formData?: StockFormState
  onSuccess: () => void
  onClose: () => void
}

const ACTION_LABEL: Record<WriteAction, string> = {
  create: '등록',
  edit: '수정',
  delete: '삭제',
}

const ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN: '비밀번호가 올바르지 않습니다.',
  LINKED_TRANSACTIONS: '연결된 거래내역이 있어 삭제할 수 없습니다.',
  DUPLICATE_TICKER: '이미 등록된 티커입니다.',
}

export default function PasswordConfirmModal({
  open,
  action,
  stockId,
  formData,
  onSuccess,
  onClose,
}: PasswordConfirmModalProps) {
  const [pwValue, setPwValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  // 모달 닫힘 시 상태 초기화
  useEffect(() => {
    if (!open) {
      setPwValue('')
      setPwError(null)
      setIsSubmitting(false)
    }
  }, [open])

  // Escape 키 처리
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    setPwValue('')
    setPwError(null)
    onClose()
  }

  const handleConfirm = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setPwError(null)

    try {
      let res: Response

      if (action === 'create') {
        res = await fetch('/api/stocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwValue, data: formData }),
        })
      } else if (action === 'edit') {
        res = await fetch(`/api/stocks/${stockId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwValue, data: formData }),
        })
      } else {
        // delete
        res = await fetch(`/api/stocks/${stockId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwValue }),
        })
      }

      if (res.ok) {
        onSuccess()
        return
      }

      // 에러 처리
      const data = await res.json().catch(() => ({})) as { error?: string; message?: string }
      const errorCode = data.error ?? ''
      const errorMsg =
        ERROR_MESSAGES[errorCode] ??
        data.message ??
        '요청에 실패했습니다. 다시 시도해 주세요.'

      setPwError(errorMsg)
      if (res.status === 403) {
        setPwValue('')
      }
    } catch {
      setPwError('연결에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  const actionLabel = ACTION_LABEL[action]
  const dialogId = 'password-confirm-dialog'
  const titleId = 'password-confirm-title'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70"
      aria-hidden="false"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        id={dialogId}
        className="
          w-full max-w-sm mx-4
          bg-ink border border-warm-mid/20
          p-6 flex flex-col gap-5
        "
      >
        {/* 제목 */}
        <div>
          <h2
            id={titleId}
            className="font-display text-lg text-paper"
          >
            비밀번호 확인
          </h2>
          <div className="mt-1 border-b border-warm-mid/20" />
        </div>

        {/* 설명 */}
        <p className="font-mono text-sm text-warm-mid">
          <span className="text-accent">[{actionLabel}]</span> 작업을 위해 비밀번호를 입력해주세요.
        </p>

        {/* 비밀번호 입력 */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="pw-confirm-input"
            className="font-mono text-xs text-warm-mid tracking-widest uppercase"
          >
            비밀번호
          </label>
          <input
            id="pw-confirm-input"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={pwValue}
            onChange={(e) => {
              setPwValue(e.target.value)
              if (pwError) setPwError(null)
            }}
            disabled={isSubmitting}
            className="
              w-full px-3 py-2
              bg-transparent
              border border-warm-mid/20
              font-mono text-sm text-paper
              focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
              transition-colors
              disabled:opacity-50
            "
            style={{ letterSpacing: '4px' }}
          />
          {/* 에러 메시지 */}
          <p
            aria-live="polite"
            className="font-mono text-xs text-red-bright min-h-[1.25rem]"
            style={{ visibility: pwError ? 'visible' : 'hidden' }}
          >
            ✕ {pwError ?? ''}
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="
              px-5 py-2
              font-mono text-sm tracking-widest text-warm-mid
              border border-warm-mid/20
              hover:text-paper hover:border-warm-mid/60
              transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="
              px-5 py-2
              bg-accent text-ink
              font-mono text-sm tracking-widest
              hover:bg-accent/80
              transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isSubmitting ? '처리 중...' : '확인'}
          </button>
        </div>
      </div>
    </div>
  )
}
