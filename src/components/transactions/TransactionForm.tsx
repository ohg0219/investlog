'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Stock, TransactionType, TransactionWithStock, PriceQuote } from '@/types'

interface TransactionFormState {
  stock_id: string
  type: TransactionType
  date: string
  quantity: string
  price: string
  amount: string
  memo: string
  password: string
}

interface TransactionFormErrors {
  stock_id?: string
  date?: string
  quantity?: string
  price?: string
  amount?: string
  password?: string
}

interface TransactionFormProps {
  stocks: Stock[]
  editTarget?: TransactionWithStock
  onSuccess: () => void
  onCancel: () => void
}

export default function TransactionForm({
  stocks,
  editTarget,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const router = useRouter()
  const isEdit = !!editTarget

  const initialFormState: TransactionFormState = editTarget
    ? {
        stock_id: editTarget.stock_id,
        type: editTarget.type,
        date: editTarget.date,
        quantity: editTarget.quantity != null ? String(editTarget.quantity) : '',
        price: editTarget.price != null ? String(editTarget.price) : '',
        amount: String(editTarget.amount),
        memo: editTarget.memo ?? '',
        password: '',
      }
    : {
        stock_id: '',
        type: 'BUY',
        date: '',
        quantity: '',
        price: '',
        amount: '',
        memo: '',
        password: '',
      }

  const [formState, setFormState] = useState<TransactionFormState>(initialFormState)
  const [isAmountManual, setIsAmountManual] = useState(false)
  const [formErrors, setFormErrors] = useState<TransactionFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // 선택된 주식 상세 정보
  const selectedStock = stocks.find((s) => s.id === formState.stock_id) ?? null

  // 현재가 상태
  const [currentPrice, setCurrentPrice] = useState<PriceQuote | null>(null)
  const [isPriceLoading, setIsPriceLoading] = useState(false)

  // 주식 선택 시 현재가 조회 (setTimeout으로 지연 실행 — 렌더 사이클 분리)
  useEffect(() => {
    if (!selectedStock) {
      setCurrentPrice(null)
      return
    }

    let cancelled = false

    const fetchPrice = async () => {
      setIsPriceLoading(true)
      try {
        const res = await fetch(`/api/prices?ticker=${encodeURIComponent(selectedStock.ticker)}`)
        if (cancelled) return
        if (res.ok) {
          const data: PriceQuote = await res.json()
          if (!cancelled) setCurrentPrice(data)
        } else {
          if (!cancelled) setCurrentPrice(null)
        }
      } catch {
        if (!cancelled) setCurrentPrice(null)
      } finally {
        if (!cancelled) setIsPriceLoading(false)
      }
    }

    const timerId = setTimeout(fetchPrice, 500)

    return () => {
      cancelled = true
      clearTimeout(timerId)
    }
  }, [formState.stock_id]) // eslint-disable-line react-hooks/exhaustive-deps

  // 수량 × 단가 자동 계산
  useEffect(() => {
    if (isAmountManual || formState.type === 'DIVIDEND') return
    const qty = parseFloat(formState.quantity) || 0
    const pr = parseFloat(formState.price) || 0
    if (qty > 0 && pr > 0) {
      setFormState((prev) => ({ ...prev, amount: String(qty * pr) }))
    }
  }, [formState.quantity, formState.price]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTypeChange = (newType: TransactionType) => {
    if (newType === 'DIVIDEND') {
      setFormState((prev) => ({
        ...prev,
        type: newType,
        quantity: '',
        price: '',
      }))
      setIsAmountManual(false)
    } else {
      setFormState((prev) => ({ ...prev, type: newType }))
      setIsAmountManual(false)
      // 수량/단가로 amount 재계산
      const qty = parseFloat(formState.quantity) || 0
      const pr = parseFloat(formState.price) || 0
      if (qty > 0 && pr > 0) {
        setFormState((prev) => ({ ...prev, type: newType, amount: String(qty * pr) }))
      }
    }
  }

  const handleAmountChange = (value: string) => {
    setIsAmountManual(true)
    setFormState((prev) => ({ ...prev, amount: value }))
  }

  const validate = (): boolean => {
    const errors: TransactionFormErrors = {}

    if (!formState.stock_id) {
      errors.stock_id = '주식을 선택해주세요.'
    }
    if (!formState.date) {
      errors.date = '날짜를 입력해주세요.'
    }
    if (formState.type !== 'DIVIDEND') {
      if (!formState.quantity || parseFloat(formState.quantity) <= 0) {
        errors.quantity = '수량을 입력해주세요.'
      }
      if (!formState.price || parseFloat(formState.price) <= 0) {
        errors.price = '단가를 입력해주세요.'
      }
    }
    if (!formState.amount || parseFloat(formState.amount) <= 0) {
      errors.amount = '금액을 입력해주세요.'
    }
    if (!formState.password) {
      errors.password = '비밀번호를 입력해주세요.'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    if (!validate()) return

    setIsSubmitting(true)
    setSubmitError(null)

    const data = {
      stock_id: formState.stock_id,
      type: formState.type,
      date: formState.date,
      ...(formState.type !== 'DIVIDEND' && {
        quantity: parseFloat(formState.quantity),
        price: parseFloat(formState.price),
      }),
      amount: parseFloat(formState.amount),
      memo: formState.memo || undefined,
    }

    const body = { password: formState.password, data }

    try {
      let res: Response
      if (isEdit && editTarget) {
        res = await fetch(`/api/transactions/${editTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      if (res.ok) {
        onSuccess()
        return
      }

      if (res.status === 401) {
        router.push('/')
        return
      }
      const resData = await res.json().catch(() => ({})) as { error?: string; message?: string }
      if (res.status === 403) {
        setSubmitError('비밀번호가 올바르지 않습니다')
        setFormState((prev) => ({ ...prev, password: '' }))
      } else {
        setSubmitError(resData.message ?? '요청에 실패했습니다. 다시 시도해 주세요.')
      }
    } catch {
      setSubmitError('연결에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const showQuantityPrice = formState.type !== 'DIVIDEND'

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* 주식 선택 */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="form-stock-id"
          className="font-mono text-xs text-warm-mid tracking-widest"
        >
          주식상품 선택 *
        </label>
        <select
          id="form-stock-id"
          aria-label="주식"
          autoFocus
          value={formState.stock_id}
          onChange={(e) => {
            setFormState((prev) => ({ ...prev, stock_id: e.target.value }))
            if (formErrors.stock_id) setFormErrors((prev) => ({ ...prev, stock_id: undefined }))
          }}
          className="
            w-full px-3 py-2
            bg-transparent
            border border-warm-mid/20
            font-mono text-sm text-paper
            focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
            disabled:opacity-50
          "
        >
          <option value="">— 등록된 종목에서 선택</option>
          {stocks.map((stock) => (
            <option key={stock.id} value={stock.id}>
              {stock.name}
            </option>
          ))}
        </select>
        {formErrors.stock_id && (
          <p className="font-mono text-xs text-red-bright">{formErrors.stock_id}</p>
        )}
      </div>

      {/* 선택된 주식 배지 */}
      {selectedStock && (
        <div className="border border-warm-mid/20 px-4 py-3 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs text-paper font-semibold">
              {selectedStock.name}
            </span>
            <span className="font-mono text-xs text-warm-mid">
              {selectedStock.ticker} · {selectedStock.market} · {selectedStock.currency}
            </span>
          </div>
          {isPriceLoading ? (
            <span className="font-mono text-xs text-warm-mid">로딩 중...</span>
          ) : currentPrice ? (
            <span className="font-mono text-sm text-accent">
              {currentPrice.price.toLocaleString()}
            </span>
          ) : null}
        </div>
      )}

      {/* 유형 선택 버튼 3개 */}
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-xs text-warm-mid tracking-widest">거래 유형</span>
        <div className="grid grid-cols-3 gap-2">
          {(['BUY', 'SELL', 'DIVIDEND'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeChange(t)}
              className={`
                py-2.5
                font-mono text-sm tracking-widest
                border border-warm-mid/20
                transition-colors
                focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
                ${formState.type === t
                  ? 'bg-accent text-ink border-accent'
                  : 'text-warm-mid hover:text-paper hover:border-warm-mid/60'
                }
              `}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 날짜 + 수량 (DIVIDEND일 때 날짜만) */}
      <div className={`grid gap-4 ${showQuantityPrice ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {/* 날짜 */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="form-date"
            className="font-mono text-xs text-warm-mid tracking-widest"
          >
            날짜 *
          </label>
          <input
            id="form-date"
            type="date"
            aria-label="날짜"
            value={formState.date}
            onChange={(e) => {
              setFormState((prev) => ({ ...prev, date: e.target.value }))
              if (formErrors.date) setFormErrors((prev) => ({ ...prev, date: undefined }))
            }}
            className="
              w-full px-3 py-2
              bg-transparent
              border border-warm-mid/20
              font-mono text-sm text-paper
              focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
            "
          />
          {formErrors.date && (
            <p className="font-mono text-xs text-red-bright">{formErrors.date}</p>
          )}
        </div>

        {/* 수량 (BUY/SELL only) */}
        {showQuantityPrice && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="form-quantity"
              className="font-mono text-xs text-warm-mid tracking-widest"
            >
              수량 *
            </label>
            <input
              id="form-quantity"
              type="number"
              aria-label="수량"
              min="0"
              value={formState.quantity}
              onChange={(e) => {
                setFormState((prev) => ({ ...prev, quantity: e.target.value }))
                if (formErrors.quantity) setFormErrors((prev) => ({ ...prev, quantity: undefined }))
              }}
              className="
                w-full px-3 py-2
                bg-transparent
                border border-warm-mid/20
                font-mono text-sm text-paper
                focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
              "
            />
            {formErrors.quantity && (
              <p className="font-mono text-xs text-red-bright">{formErrors.quantity}</p>
            )}
          </div>
        )}
      </div>

      {/* 단가 + 금액 */}
      <div className={`grid gap-4 ${showQuantityPrice ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {/* 단가 (BUY/SELL only) */}
        {showQuantityPrice && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="form-price"
              className="font-mono text-xs text-warm-mid tracking-widest"
            >
              단가 *
            </label>
            <input
              id="form-price"
              type="number"
              aria-label="단가"
              min="0"
              value={formState.price}
              onChange={(e) => {
                setFormState((prev) => ({ ...prev, price: e.target.value }))
                if (formErrors.price) setFormErrors((prev) => ({ ...prev, price: undefined }))
              }}
              className="
                w-full px-3 py-2
                bg-transparent
                border border-warm-mid/20
                font-mono text-sm text-paper
                focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
              "
            />
            {formErrors.price && (
              <p className="font-mono text-xs text-red-bright">{formErrors.price}</p>
            )}
          </div>
        )}

        {/* 금액 */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="form-amount"
            className="font-mono text-xs text-warm-mid tracking-widest"
          >
            금액 {isAmountManual ? '(직접 입력)' : showQuantityPrice ? '(자동)' : '*'}
          </label>
          <input
            id="form-amount"
            type="number"
            aria-label="금액"
            min="0"
            value={formState.amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="
              w-full px-3 py-2
              bg-transparent
              border border-warm-mid/20
              font-mono text-sm text-paper
              focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
            "
          />
          {formErrors.amount && (
            <p className="font-mono text-xs text-red-bright">{formErrors.amount}</p>
          )}
        </div>
      </div>

      {/* 메모 */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="form-memo"
          className="font-mono text-xs text-warm-mid tracking-widest"
        >
          메모
        </label>
        <input
          id="form-memo"
          type="text"
          aria-label="메모"
          value={formState.memo}
          onChange={(e) => setFormState((prev) => ({ ...prev, memo: e.target.value }))}
          className="
            w-full px-3 py-2
            bg-transparent
            border border-warm-mid/20
            font-mono text-sm text-paper
            placeholder:text-warm-mid/50
            focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
          "
          placeholder="거래 메모 (선택)"
        />
      </div>

      {/* 구분선 */}
      <div className="border-t border-warm-mid/20 border-dashed" />

      {/* 비밀번호 섹션 */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="form-password"
          className="font-mono text-xs text-warm-mid tracking-widest"
        >
          🔒 PASSWORD
        </label>
        <input
          id="form-password"
          type="password"
          aria-label="비밀번호"
          autoComplete="current-password"
          value={formState.password}
          onChange={(e) => {
            setFormState((prev) => ({ ...prev, password: e.target.value }))
            if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: undefined }))
            if (submitError) setSubmitError(null)
          }}
          disabled={isSubmitting}
          className="
            w-full px-3 py-2
            bg-transparent
            border border-warm-mid/20
            font-mono text-sm text-paper
            focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
            disabled:opacity-50
          "
          style={{ letterSpacing: '4px' }}
        />
        {/* 에러 메시지 (폼 유효성 오류) */}
        {formErrors.password && !submitError && (
          <p className="font-mono text-xs text-red-bright">
            ✕ {formErrors.password}
          </p>
        )}
        {/* 에러 메시지 (서버 응답 오류) */}
        {submitError && (
          <p className="font-mono text-xs text-red-bright" aria-live="polite">
            ✕ {submitError}
          </p>
        )}
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
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
          onClick={handleSubmit}
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
          {isSubmitting ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </div>
  )
}
