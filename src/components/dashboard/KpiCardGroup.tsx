import KpiCard from '@/components/dashboard/KpiCard'
import { DashboardSummary, PriceMap } from '@/types'

interface KpiCardGroupProps {
  kpi: DashboardSummary['kpi']
  priceMap?: PriceMap
}

export default function KpiCardGroup({ kpi, priceMap: _priceMap }: KpiCardGroupProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="총 투자금"
        value={kpi.totalInvested}
        colorVariant="accent"
        showArrow={false}
      />
      <KpiCard
        label="실현 손익"
        value={kpi.realizedPnL}
        colorVariant="pnl"
        showArrow={true}
      />
      <KpiCard
        label="배당 수익"
        value={kpi.dividendIncome}
        colorVariant="neutral"
        showArrow={false}
      />
      <KpiCard
        label="총 수익률"
        value={kpi.totalReturn}
        colorVariant="pnl"
        showArrow={true}
      />
    </div>
  )
}
