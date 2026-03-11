'use client'

import KpiCardGroup from '@/components/dashboard/KpiCardGroup'
import PortfolioPieChart from '@/components/dashboard/PortfolioPieChart'
import HoldingsList from '@/components/dashboard/HoldingsList'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import type { DashboardSummary, TransactionWithStock } from '@/types'

interface DashboardClientShellProps {
  summary: DashboardSummary | null
  transactions: TransactionWithStock[] | null
}

function DataErrorMessage() {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <p className="font-mono text-xs text-red-bright/80">데이터를 불러올 수 없습니다.</p>
      <button
        onClick={() => window.location.reload()}
        className="font-mono text-xs text-accent hover:text-accent/70 transition-colors"
      >
        새로고침
      </button>
    </div>
  )
}

export default function DashboardClientShell({
  summary,
  transactions,
}: DashboardClientShellProps) {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-display text-paper text-4xl">대시보드</h1>

      {/* KPI 섹션 */}
      {summary !== null ? (
        <KpiCardGroup kpi={summary.kpi} />
      ) : (
        <DataErrorMessage />
      )}

      {/* 포트폴리오 섹션 */}
      {summary !== null && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PortfolioPieChart items={summary.portfolio} />
          <HoldingsList items={summary.portfolio} />
        </div>
      )}

      {/* 최근 거래 섹션 */}
      {transactions !== null ? (
        <RecentTransactions transactions={transactions.slice(0, 5)} />
      ) : (
        <DataErrorMessage />
      )}
    </div>
  )
}
