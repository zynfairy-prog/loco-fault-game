import { useDashboardStore } from '@/stores/dashboardStore'
import { LED_NAMES } from '@/types/game-state'
import type { LEDState } from '@/types/game-state'
import { cn } from '@/lib/utils'

interface StatusLEDPanelProps {
  onLEDClick?: (ledName: string, state: LEDState) => void
}

export function StatusLEDPanel({ onLEDClick }: StatusLEDPanelProps) {
  const leds = useDashboardStore((state) => state.leds)

  return (
    <div className="grid grid-cols-6 gap-1.5 p-2">
      {LED_NAMES.map((name) => {
        const state: LEDState = (leds[name] as LEDState) ?? 'off'
        return (
          <StatusLEDItem
            key={name}
            name={name}
            state={state}
            onClick={() => onLEDClick?.(name, state)}
          />
        )
      })}
    </div>
  )
}

interface StatusLEDItemProps {
  name: string
  state: LEDState
  onClick?: () => void
}

function StatusLEDItem({ name, state, onClick }: StatusLEDItemProps) {
  const isActive = state === 'on' || state === 'blink'

  return (
    <button
      type="button"
      onClick={onClick}
      title={isActive ? `${name}（点击查询含义）` : `${name}（未亮）`}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1.5 rounded border text-left transition-all duration-150',
        isActive
          ? 'border-[var(--warn-red)] bg-[rgba(255,59,59,0.08)] cursor-pointer hover:bg-[rgba(255,59,59,0.15)]'
          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] cursor-default hover:border-[var(--border-default)]'
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full flex-shrink-0',
          state === 'blink' && 'animate-[led-blink_0.6s_ease-in-out_infinite]'
        )}
        style={
          isActive
            ? { background: 'var(--warn-red)', boxShadow: '0 0 8px var(--warn-red)' }
            : { background: 'var(--border-emphasis)' }
        }
      />
      <span
        className="font-mono truncate"
        style={{
          fontSize: 10,
          color: isActive ? '#ffcccc' : 'var(--text-tertiary)',
          fontWeight: isActive ? 600 : 400,
        }}
      >
        {name}
      </span>
    </button>
  )
}
