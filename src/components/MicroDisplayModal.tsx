import { useEffect, useState } from 'react'
import { useDashboardStore } from '@/stores/dashboardStore'
import type { CIUnit } from '@/types/game-state'

interface Props {
  onCutCI: (message: string) => void
}

export function MicroDisplayModal({ onCutCI }: Props) {
  const ciPanel = useDashboardStore((s) => s.ciPanel)
  const microDisplayOpen = useDashboardStore((s) => s.microDisplayOpen)
  const faultCodes = useDashboardStore((s) => s.faultCodes)
  const dispatch = useDashboardStore((s) => s.dispatch)

  // Scan animation: show spinner for 800ms, then reveal data
  const [scanning, setScanning] = useState(true)
  const [dots, setDots] = useState('.')

  useEffect(() => {
    if (!microDisplayOpen) {
      setScanning(true)
      return
    }
    setScanning(true)
    const dotInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '.' : d + '.'))
    }, 220)
    const revealTimer = setTimeout(() => {
      setScanning(false)
      clearInterval(dotInterval)
    }, 800)
    return () => {
      clearInterval(dotInterval)
      clearTimeout(revealTimer)
    }
  }, [microDisplayOpen])

  if (!microDisplayOpen) return null

  const close = () => dispatch({ type: 'CLOSE_MICRO_DISPLAY' })
  const hasData = ciPanel && ciPanel.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={close}
    >
      <style>{`
        @keyframes mfd-fadein { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
        .mfd-reveal { animation: mfd-fadein 0.4s ease-out both; }
      `}</style>
      <div
        className="rounded-lg flex flex-col max-w-3xl w-[90vw] max-h-[85vh] overflow-hidden"
        style={{
          background: '#0d1117',
          border: '2px solid var(--accent-cyan)',
          boxShadow: '0 0 40px rgba(0,212,255,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(0,212,255,0.3)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full animate-[pulse-led_1.5s_ease-in-out_infinite]"
              style={{ background: 'var(--accent-cyan)' }}
            />
            <span className="font-mono tracking-wider" style={{ color: 'var(--accent-cyan)', fontSize: 14 }}>
              微机显示屏 · CI 变流单元监控
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            className="px-2 py-0.5 rounded transition-colors hover:opacity-70"
            style={{ color: 'var(--text-tertiary)', fontSize: 18, lineHeight: 1 }}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {scanning ? (
            /* Scan animation */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 120, gap: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                border: '3px solid rgba(0,212,255,0.2)',
                borderTopColor: 'var(--accent-cyan)',
                animation: 'spin 0.7s linear infinite',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              <span className="font-mono" style={{ fontSize: 13, color: 'var(--accent-cyan)', letterSpacing: 2 }}>
                扫描中{dots}
              </span>
            </div>
          ) : !hasData ? (
            <div className="mfd-reveal flex flex-col gap-3">
              <div className="font-mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                CI 单元详细数据等待刷新…
              </div>
              {faultCodes.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
                    故障履历
                  </div>
                  {faultCodes.map((fc) => (
                    <div
                      key={fc.code + fc.timestamp}
                      className="font-mono"
                      style={{ fontSize: 12, color: 'var(--warn-amber)' }}
                    >
                      [{fc.timestamp}]&nbsp;&nbsp;{fc.code}&nbsp;&nbsp;{fc.description}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mfd-reveal">
              <p className="mb-4 font-mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                观察各单元的电流和温度，判断哪个单元发生故障，然后切除它。
              </p>
              <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {ciPanel!.map((unit) => (
                  <CIUnitCard
                    key={unit.id}
                    unit={unit}
                    onCut={() => {
                      onCutCI(`我已切除${unit.id}`)
                      close()
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CIUnitCard({ unit, onCut }: { unit: CIUnit; onCut: () => void }) {
  const isFault = unit.status === 'fault'

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-2 font-mono transition-all"
      style={{
        border: `2px solid ${isFault ? 'var(--warn-red)' : 'rgba(61,220,151,0.5)'}`,
        background: isFault ? 'rgba(255,59,59,0.08)' : 'rgba(61,220,151,0.05)',
        boxShadow: isFault ? '0 0 16px rgba(255,59,59,0.35)' : undefined,
      }}
    >
      {/* Title + status dot */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 20, fontWeight: 700, color: '#e0e6ed' }}>{unit.id}</span>
        <span
          className={isFault ? 'animate-[pulse-led_1s_ease-in-out_infinite]' : ''}
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: isFault ? 'var(--warn-red)' : '#3ddc97',
          }}
          title={isFault ? '故障' : '正常'}
        />
      </div>

      {/* Status label */}
      <span style={{ fontSize: 12, color: isFault ? 'var(--warn-red)' : '#3ddc97' }}>
        {isFault ? '⚠ 异常' : '○ 正常'}
      </span>

      {/* Readings */}
      <div className="flex flex-col gap-0.5" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        <span>
          电流：<span style={{ color: 'var(--accent-cyan)' }}>{unit.current}</span> A
        </span>
        <span>
          温度：<span style={{ color: 'var(--accent-cyan)' }}>{unit.temperature}</span> ℃
        </span>
      </div>

      {/* Cut button */}
      <button
        type="button"
        onClick={onCut}
        className="mt-1 w-full py-1.5 rounded border text-xs font-bold tracking-widest transition-all hover:opacity-80"
        style={{
          borderColor: isFault ? 'var(--warn-red)' : 'var(--border-subtle)',
          background: isFault ? 'rgba(255,59,59,0.15)' : 'var(--bg-surface)',
          color: isFault ? 'var(--warn-red)' : 'var(--text-secondary)',
        }}
      >
        切 除 此 单 元
      </button>
    </div>
  )
}
