'use client'

interface StockTabProps {
  tickers: string[]
  value: string
  onChange: (ticker: string) => void
}

export default function StockTab({ tickers, value, onChange }: StockTabProps) {
  const tabs = [{ key: 'ALL', label: '전체' }, ...tickers.map((t) => ({ key: t, label: t }))]

  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto pb-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={value === tab.key ? 'true' : 'false'}
          aria-controls="stock-profit-chart-panel"
          onClick={() => onChange(tab.key)}
          className={[
            'font-mono text-xs px-3 py-1 rounded transition-colors',
            value === tab.key
              ? 'bg-accent/20 text-accent font-semibold'
              : 'text-warm-mid hover:text-paper hover:bg-warm-mid/10',
          ].join(' ')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
