import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface GridBackgroundProps {
  children: ReactNode
  className?: string
}

export function GridBackground({ children, className }: GridBackgroundProps) {
  return (
    <div className={cn('relative', className)}>
      <div
        className="absolute inset-0 bg-grid-dot pointer-events-none"
        style={{
          backgroundSize: '24px 24px',
          maskImage:
            'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        }}
        aria-hidden="true"
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  )
}
