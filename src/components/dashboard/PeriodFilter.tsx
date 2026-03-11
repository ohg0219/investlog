'use client'

export type Period = '3M' | '6M' | '1Y' | 'ALL'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '3M',  label: '3개월' },
  { value: '6M',  label: '6개월' },
  { value: '1Y',  label: '1년'   },
  { value: 'ALL', label: '전체'  },
]

interface PeriodFilterProps {
  value: Period
  onChange: (period: Period) => void
}

export default function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <div className="flex gap-1 justify-end">
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={[
            'font-mono text-xs px-3 py-1 rounded transition-colors',
            value === opt.value
              ? 'bg-accent text-surface font-semibold'
              : 'bg-transparent text-warm-mid hover:text-paper hover:bg-warm-mid/10',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
