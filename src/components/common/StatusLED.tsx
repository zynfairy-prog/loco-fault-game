import { cn } from '@/lib/utils'
import type { LEDState } from '@/types'

interface StatusLEDProps {
  state?: LEDState
  color?: string
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

const sizeMap = {
  sm: 8,
  md: 12,
  lg: 16,
}

export function StatusLED({ state = 'inactive', color = '#00D4FF', size = 'md', label, className }: StatusLEDProps) {
  const px = sizeMap[size]

  const baseColor = state === 'inactive' ? '#2A2F36' : color
  const glowStyle =
    state === 'active'
      ? { boxShadow: `0 0 8px ${color}, 0 0 2px ${color}` }
      : state === 'warning'
        ? { boxShadow: `0 0 12px ${color}, 0 0 4px ${color}` }
        : {}

  return (
    <div className={cn('flex flex-col items-center gap-0.5', className)}>
      <div
        className={cn(state === 'warning' && 'animate-[pulse-led_1.5s_ease-in-out_infinite]')}
        style={{
          width: px,
          height: px,
          borderRadius: '50%',
          backgroundColor: baseColor,
          ...glowStyle,
          flexShrink: 0,
        }}
        aria-label={label ?? state}
      />
      {label && (
        <span
          className="font-mono leading-none"
          style={{ fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: '0.02em' }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
