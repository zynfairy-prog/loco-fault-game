import type { HeatmapData } from '@/types/game-state'

interface MechanicalRoomViewProps {
  heatmapData: HeatmapData | null
}

function getTempColor(intensity: number): string {
  if (intensity <= 30) return '#60A5FA'
  if (intensity <= 50) return '#FCD34D'
  if (intensity <= 70) return '#FB923C'
  return '#EF4444'
}

function getTempOpacity(intensity: number): number {
  if (intensity <= 10) return 0
  if (intensity <= 30) return 0.18
  if (intensity <= 50) return 0.30
  if (intensity <= 70) return 0.45
  return 0.60
}

// Closed converter cabinet with ventilation slots on top
function ConverterCabinet({
  x, y, w, h, label, ciLabels, heatValues,
}: {
  x: number; y: number; w: number; h: number
  label: string; ciLabels: string[]; heatValues: number[]
}) {
  const zoneW = w / ciLabels.length
  return (
    <g>
      {/* Outer shell */}
      <rect x={x} y={y} width={w} height={h} rx={5} fill="#111827" stroke="#374151" strokeWidth={2} />
      {/* Top header bar */}
      <rect x={x} y={y} width={w} height={18} rx={5} fill="#1f2d40" stroke="#374151" strokeWidth={1} />
      {/* Ventilation slots (top area) */}
      {Array.from({ length: 3 }).map((_, i) => (
        <rect
          key={i}
          x={x + 10 + i * (w / 3 - 4)} y={y + 22}
          width={w / 3 - 12} height={10}
          rx={2} fill="#0a0f1a" stroke="#2d3748" strokeWidth={0.75}
        />
      ))}
      {/* Status LED */}
      <circle cx={x + w - 10} cy={y + 9} r={4} fill="#4ade80" style={{ filter: 'drop-shadow(0 0 4px #4ade80)' }} />
      {/* Label */}
      <text x={x + w / 2} y={y + 12} fill="#9ca3af" fontSize={9} fontFamily="monospace" textAnchor="middle">{label}</text>

      {/* Per-unit heat overlays */}
      {ciLabels.map((ci, i) => {
        const intensity = heatValues[i] ?? 0
        const op = getTempOpacity(intensity)
        if (op === 0) return null
        const color = getTempColor(intensity)
        return (
          <rect
            key={ci}
            x={x + zoneW * i + 1} y={y + 1}
            width={zoneW - (i === ciLabels.length - 1 ? 2 : 1)} height={h - 2}
            rx={i === 0 ? 4 : i === ciLabels.length - 1 ? 4 : 0}
            fill={color} fillOpacity={op}
            style={{ pointerEvents: 'none' }}
            className={intensity > 50 ? 'animate-[heat-pulse_1.75s_ease-in-out_infinite]' : ''}
          />
        )
      })}

      {/* Partition dashes between CI zones */}
      {ciLabels.slice(0, -1).map((_, i) => (
        <line
          key={i}
          x1={x + zoneW * (i + 1)} y1={y + 18}
          x2={x + zoneW * (i + 1)} y2={y + h - 4}
          stroke="#374151" strokeWidth={0.75} strokeDasharray="3,3"
        />
      ))}

      {/* CI unit labels at bottom */}
      {ciLabels.map((ci, i) => (
        <text
          key={ci}
          x={x + zoneW * i + zoneW / 2} y={y + h - 6}
          fill="#6b7280" fontSize={8} fontFamily="monospace" textAnchor="middle"
        >
          {ci}
        </text>
      ))}
    </g>
  )
}

// Insulator (porcelain bushing) — stacked discs
function Insulator({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Top terminal */}
      <rect x={x - 2} y={y - 14} width={4} height={8} rx={1} fill="#6b7280" />
      {/* Discs */}
      {[0, 7, 14].map((dy) => (
        <ellipse key={dy} cx={x} cy={y - dy} rx={7 - dy * 0.1} ry={3} fill="#9ca3af" stroke="#6b7280" strokeWidth={0.5} />
      ))}
      {/* Base */}
      <rect x={x - 4} y={y + 2} width={8} height={4} rx={1} fill="#6b7280" />
    </g>
  )
}

// Main transformer: closed box + 3 prominent insulators on top + cooling fins
function TransformerBody({ x, y, intensity }: { x: number; y: number; intensity: number }) {
  const w = 130; const h = 175
  const op = getTempOpacity(intensity)
  const color = getTempColor(intensity)
  return (
    <g>
      {/* 3 insulators protruding above the box */}
      <Insulator x={x + 25} y={y - 2} />
      <Insulator x={x + 65} y={y - 2} />
      <Insulator x={x + 105} y={y - 2} />

      {/* Outer shell */}
      <rect x={x} y={y} width={w} height={h} rx={5} fill="#111827" stroke="#4b5563" strokeWidth={2} />
      {/* Top header */}
      <rect x={x} y={y} width={w} height={18} rx={5} fill="#1f2d40" stroke="#4b5563" strokeWidth={1} />
      {/* Horizontal ribs */}
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={i} x1={x + 8} y1={y + 28 + i * 26} x2={x + w - 8} y2={y + 28 + i * 26} stroke="#2d3748" strokeWidth={1} />
      ))}
      {/* Cooling fins on right */}
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={i} x={x + w} y={y + 20 + i * 22} width={10} height={14} rx={1} fill="#0a0f1a" stroke="#374151" strokeWidth={0.75} />
      ))}
      {/* Label */}
      <text x={x + w / 2} y={y + 12} fill="#9ca3af" fontSize={9} fontFamily="monospace" textAnchor="middle">主变压器</text>

      {/* Heat overlay */}
      {op > 0 && (
        <rect
          x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx={4}
          fill={color} fillOpacity={op}
          style={{ pointerEvents: 'none' }}
          className={intensity > 50 ? 'animate-[heat-pulse_1.75s_ease-in-out_infinite]' : ''}
        />
      )}
    </g>
  )
}

// Motor connection box with protruding terminal posts
function MotorBox({ x, y, intensity }: { x: number; y: number; intensity: number }) {
  const op = getTempOpacity(intensity)
  const color = getTempColor(intensity)
  return (
    <g>
      <rect x={x} y={y} width={80} height={75} rx={4} fill="#111827" stroke="#4b5563" strokeWidth={1.5} />
      <rect x={x} y={y} width={80} height={14} rx={4} fill="#1f2d40" stroke="#4b5563" strokeWidth={1} />
      {/* Terminal posts */}
      {Array.from({ length: 4 }).map((_, i) => (
        <g key={i}>
          <rect x={x + 10 + i * 16} y={y + 22} width={10} height={32} rx={2} fill="#2d3748" stroke="#4b5563" strokeWidth={0.75} />
          {/* Post cap */}
          <circle cx={x + 15 + i * 16} cy={y + 22} r={5} fill="#374151" stroke="#6b7280" strokeWidth={0.75} />
        </g>
      ))}
      <text x={x + 40} y={y + 10} fill="#9ca3af" fontSize={8} fontFamily="monospace" textAnchor="middle">连接盒</text>
      {op > 0 && (
        <rect x={x + 1} y={y + 1} width={78} height={73} rx={3}
          fill={color} fillOpacity={op} style={{ pointerEvents: 'none' }}
          className={intensity > 50 ? 'animate-[heat-pulse_1.75s_ease-in-out_infinite]' : ''}
        />
      )}
    </g>
  )
}

// High-voltage cable with heat glow
function HVCable({
  x1, y1, x2, y2, label, intensity,
}: { x1: number; y1: number; x2: number; y2: number; label: string; intensity: number }) {
  const isHot = intensity > 10
  const color = isHot ? getTempColor(intensity) : '#374151'
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  return (
    <g>
      {/* Glow halo for hot cables */}
      {isHot && (
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color} strokeWidth={14} strokeLinecap="round"
          strokeOpacity={0.25}
          className="animate-[heat-pulse_1.75s_ease-in-out_infinite]"
        />
      )}
      {/* Shadow */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeWidth={8} strokeLinecap="round" />
      {/* Main cable */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth={6} strokeLinecap="round"
      />
      <text x={mx} y={my - 9} fill="#4b5563" fontSize={7} fontFamily="monospace" textAnchor="middle">{label}</text>
    </g>
  )
}

function HeatLegend({ x, y }: { x: number; y: number }) {
  const entries = [
    { label: '正常', color: '#374151', opacity: 1 },
    { label: '偏温', color: '#60A5FA', opacity: 0.7 },
    { label: '发热', color: '#FB923C', opacity: 0.7 },
    { label: '高温', color: '#EF4444', opacity: 0.7 },
  ]
  return (
    <g>
      <rect x={x - 4} y={y - 4} width={52} height={72} rx={3} fill="#0a0f1a" stroke="#374151" strokeWidth={0.75} />
      <text x={x + 4} y={y + 8} fill="#6b7280" fontSize={7} fontFamily="monospace">热区</text>
      {entries.map(({ label, color, opacity }, i) => (
        <g key={label}>
          <rect x={x} y={y + 14 + i * 13} width={8} height={8} rx={1} fill={color} fillOpacity={opacity} />
          <text x={x + 12} y={y + 21 + i * 13} fill="#6b7280" fontSize={7} fontFamily="monospace">{label}</text>
        </g>
      ))}
    </g>
  )
}

export function MechanicalRoomView({ heatmapData }: MechanicalRoomViewProps) {
  const hm = heatmapData ?? {
    CI1: 0, CI2: 0, CI3: 0, CI4: 0, CI5: 0, CI6: 0,
    CABLE_TR_CI: 0, CABLE_CI_MOTOR: 0, TRANSFORMER: 0, MOTOR_BOX: 0,
  }

  const cab1X = 20; const cab2X = 175
  const cabY = 50; const cabW = 135; const cabH = 185
  const trX = 340; const trY = 50
  const motorX = 570; const motorY = 90

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden border"
      style={{ background: '#080d16', borderColor: '#1f2937', minHeight: 140 }}
    >
      <div className="absolute top-2 left-3 z-10 text-[10px] text-gray-500 font-mono uppercase tracking-widest">
        机械室全景 · 高压设备区
      </div>

      <svg viewBox="0 0 720 260" className="w-full" style={{ display: 'block' }}>
        <rect width="720" height="260" fill="#080d16" />
        <line x1="10" y1="248" x2="710" y2="248" stroke="#1f2937" strokeWidth={1} />

        {/* Cables drawn first (behind equipment) */}
        <HVCable
          x1={cab1X + cabW} y1={cabY + cabH / 2}
          x2={trX} y2={trY + 100}
          label="变压器→CI 高压线"
          intensity={hm.CABLE_TR_CI}
        />
        <HVCable
          x1={trX + 130 + 10} y1={trY + 110}
          x2={motorX} y2={motorY + 37}
          label="CI→电机电缆"
          intensity={hm.CABLE_CI_MOTOR}
        />

        {/* CI1-CI3 cabinet */}
        <ConverterCabinet
          x={cab1X} y={cabY} w={cabW} h={cabH}
          label="变流柜 CI1-CI3"
          ciLabels={['CI1', 'CI2', 'CI3']}
          heatValues={[hm.CI1, hm.CI2, hm.CI3]}
        />

        {/* CI4-CI6 cabinet */}
        <ConverterCabinet
          x={cab2X} y={cabY} w={cabW} h={cabH}
          label="变流柜 CI4-CI6"
          ciLabels={['CI4', 'CI5', 'CI6']}
          heatValues={[hm.CI4, hm.CI5, hm.CI6]}
        />

        {/* Main transformer */}
        <TransformerBody x={trX} y={trY} intensity={hm.TRANSFORMER} />
        <text x={trX + 65} y={trY + 195} fill="#6b7280" fontSize={8} fontFamily="monospace" textAnchor="middle">主变压器</text>

        {/* Motor box */}
        <MotorBox x={motorX} y={motorY} intensity={hm.MOTOR_BOX} />
        <text x={motorX + 40} y={motorY + 90} fill="#6b7280" fontSize={8} fontFamily="monospace" textAnchor="middle">电机连接盒</text>

        {/* Legend */}
        <HeatLegend x={660} y={18} />
      </svg>
    </div>
  )
}
