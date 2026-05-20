import { useState } from 'react'
import type { GSId, GSPosition } from '@/types/game-state'

interface GSKnobProps {
  id: GSId
  label: string
  position: GSPosition
  interactive: boolean
  onPositionChange: (id: GSId, from: GSPosition, to: GSPosition) => void
}

const POSITION_ANGLES: Record<GSPosition, number> = {
  run: 0,       // 12 o'clock
  disconnect: 135, // 4 o'clock
  ground: 225,  // 8 o'clock
}

const POSITION_LABELS: Record<GSPosition, string> = {
  run: '运行',
  disconnect: '分闸',
  ground: '接地',
}

const POSITION_COLORS: Record<GSPosition, string> = {
  run: '#22d3ee',
  disconnect: '#fbbf24',
  ground: '#ef4444',
}

export function GSKnob({ id, label, position, interactive, onPositionChange }: GSKnobProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [displayAngle, setDisplayAngle] = useState(POSITION_ANGLES[position])

  function handleClick() {
    if (!interactive) {
      alert('现在不是调查模式，无法操作 GS 旋钮。')
      return
    }
    if (animating) return
    setMenuOpen(true)
  }

  function handleSelect(target: GSPosition) {
    setMenuOpen(false)
    if (target === position) return

    // Enforce: cannot jump from run directly to ground
    if (position === 'run' && target === 'ground') {
      alert('必须经过分闸位，不能从运行位直接切到接地位。')
      return
    }
    if (position === 'ground' && target === 'run') {
      alert('必须经过分闸位，不能从接地位直接切到运行位。')
      return
    }

    setAnimating(true)
    const targetAngle = POSITION_ANGLES[target]
    setDisplayAngle(targetAngle)

    setTimeout(() => {
      setAnimating(false)
      onPositionChange(id, position, target)
    }, 700)
  }

  const knobColor = POSITION_COLORS[position]
  const isGround = position === 'ground'

  return (
    <div className="relative flex flex-col items-center gap-1 select-none">
      {/* Position markers */}
      <div className="relative w-14 h-14">
        {/* Marker labels at 12/4/8 o'clock */}
        <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 text-[9px] text-gray-400 whitespace-nowrap">运行</span>
        <span className="absolute bottom-1 right-0 translate-x-4 text-[9px] text-gray-400 whitespace-nowrap">分闸</span>
        <span className="absolute bottom-1 left-0 -translate-x-4 text-[9px] text-gray-400 whitespace-nowrap">接地</span>

        {/* Knob body */}
        <button
          onClick={handleClick}
          className={[
            'w-14 h-14 rounded-full border-2 flex items-center justify-center',
            'transition-all duration-200',
            interactive ? 'cursor-pointer hover:brightness-125' : 'cursor-not-allowed opacity-60',
            isGround ? 'border-red-500' : 'border-gray-500',
          ].join(' ')}
          style={{
            background: `radial-gradient(circle at 40% 35%, #4a5568, #1a202c)`,
            boxShadow: isGround
              ? `0 0 10px ${knobColor}88, inset 0 2px 4px rgba(255,255,255,0.1)`
              : `inset 0 2px 4px rgba(255,255,255,0.1)`,
          }}
          title={`${id} - ${POSITION_LABELS[position]}`}
        >
          {/* Indicator slot */}
          <div
            className="w-1.5 h-5 rounded-full transition-transform"
            style={{
              background: knobColor,
              transform: `rotate(${displayAngle}deg)`,
              transformOrigin: 'center center',
              transition: animating ? 'transform 0.7s cubic-bezier(0.4,0,0.2,1)' : 'none',
              boxShadow: `0 0 6px ${knobColor}`,
            }}
          />
          {/* Lock icon when grounded */}
          {isGround && (
            <span className="absolute top-0.5 right-0.5 text-[10px]">🔒</span>
          )}
        </button>
      </div>

      {/* ID label */}
      <div className="text-center">
        <div className="text-xs font-bold text-cyan-300">{id}</div>
        <div className="text-[9px] text-gray-400">{label}</div>
        <div
          className="text-[9px] font-medium mt-0.5"
          style={{ color: knobColor }}
        >
          {POSITION_LABELS[position]}
        </div>
      </div>

      {/* Position selection menu */}
      {menuOpen && (
        <div
          className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-600 rounded-lg shadow-xl p-2 min-w-[100px]"
          onMouseLeave={() => setMenuOpen(false)}
        >
          <div className="text-[10px] text-gray-400 mb-1 text-center">{id} 切换到：</div>
          {(['run', 'disconnect', 'ground'] as GSPosition[]).map((pos) => {
            const disabled =
              (position === 'run' && pos === 'ground') ||
              (position === 'ground' && pos === 'run') ||
              pos === position
            return (
              <button
                key={pos}
                onClick={() => !disabled && handleSelect(pos)}
                disabled={disabled}
                className={[
                  'w-full text-left px-2 py-1 rounded text-xs transition-colors',
                  disabled
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-gray-200 hover:bg-gray-700 cursor-pointer',
                  pos === position ? 'font-bold' : '',
                ].join(' ')}
                style={{ color: disabled ? undefined : POSITION_COLORS[pos] }}
              >
                {POSITION_LABELS[pos]}
                {pos === position && ' ✓'}
                {position === 'run' && pos === 'ground' && ' (需先分闸)'}
                {position === 'ground' && pos === 'run' && ' (需先分闸)'}
              </button>
            )
          })}
          <button
            onClick={() => setMenuOpen(false)}
            className="w-full text-center text-[10px] text-gray-500 hover:text-gray-300 mt-1 pt-1 border-t border-gray-700"
          >
            取消
          </button>
        </div>
      )}
    </div>
  )
}
