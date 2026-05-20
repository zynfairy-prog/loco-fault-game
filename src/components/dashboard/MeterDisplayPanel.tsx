import { useEffect, useRef, useState } from 'react'
import { useDashboardStore } from '@/stores/dashboardStore'
import { METER_NAMES } from '@/types/game-state'

const METER_CONFIG: Record<string, { unit: string; min: number; max: number; warn?: number }> = {
  网压: { unit: 'kV', min: 0, max: 35, warn: 20 },
  电流: { unit: 'A', min: 0, max: 1200, warn: 1000 },
  速度: { unit: 'km/h', min: 0, max: 120 },
  总风压: { unit: 'MPa', min: 0, max: 1.2, warn: 0.6 },
  管压: { unit: 'MPa', min: 0, max: 1.0, warn: 0.35 },
}

function AnimatedValue({ target, decimals }: { target: number; decimals: number }) {
  const [display, setDisplay] = useState(target)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)
  const fromRef = useRef<number>(target)

  useEffect(() => {
    const from = fromRef.current
    const to = target
    if (from === to) return

    const duration = 800
    cancelAnimationFrame(rafRef.current)

    const animate = (now: number) => {
      if (!startRef.current) startRef.current = now
      const elapsed = now - startRef.current
      const t = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (to - from) * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        fromRef.current = to
        startRef.current = 0
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target])

  return <>{display.toFixed(decimals)}</>
}

export function MeterDisplayPanel() {
  const meters = useDashboardStore((state) => state.meters)

  return (
    <div className="grid grid-cols-5 gap-2 p-2">
      {METER_NAMES.map((name) => {
        const cfg = METER_CONFIG[name]
        const value = meters[name] ?? 0
        const isWarn = cfg.warn !== undefined && value < cfg.warn
        const pct = Math.min(Math.max((value - cfg.min) / (cfg.max - cfg.min), 0), 1) * 100
        const decimals = cfg.unit === 'MPa' ? 2 : cfg.unit === 'kV' ? 1 : 0

        return (
          <div
            key={name}
            className="flex flex-col gap-1 p-2 rounded border"
            style={{
              borderColor: isWarn ? 'var(--warn-red)' : 'var(--border-subtle)',
              background: isWarn ? 'rgba(255,59,59,0.06)' : 'var(--bg-surface)',
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{name}</span>
            <span
              className="font-mono font-bold tabular-nums"
              style={{
                fontSize: 18,
                color: isWarn ? 'var(--warn-red)' : 'var(--accent-cyan)',
                lineHeight: 1,
              }}
            >
              <AnimatedValue target={value} decimals={decimals} />
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{cfg.unit}</span>
            {/* bar */}
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ background: 'var(--border-subtle)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: isWarn ? 'var(--warn-red)' : 'var(--accent-cyan)',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
