'use client'

import { useState } from 'react'
import type { Stock, LookupResult } from '@/types'

interface StockFormState {
  ticker: string
  name: string
  market: string
  country: string
  currency: string
  sector: string
  memo: string
}

interface StockFormProps {
  initialData?: Stock | null
  onSubmit: (data: StockFormState) => void
  onCancel: () => void
}

// Yahoo Finance 거래소 코드 → 거래소 식별자 매핑
const EXCHANGE_MAP: Record<string, string> = {
  KSC: 'KRX',
  KOE: 'KOSDAQ',
  NMS: 'NASDAQ',
  NYQ: 'NYSE',
  NGM: 'NASDAQ',
  TYO: 'TSE',
}

// 거래소 → 통화 기본값 매핑
const EXCHANGE_CURRENCY_MAP: Record<string, string> = {
  KRX: 'KRW',
  KOSDAQ: 'KRW',
  NASDAQ: 'USD',
  NYSE: 'USD',
  TSE: 'JPY',
}

function buildInitialState(stock?: Stock | null): StockFormState {
  return {
    ticker: stock?.ticker ?? '',
    name: stock?.name ?? '',
    market: stock?.market ?? '',
    country: stock?.country ?? 'KR',
    currency: stock?.currency ?? '',
    sector: stock?.sector ?? '',
    memo: stock?.memo ?? '',
  }
}

export default function StockForm({ initialData, onSubmit, onCancel }: StockFormProps) {
  const [formState, setFormState] = useState<StockFormState>(() =>
    buildInitialState(initialData)
  )
  const [isLookupLoading, setIsLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<{ ticker?: string; name?: string }>({})

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value }))
    // 에러 초기화
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleLookup = async () => {
    const ticker = formState.ticker.trim()
    if (!ticker) {
      setLookupError('티커를 입력하세요.')
      return
    }
    setLookupError(null)
    setIsLookupLoading(true)
    try {
      const res = await fetch(`/api/prices/lookup?q=${encodeURIComponent(ticker)}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setLookupError(data.message ?? '종목 검색에 실패했습니다. 티커를 직접 입력해 주세요.')
        return
      }
      const results: LookupResult[] = await res.json()
      if (results.length === 0) {
        setLookupError('검색 결과가 없습니다. 티커를 직접 입력해 주세요.')
        return
      }
      const first = results[0]
      const market = EXCHANGE_MAP[first.exchange] ?? first.exchange
      const currency = EXCHANGE_CURRENCY_MAP[market] ?? ''
      setFormState((prev) => ({
        ...prev,
        name: first.name,
        market,
        currency,
      }))
    } catch {
      setLookupError('연결에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsLookupLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errors: { ticker?: string; name?: string } = {}
    if (!formState.ticker.trim()) errors.ticker = '티커를 입력하세요.'
    if (!formState.name.trim()) errors.name = '종목명을 입력하세요.'
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    onSubmit(formState)
  }

  const inputClass = `
    w-full px-3 py-2
    bg-transparent
    border border-warm-mid/20
    font-mono text-sm text-paper
    focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
    transition-colors
    placeholder:text-warm-mid/40
  `

  const labelClass = 'font-mono text-xs text-warm-mid tracking-widest uppercase'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* 티커 */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ticker" className={labelClass}>
          티커
        </label>
        <div className="flex gap-2">
          <input
            id="ticker"
            name="ticker"
            type="text"
            value={formState.ticker}
            onChange={handleChange}
            placeholder="예: AAPL, 005930.KS"
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleLookup}
            disabled={isLookupLoading}
            className="
              px-4 py-2 flex-shrink-0
              bg-ink border border-accent/60 text-accent
              font-mono text-sm tracking-widest
              hover:bg-accent/10
              transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isLookupLoading ? '조회 중...' : '조회'}
          </button>
        </div>
        {(lookupError || formErrors.ticker) && (
          <p className="font-mono text-xs text-red-bright mt-0.5" role="alert">
            {lookupError ?? formErrors.ticker}
          </p>
        )}
      </div>

      {/* 종목명 */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className={labelClass}>
          종목명
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formState.name}
          onChange={handleChange}
          placeholder="예: Apple Inc., 삼성전자"
          className={inputClass}
        />
        {formErrors.name && (
          <p className="font-mono text-xs text-red-bright mt-0.5" role="alert">
            {formErrors.name}
          </p>
        )}
      </div>

      {/* 거래소 */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="market" className={labelClass}>
          거래소
        </label>
        <input
          id="market"
          name="market"
          type="text"
          value={formState.market}
          onChange={handleChange}
          placeholder="예: KRX, NASDAQ, NYSE"
          className={inputClass}
        />
      </div>

      {/* 국가 */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="country" className={labelClass}>
          국가
        </label>
        <select
          id="country"
          name="country"
          value={formState.country}
          onChange={handleChange}
          className={`${inputClass} cursor-pointer`}
        >
          <option value="KR">KR (한국)</option>
          <option value="US">US (미국)</option>
          <option value="JP">JP (일본)</option>
          <option value="기타">기타</option>
        </select>
      </div>

      {/* 통화 */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="currency" className={labelClass}>
          통화
        </label>
        <input
          id="currency"
          name="currency"
          type="text"
          value={formState.currency}
          onChange={handleChange}
          placeholder="예: KRW, USD, JPY"
          className={inputClass}
        />
      </div>

      {/* 업종 */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sector" className={labelClass}>
          업종 (선택)
        </label>
        <input
          id="sector"
          name="sector"
          type="text"
          value={formState.sector}
          onChange={handleChange}
          placeholder="예: Technology, 반도체"
          className={inputClass}
        />
      </div>

      {/* 메모 */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="memo" className={labelClass}>
          메모 (선택)
        </label>
        <input
          id="memo"
          name="memo"
          type="text"
          value={formState.memo}
          onChange={handleChange}
          placeholder="자유 메모"
          className={inputClass}
        />
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="
            px-5 py-2
            font-mono text-sm tracking-widest text-warm-mid
            border border-warm-mid/20
            hover:text-paper hover:border-warm-mid/60
            transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
          "
        >
          취소
        </button>
        <button
          type="submit"
          className="
            px-5 py-2
            bg-accent text-ink
            font-mono text-sm tracking-widest
            hover:bg-accent/80
            transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
          "
        >
          저장
        </button>
      </div>
    </form>
  )
}
