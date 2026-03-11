export type KpiCardColorVariant = 'accent' | 'pnl' | 'neutral'

export interface KpiCardProps {
  label: string
  value: number
  colorVariant: KpiCardColorVariant
  showArrow?: boolean
  format?: 'currency-krw' | 'currency-usd' | 'number'
}

function resolveValueColor(value: number, variant: KpiCardColorVariant): string {
  if (variant === 'accent' || variant === 'neutral') return 'text-accent'
  if (value > 0) return 'text-green-bright'
  if (value < 0) return 'text-red-bright'
  return 'text-warm-mid'
}

function formatValue(value: number, format: KpiCardProps['format']): string {
  const abs = Math.abs(value)
  if (format === 'currency-usd') {
    return `$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }
  if (format === 'number') {
    return `${abs.toLocaleString('ko-KR')}`
  }
  // default: currency-krw
  return `₩${abs.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
}

function resolveArrow(value: number, showArrow: boolean): string {
  if (!showArrow) return ''
  if (value > 0) return '▲ +'
  if (value < 0) return '▼ '
  return ''
}

export default function KpiCard({
  label,
  value,
  colorVariant,
  showArrow = false,
  format = 'currency-krw',
}: KpiCardProps) {
  const colorClass = resolveValueColor(value, colorVariant)
  const arrow = resolveArrow(value, showArrow)
  const formattedValue = formatValue(value, format)

  return (
    <div className="bg-ink border border-warm-mid/20 p-4 flex flex-col gap-2">
      <p className="font-kr text-xs text-warm-mid">{label}</p>
      <p data-testid="kpi-value" className={`font-mono text-xl ${colorClass}`}>
        {arrow}{formattedValue}
      </p>
    </div>
  )
}
