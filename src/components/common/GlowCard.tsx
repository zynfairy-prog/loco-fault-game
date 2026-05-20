import { cn } from '@/lib/utils'
import type { ReactNode, CSSProperties } from 'react'

interface GlowCardProps {
  children: ReactNode
  glowColor?: string
  className?: string
  style?: CSSProperties
  alert?: boolean
  title?: string
}

export function GlowCard({ children, glowColor, className, style, alert, title }: GlowCardProps) {
  const glowStyle = glowColor
    ? { boxShadow: `0 0 16px ${glowColor}22, inset 0 0 0 1px ${glowColor}33`, ...style }
    : { ...style }

  return (
    <div
      className={cn(
        'relative rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] overflow-hidden',
        alert && 'animate-[flash-border_0.5s_ease-in-out_infinite]',
        className
      )}
      style={glowStyle}
    >
      {title && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border-subtle)]"
          style={{ background: 'rgba(0,0,0,0.3)' }}
        >
          {glowColor && (
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: glowColor, boxShadow: `0 0 6px ${glowColor}` }}
            />
          )}
          <span
            className="font-mono text-xs tracking-wider uppercase"
            style={{ color: glowColor ?? 'var(--text-secondary)' }}
          >
            {title}
          </span>
        </div>
      )}
      <div className="h-full">{children}</div>
    </div>
  )
}
