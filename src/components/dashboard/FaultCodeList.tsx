import { useDashboardStore } from '@/stores/dashboardStore'

export function FaultCodeList() {
  const faultCodes = useDashboardStore((state) => state.faultCodes)
  const hasViewedMFD = useDashboardStore((state) => state.facts.hasViewedMFD)

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
          故障代码
        </span>
        {hasViewedMFD === 'YES' && faultCodes.length > 0 && (
          <span
            className="px-1.5 py-0.5 rounded text-xs font-mono"
            style={{ background: 'rgba(255,59,59,0.15)', color: 'var(--warn-red)' }}
          >
            {faultCodes.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {hasViewedMFD === 'NO' ? (
          <div
            className="flex items-center justify-center h-full font-mono"
            style={{ color: 'var(--text-tertiary)', fontSize: 11 }}
          >
            等待查询…
          </div>
        ) : faultCodes.length === 0 ? (
          <div
            className="flex items-center justify-center h-full"
            style={{ color: 'var(--text-tertiary)', fontSize: 11 }}
          >
            无故障代码
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 p-1.5">
            {faultCodes.map((fc, i) => (
              <div
                key={`${fc.code}-${i}`}
                className="flex items-start gap-2 px-2 py-1.5 rounded animate-[slide-in_0.25s_ease-out]"
                style={{ background: 'rgba(255,59,59,0.08)', borderLeft: '2px solid var(--warn-red)' }}
              >
                <span
                  className="font-mono font-bold flex-shrink-0"
                  style={{ fontSize: 11, color: 'var(--warn-red)' }}
                >
                  {fc.code}
                </span>
                <span className="flex-1 min-w-0" style={{ fontSize: 10, color: '#ffcccc', lineHeight: 1.4 }}>
                  {fc.description}
                </span>
                <span
                  className="flex-shrink-0 font-mono"
                  style={{ fontSize: 9, color: 'var(--text-tertiary)' }}
                >
                  {fc.timestamp}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
