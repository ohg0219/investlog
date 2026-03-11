'use client'

import { useState, useEffect } from 'react'
import type { TransactionType } from '@/types'
import { useDebounce } from '@/hooks/useDebounce'

export interface FilterState {
  type: TransactionType | 'ALL'
  currency: 'KRW' | 'USD' | 'ALL'
  stockSearch: string
}

interface TransactionFilterBarProps {
  onFilterChange: (filter: FilterState) => void
}

export default function TransactionFilterBar({ onFilterChange }: TransactionFilterBarProps) {
  const [type, setType] = useState<TransactionType | 'ALL'>('ALL')
  const [currency, setCurrency] = useState<'KRW' | 'USD' | 'ALL'>('ALL')
  const [stockSearch, setStockSearch] = useState('')

  const debouncedSearch = useDebounce(stockSearch, 300)

  // type/currency 변경 시 즉시 콜백
  useEffect(() => {
    onFilterChange({ type, currency, stockSearch: debouncedSearch })
  }, [type, currency]) // eslint-disable-line react-hooks/exhaustive-deps

  // 디바운스된 검색어 변경 시 콜백
  useEffect(() => {
    onFilterChange({ type, currency, stockSearch: debouncedSearch })
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-wrap items-center gap-3 px-8 py-3 border-b border-warm-mid/10">
      {/* 유형 select */}
      <div className="flex items-center gap-1.5">
        <label
          htmlFor="filter-type"
          className="font-mono text-xs text-warm-mid tracking-widest sr-only"
        >
          유형
        </label>
        <select
          id="filter-type"
          aria-label="유형"
          value={type}
          onChange={(e) => setType(e.target.value as TransactionType | 'ALL')}
          className="
            bg-transparent
            border border-warm-mid/20
            font-mono text-xs text-paper
            px-3 py-1.5
            focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
            cursor-pointer
          "
        >
          <option value="ALL">유형 전체</option>
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
          <option value="DIVIDEND">DIVIDEND</option>
        </select>
      </div>

      {/* 통화 select */}
      <div className="flex items-center gap-1.5">
        <label
          htmlFor="filter-currency"
          className="font-mono text-xs text-warm-mid tracking-widest sr-only"
        >
          통화
        </label>
        <select
          id="filter-currency"
          aria-label="통화"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as 'KRW' | 'USD' | 'ALL')}
          className="
            bg-transparent
            border border-warm-mid/20
            font-mono text-xs text-paper
            px-3 py-1.5
            focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
            cursor-pointer
          "
        >
          <option value="ALL">통화 전체</option>
          <option value="KRW">KRW</option>
          <option value="USD">USD</option>
        </select>
      </div>

      {/* 종목 검색 input */}
      <div className="flex-1 min-w-[180px]">
        <input
          type="text"
          placeholder="종목 검색"
          value={stockSearch}
          onChange={(e) => setStockSearch(e.target.value)}
          className="
            w-full
            bg-transparent
            border border-warm-mid/20
            font-mono text-xs text-paper
            px-3 py-1.5
            placeholder:text-warm-mid/50
            focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
          "
        />
      </div>
    </div>
  )
}
