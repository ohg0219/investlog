'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Stock, TransactionWithStock, TransactionType } from '@/types'
import { useDebounce } from '@/hooks/useDebounce'
import TransactionFilterBar, { type FilterState } from './TransactionFilterBar'
import TransactionTable from './TransactionTable'
import Pagination from './Pagination'
import TransactionFormModal from './TransactionFormModal'
import PasswordConfirmModal from './PasswordConfirmModal'

const PAGE_SIZE = 10

interface TransactionsClientShellProps {
  initialTransactions: TransactionWithStock[]
  stocks: Stock[]
}

type TransactionModalMode = 'create' | 'edit'

interface PendingDelete {
  transactionId: string
}

export default function TransactionsClientShell({
  initialTransactions,
  stocks,
}: TransactionsClientShellProps) {
  const router = useRouter()

  // 거래 목록 상태
  const [transactions, setTransactions] = useState<TransactionWithStock[]>(initialTransactions)
  const [isLoading, setIsLoading] = useState(false)

  // 필터 상태
  const [filterState, setFilterState] = useState<FilterState>({
    type: 'ALL',
    currency: 'ALL',
    stockSearch: '',
  })

  // 디바운스된 검색어 (stock_id 조회 트리거)
  const debouncedSearch = useDebounce(filterState.stockSearch, 300)

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)

  // 폼 모달 상태
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [formModalMode, setFormModalMode] = useState<TransactionModalMode>('create')
  const [editTarget, setEditTarget] = useState<TransactionWithStock | null>(null)

  // 비밀번호 모달 상태 (삭제 전용)
  const [pwModalOpen, setPwModalOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)

  // 종목 검색 디바운스 후 API 재조회
  useEffect(() => {
    const searchTerm = debouncedSearch.trim()
    if (!searchTerm) {
      setTransactions(initialTransactions)
      setCurrentPage(1)
      return
    }

    // stockSearch로 stock_id 찾아서 재조회
    const matchedStock = stocks.find(
      (s) =>
        s.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (!matchedStock) {
      setTransactions([])
      setCurrentPage(1)
      return
    }

    const fetchFiltered = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/transactions?stock_id=${encodeURIComponent(matchedStock.id)}`)
        if (res.ok) {
          const data = await res.json() as { data: TransactionWithStock[] }
          setTransactions(data.data ?? [])
          setCurrentPage(1)
        }
      } catch {
        // 실패 시 현재 목록 유지
      } finally {
        setIsLoading(false)
      }
    }

    fetchFiltered()
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // 클라이언트 필터링 (유형 / 통화)
  const filteredTransactions = transactions.filter((tx) => {
    if (filterState.type !== 'ALL' && tx.type !== filterState.type) return false
    if (filterState.currency !== 'ALL' && tx.stock.currency !== filterState.currency) return false
    return true
  })

  // 페이지네이션 슬라이스
  const startIdx = (currentPage - 1) * PAGE_SIZE
  const pagedTransactions = filteredTransactions.slice(startIdx, startIdx + PAGE_SIZE)

  // 필터 변경 핸들러
  const handleFilterChange = (filter: FilterState) => {
    setFilterState(filter)
    setCurrentPage(1)
  }

  // 거래 추가 열기
  const handleAdd = () => {
    setFormModalMode('create')
    setEditTarget(null)
    setFormModalOpen(true)
  }

  // 거래 수정 열기
  const handleEdit = (transaction: TransactionWithStock) => {
    setFormModalMode('edit')
    setEditTarget(transaction)
    setFormModalOpen(true)
  }

  // 거래 삭제 열기
  const handleDelete = (transactionId: string) => {
    setPendingDelete({ transactionId })
    setPwModalOpen(true)
  }

  // 폼 모달 성공
  const handleFormSuccess = () => {
    setFormModalOpen(false)
    setEditTarget(null)
    router.refresh()
  }

  // 삭제 성공
  const handleDeleteSuccess = () => {
    setPwModalOpen(false)
    setPendingDelete(null)
    router.refresh()
  }

  return (
    <>
      {/* 헤더 */}
      <div className="flex justify-between items-center px-8 pt-8 pb-4">
        <h1 className="font-display text-xl text-paper">거래 내역 관리</h1>
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
          + 거래 추가
        </button>
      </div>

      {/* 필터 바 */}
      <TransactionFilterBar onFilterChange={handleFilterChange} />

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="px-8 py-4">
          <p className="font-mono text-xs text-warm-mid">조회 중...</p>
        </div>
      )}

      {/* 거래 테이블 */}
      <div className="px-8 py-4">
        <TransactionTable
          transactions={pagedTransactions}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddFirst={handleAdd}
        />
      </div>

      {/* 페이지네이션 (10건 이상일 때) */}
      {filteredTransactions.length > PAGE_SIZE && (
        <Pagination
          total={filteredTransactions.length}
          currentPage={currentPage}
          limit={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      )}

      {/* 거래 추가/수정 폼 모달 */}
      <TransactionFormModal
        open={formModalOpen}
        mode={formModalMode}
        editTarget={editTarget ?? undefined}
        stocks={stocks}
        onClose={handleFormSuccess}
      />

      {/* 삭제 비밀번호 확인 모달 */}
      {pendingDelete && (
        <PasswordConfirmModal
          open={pwModalOpen}
          transactionId={pendingDelete.transactionId}
          onSuccess={handleDeleteSuccess}
          onClose={() => setPwModalOpen(false)}
        />
      )}
    </>
  )
}
