import { useDashboardStore } from '@/stores/dashboardStore'

export function TaskBanner() {
  const task = useDashboardStore((state) => state.task)
  const trainState = useDashboardStore((state) => state.trainState)

  const hasTask = task.total > 0
  const pct = hasTask ? Math.round((task.current / task.total) * 100) : 0

  const trainLabel: Record<string, { label: string; color: string }> = {
    idle: { label: '待机', color: 'var(--text-tertiary)' },
    running: { label: '运行中', color: 'var(--status-ok)' },
    emergency_stop: { label: '紧急停车', color: 'var(--warn-red)' },
  }
  const ts = trainLabel[trainState] ?? trainLabel.idle

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 border-b"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
    >
      {/* train state badge */}
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded border flex-shrink-0"
        style={{ borderColor: ts.color, background: `${ts.color}18` }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            background: ts.color,
            boxShadow: trainState === 'emergency_stop' ? `0 0 6px ${ts.color}` : undefined,
          }}
        />
        <span style={{ fontSize: 11, color: ts.color, fontWeight: 600 }}>{ts.label}</span>
      </div>

      {/* task progress */}
      {hasTask ? (
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="truncate" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {task.description}
            </span>
            <span
              className="font-mono flex-shrink-0 ml-2"
              style={{ fontSize: 11, color: 'var(--accent-cyan)' }}
            >
              {task.current}/{task.total}
            </span>
          </div>
          <div
            className="h-1 rounded-full overflow-hidden"
            style={{ background: 'var(--border-subtle)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: 'var(--accent-cyan)' }}
            />
          </div>
        </div>
      ) : (
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>等待 AI 下达任务…</span>
      )}

      {/* history count */}
      {task.history.length > 0 && (
        <span
          className="flex-shrink-0 font-mono px-1.5 py-0.5 rounded"
          style={{ fontSize: 10, color: 'var(--text-tertiary)', background: 'var(--bg-elevated)' }}
          title={task.history.join('\n')}
        >
          已完成 {task.history.length}
        </span>
      )}
    </div>
  )
}
