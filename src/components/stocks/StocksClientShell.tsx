'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Stock, PriceMap } from '@/types'
import StockGrid from './StockGrid'
import StockFormModal from './StockFormModal'
import PasswordConfirmModal from './PasswordConfirmModal'
import type { WriteAction } from './PasswordConfirmModal'

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

interface PendingWrite {
  action: WriteAction
  stockId?: string
  formData?: StockFormState
}

interface StocksClientShellProps {
  stocks: Stock[]
}

export default function StocksClientShell({ stocks }: StocksClientShellProps) {
  const router = useRouter()

  // 가격 상태
  const [priceMap, setPriceMap] = useState<PriceMap>({})
  const [isPriceLoading, setIsPriceLoading] = useState(true)

  // 폼 모달 상태
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [formModalMode, setFormModalMode] = useState<ModalMode>('create')
  const [editTarget, setEditTarget] = useState<Stock | null>(null)

  // 비밀번호 모달 상태
  const [pwModalOpen, setPwModalOpen] = useState(false)
  const [pendingWrite, setPendingWrite] = useState<PendingWrite | null>(null)

  // 마운트 시 현재가 1회 fetch
  useEffect(() => {
    if (stocks.length === 0) {
      setIsPriceLoading(false)
      return
    }

    const tickers = stocks.map((s) => s.ticker).join(',')

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/prices?tickers=${encodeURIComponent(tickers)}`)
        if (res.status === 401) {
          router.push('/')
          return
        }
        if (!res.ok) return
        const data: PriceMap = await res.json()
        setPriceMap(data)
      } catch {
        // 실패 시 빈 priceMap 유지
      } finally {
        setIsPriceLoading(false)
      }
    }

    fetchPrices()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 핸들러
  const handleAdd = () => {
    setFormModalMode('create')
    setEditTarget(null)
    setFormModalOpen(true)
  }

  const handleEdit = (stock: Stock) => {
    setFormModalMode('edit')
    setEditTarget(stock)
    setFormModalOpen(true)
  }

  const handleDelete = (stockId: string) => {
    setPendingWrite({ action: 'delete', stockId })
    setPwModalOpen(true)
  }

  const handleFormSubmit = (data: StockFormState) => {
    setPendingWrite({
      action: formModalMode,
      stockId: editTarget?.id,
      formData: data,
    })
    setFormModalOpen(false)
    setPwModalOpen(true)
  }

  const handleWriteSuccess = () => {
    setPwModalOpen(false)
    setPendingWrite(null)
    router.refresh()
  }

  const handlePwClose = () => {
    setPwModalOpen(false)
  }

  return (
    <>
      {/* 헤더 */}
      <div className="flex justify-between items-center px-8 pt-8 pb-4">
        <h1 className="font-display text-xl text-paper">주식상품 관리</h1>
        <button
          type="button"
          onClick={handleAdd}
          className="
            px-5 py-2
            bg-accent text-ink
            font-mono text-sm tracking-widest
            hover:bg-accent/80
            transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
          "
        >
          + 종목 추가
        </button>
      </div>

      {/* 그리드 */}
      <div className="px-8 pb-8">
        <StockGrid
          stocks={stocks}
          priceMap={priceMap}
          isPriceLoading={isPriceLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddFirst={handleAdd}
        />
      </div>

      {/* 등록/수정 모달 */}
      <StockFormModal
        open={formModalOpen}
        mode={formModalMode}
        editTarget={editTarget}
        onSubmit={handleFormSubmit}
        onClose={() => setFormModalOpen(false)}
      />

      {/* 비밀번호 확인 모달 */}
      {pendingWrite && (
        <PasswordConfirmModal
          open={pwModalOpen}
          action={pendingWrite.action}
          stockId={pendingWrite.stockId}
          formData={pendingWrite.formData}
          onSuccess={handleWriteSuccess}
          onClose={handlePwClose}
        />
      )}
    </>
  )
}
