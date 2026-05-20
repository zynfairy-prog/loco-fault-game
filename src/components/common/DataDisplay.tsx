import { cn } from '@/lib/utils'

interface DataDisplayProps {
  value: number | string
  unit?: string
  label?: string
  size?: 'sm' | 'md' | 'lg'
  color?: string
  className?: string
}

const sizeConfig = {
  sm: { value: 16, unit: 10, label: 10 },
  md: { value: 24, unit: 12, label: 11 },
  lg: { value: 36, unit: 14, label: 12 },
}

export function DataDisplay({ value, unit, label, size = 'md', color, className }: DataDisplayProps) {
  const cfg = sizeConfig[size]
  const valueColor = color ?? 'var(--accent-cyan)'

  return (
    <div className={cn('flex flex-col items-center gap-0.5', className)}>
      {label && (
        <span style={{ fontSize: cfg.label, color: 'var(--text-tertiary)', fontFamily: 'inherit' }}>
          {label}
        </span>
      )}
      <div className="flex items-baseline gap-1">
        <span
          className="font-mono font-tabular font-semibold leading-none"
          style={{ fontSize: cfg.value, color: valueColor, fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </span>
        {unit && (
          <span
            className="font-mono"
            style={{ fontSize: cfg.unit, color: 'var(--text-secondary)' }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}
