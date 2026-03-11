export default function DashboardLoading() {
  return (
    <div className="p-6 lg:p-8 space-y-8 animate-pulse">
      {/* 타이틀 */}
      <div className="h-10 w-32 bg-warm-mid/10" />

      {/* KPI 카드 4개 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-warm-mid/10" />
        ))}
      </div>

      {/* 포트폴리오 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex items-center justify-center">
          <div className="rounded-full bg-warm-mid/10" style={{ width: 160, height: 160 }} />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 bg-warm-mid/10" />
          ))}
        </div>
      </div>

      {/* 최근 거래 */}
      <div className="space-y-2">
        <div className="h-6 w-24 bg-warm-mid/10" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-warm-mid/10" />
        ))}
      </div>
    </div>
  )
}
