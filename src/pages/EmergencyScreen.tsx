import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { GlowCard } from '@/components/common/GlowCard'
import { GridBackground } from '@/components/common/GridBackground'
import { ScanlineOverlay } from '@/components/common/ScanlineOverlay'
import { StatusLED } from '@/components/common/StatusLED'
import { ChatBox } from '@/components/chat/ChatBox'
import { useCozeChat } from '@/hooks/useCozeChat'
import { useBroadcastSync } from '@/hooks/useBroadcastSync'
import { useGameStore } from '@/stores/gameStore'
import { getRoleColor } from '@/lib/utils'
import type { LEDState } from '@/types'

const FAULT_HISTORY = [
  { code: 'E0612', desc: 'CI1变流柜IGBT过温', time: '14:23:05', level: 'critical' },
  { code: 'E0401', desc: '1号牵引电机过热', time: '14:23:07', level: 'high' },
  { code: 'W0201', desc: '网压波动超限', time: '14:22:51', level: 'warn' },
  { code: 'I0101', desc: '速度传感器信号弱', time: '14:21:30', level: 'info' },
]

const CREW_INFO = {
  trainNo: 'K1234',
  driver: '张三 (ZS-0892)',
  codriver: '李四 (LS-0341)',
  route: '北京 → 上海',
  departure: '13:45',
  position: '距前方站 12.3km',
}

const LED_LABELS = [
  'T1过热', 'T2过热', 'T3过热', 'T4过热', 'T5过热', 'T6过热',
  'CI1故障', 'CI2故障', 'CI3故障', 'CI4故障', 'CI5故障', 'CI6故障',
  '网压低', '网压高', '过流', '欠压', '接地', '短路',
  '制动异常', '风压低', '管压低', '蓄电池', '辅变故障', '受弓故障',
  '轴温1', '轴温2', '轴温3', '轴温4', '微机故障', '通信中断',
]

const LED_STATES: LEDState[] = LED_LABELS.map((_, i) =>
  i === 6 ? 'warning' : i < 3 ? 'active' : 'inactive'
)

function generateDataPoint(prev: Record<string, number>) {
  return {
    t: Date.now(),
    网压: Math.max(20, Math.min(30, (prev.网压 ?? 25) + (Math.random() - 0.5) * 0.4)),
    电流: Math.max(800, Math.min(1800, (prev.电流 ?? 1200) + (Math.random() - 0.5) * 80)),
    速度: Math.max(60, Math.min(120, (prev.速度 ?? 87) + (Math.random() - 0.5) * 3)),
    温度: Math.max(60, Math.min(120, (prev.温度 ?? 85) + (Math.random() - 0.5) * 2)),
  }
}

export function EmergencyScreen() {
  const [searchParams] = useSearchParams()
  const faultId = searchParams.get('fault') ?? 'F007'
  const chat = useCozeChat({ systemPrefix: '【我是应急台】', storageKey: `coze_conv_emergency_${faultId}`, contextPrefix: `[当前剧本: ${faultId}] [玩家角色: 应急台]` })
  const sentRef = useRef(false)
  const { faultAlertActive } = useGameStore()

  // Listen for store broadcasts from the driver window
  useBroadcastSync(false)
  const [chartData, setChartData] = useState(() => {
    const initial: ReturnType<typeof generateDataPoint>[] = []
    let prev = { 网压: 25, 电流: 1200, 速度: 87, 温度: 85 }
    for (let i = 0; i < 30; i++) {
      const pt = generateDataPoint(prev)
      initial.push(pt)
      prev = pt
    }
    return initial
  })
  const [trainPos, setTrainPos] = useState(0.3)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (sentRef.current) return
    sentRef.current = true
    chat.send(`我已选定挑战故障 ${faultId}，扮演应急台角色，请告诉我 CMD 数据状态`)
  }, [faultId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setChartData((prev) => {
        const last = prev[prev.length - 1]
        const next = generateDataPoint(last)
        return [...prev.slice(-59), next]
      })
      setTrainPos((p) => (p + 0.002) % 1)
    }, 500)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const levelColor = (level: string) =>
    level === 'critical'
      ? 'var(--warn-red)'
      : level === 'high'
        ? 'var(--warn-orange)'
        : level === 'warn'
          ? 'var(--warn-yellow)'
          : 'var(--text-tertiary)'

  return (
    <GridBackground
      className="h-screen flex flex-col overflow-hidden"
    >
      <ScanlineOverlay />
      <div
        className="h-full flex flex-col p-2 gap-2"
        style={{
          outline: faultAlertActive ? '2px solid var(--warn-red)' : 'none',
          boxShadow: faultAlertActive ? '0 0 30px rgba(255,59,59,0.4) inset' : 'none',
        }}
      >
        {/* Header bar */}
        <div
          className="flex items-center gap-4 px-3 py-1.5 rounded border flex-shrink-0"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="w-2 h-2 rounded-full animate-[pulse-led_1.5s_ease-in-out_infinite]"
            style={{ background: 'var(--warn-yellow)', boxShadow: '0 0 8px var(--warn-yellow)' }} />
          <span className="font-mono font-semibold text-sm tracking-wider" style={{ color: 'var(--warn-yellow)' }}>
            应急指挥台
          </span>
          <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
            EMERGENCY COMMAND CENTER
          </span>
          <div className="flex-1" />
          <span className="font-mono text-xs" style={{ color: 'var(--warn-red)' }}>
            ● 故障处置中
          </span>
          <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
            {new Date().toTimeString().slice(0, 8)}
          </span>
        </div>

        {/* 3×3 Grid */}
        <div className="grid grid-cols-3 gap-2 flex-1 min-h-0" style={{ gridTemplateRows: '1fr 1fr' }}>
          {/* [0,0] 车辆位置地图 */}
          <GlowCard title="车辆位置" glowColor="var(--accent-cyan)" className="overflow-hidden">
            <div className="p-2 h-full">
              <TrackMap trainPos={trainPos} />
            </div>
          </GlowCard>

          {/* [0,1] 实时数据曲线 */}
          <GlowCard title="实时数据曲线" glowColor="var(--status-active)" className="overflow-hidden">
            <div className="p-2 h-full flex flex-col gap-1">
              <div className="flex gap-3 flex-shrink-0">
                {[
                  { key: '网压', color: '#00D4FF', unit: 'kV' },
                  { key: '电流', color: '#FFB800', unit: 'A' },
                  { key: '速度', color: '#3FB950', unit: 'km/h' },
                  { key: '温度', color: '#FF3B3B', unit: '°C' },
                ].map((s) => (
                  <div key={s.key} className="flex items-center gap-1">
                    <div className="w-3 h-0.5 rounded" style={{ background: s.color }} />
                    <span className="font-mono text-xs" style={{ color: s.color, fontSize: 10 }}>
                      {s.key}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <XAxis dataKey="t" hide />
                    <YAxis tick={{ fontSize: 9, fill: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        fontSize: 11,
                        fontFamily: 'JetBrains Mono',
                      }}
                      labelFormatter={() => ''}
                    />
                    <Line type="monotone" dataKey="网压" stroke="#00D4FF" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                    <Line type="monotone" dataKey="电流" stroke="#FFB800" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                    <Line type="monotone" dataKey="速度" stroke="#3FB950" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                    <Line type="monotone" dataKey="温度" stroke="#FF3B3B" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlowCard>

          {/* [0,2] 故障代码履历 */}
          <GlowCard title="故障代码履历" glowColor="var(--warn-red)" className="overflow-hidden">
            <div className="p-2 overflow-y-auto h-full">
              {FAULT_HISTORY.map((f, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 py-1.5 border-b"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: levelColor(f.level), boxShadow: `0 0 4px ${levelColor(f.level)}` }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold" style={{ color: levelColor(f.level) }}>
                        {f.code}
                      </span>
                      <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {f.time}
                      </span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {f.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>

          {/* [1,0] 机班信息卡 */}
          <GlowCard title="机班信息" glowColor="var(--role-emergency)" className="overflow-hidden">
            <div className="p-3 space-y-2">
              {Object.entries(CREW_INFO).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {k === 'trainNo' ? '车次' : k === 'driver' ? '主司机' : k === 'codriver' ? '副司机' : k === 'route' ? '线路' : k === 'departure' ? '发车' : '位置'}
                  </span>
                  <span
                    className="font-mono text-xs font-semibold"
                    style={{ color: k === 'position' ? 'var(--warn-yellow)' : 'var(--text-primary)' }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </GlowCard>

          {/* [1,1] HXD3 整车示意 */}
          <GlowCard title="HXD3 整车示意" glowColor="var(--accent-cyan)" className="overflow-hidden">
            <div className="p-2 h-full flex items-center justify-center">
              <HXD3Schematic />
            </div>
          </GlowCard>

          {/* [1,2] 状态指示屏 */}
          <GlowCard title="状态指示屏" glowColor="var(--accent-cyan-dim)" className="overflow-hidden">
            <div className="p-2 grid grid-cols-6 gap-1.5">
              {LED_LABELS.map((label, i) => (
                <StatusLED
                  key={label}
                  state={LED_STATES[i]}
                  color={
                    LED_STATES[i] === 'warning'
                      ? 'var(--warn-red)'
                      : LED_STATES[i] === 'active'
                        ? 'var(--status-ok)'
                        : undefined
                  }
                  size="sm"
                  label={label}
                />
              ))}
            </div>
          </GlowCard>
        </div>

        {/* Bottom row: Chat full width */}
        <div
          className="flex-shrink-0 rounded-lg border overflow-hidden"
          style={{ height: 180, borderColor: 'var(--border-default)', background: 'var(--bg-elevated)' }}
        >
          <ChatBox
            messages={chat.messages}
            isLoading={chat.isLoading}
            streamingText={chat.streamingText}
            onSend={chat.send}
            title="向司机发送处置建议"
            accentColor={getRoleColor('emergency')}
            className="h-full"
          />
        </div>
      </div>
    </GridBackground>
  )
}

function TrackMap({ trainPos }: { trainPos: number }) {
  const trackPoints = [
    [30, 120], [100, 80], [200, 60], [320, 55], [440, 70], [540, 100], [620, 130],
  ]
  const pathD = trackPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')

  const idx = Math.floor(trainPos * (trackPoints.length - 1))
  const t = (trainPos * (trackPoints.length - 1)) % 1
  const p1 = trackPoints[Math.min(idx, trackPoints.length - 2)]
  const p2 = trackPoints[Math.min(idx + 1, trackPoints.length - 1)]
  const tx = p1[0] + (p2[0] - p1[0]) * t
  const ty = p1[1] + (p2[1] - p1[1]) * t

  return (
    <svg viewBox="0 0 660 180" className="w-full h-full">
      {/* Grid lines */}
      {[0, 1, 2, 3].map((i) => (
        <line key={`h${i}`} x1="0" y1={40 + i * 40} x2="660" y2={40 + i * 40}
          stroke="var(--border-subtle)" strokeWidth="0.5" />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={`v${i}`} x1={110 * i} y1="0" x2={110 * i} y2="180"
          stroke="var(--border-subtle)" strokeWidth="0.5" />
      ))}
      {/* Track */}
      <path d={pathD} stroke="var(--border-emphasis)" strokeWidth="3" fill="none" />
      <path d={pathD} stroke="var(--accent-cyan)" strokeWidth="1.5" fill="none" opacity="0.6" />
      {/* Stations */}
      {trackPoints.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="5" fill="var(--bg-elevated)" stroke="var(--border-emphasis)" strokeWidth="1.5" />
          <text x={p[0]} y={p[1] - 10} textAnchor="middle" fontSize="8"
            fill="var(--text-tertiary)" fontFamily="JetBrains Mono, monospace">
            {['北京', '廊坊', '天津', '沧州', '德州', '济南', '上海'][i]}
          </text>
        </g>
      ))}
      {/* Train icon with pulse */}
      <circle cx={tx} cy={ty} r="12" fill="rgba(255,184,0,0.15)"
        stroke="var(--warn-yellow)" strokeWidth="1.5"
        className="animate-[pulse-led_1.5s_ease-in-out_infinite]" />
      <circle cx={tx} cy={ty} r="5" fill="var(--warn-yellow)"
        style={{ boxShadow: '0 0 8px var(--warn-yellow)' }} />
      <text x={tx} y={ty + 24} textAnchor="middle" fontSize="9"
        fill="var(--warn-yellow)" fontFamily="JetBrains Mono, monospace">
        K1234
      </text>
    </svg>
  )
}

function HXD3Schematic() {
  return (
    <svg viewBox="0 0 500 120" fill="none" className="w-full" style={{ maxHeight: 100 }}>
      <rect x="30" y="20" width="440" height="60" rx="3" stroke="var(--accent-cyan)" strokeWidth="1.2" />
      <path d="M30 80 L30 20 L80 5 L120 20" stroke="var(--accent-cyan)" strokeWidth="1.2" />
      <path d="M470 80 L470 20 L420 5 L380 20" stroke="var(--accent-cyan)" strokeWidth="1.2" />
      {/* Fault highlight on CI1 */}
      <rect x="80" y="30" width="60" height="40" rx="2"
        fill="rgba(255,59,59,0.15)" stroke="var(--warn-red)" strokeWidth="1.5" />
      <text x="110" y="54" textAnchor="middle" fontSize="9"
        fill="var(--warn-red)" fontFamily="JetBrains Mono, monospace">CI1</text>
      {/* Normal units */}
      {[160, 230, 300, 370].map((x) => (
        <rect key={x} x={x} y="30" width="55" height="40" rx="2"
          fill="var(--bg-surface)" stroke="var(--border-default)" strokeWidth="1" />
      ))}
      {/* Bogies */}
      {[80, 200, 320, 420].map((x) => (
        <g key={x}>
          <rect x={x - 20} y="80" width="40" height="12" rx="1" stroke="var(--accent-cyan)" strokeWidth="0.8" opacity="0.6" />
          <circle cx={x - 8} cy="96" r="7" stroke="var(--accent-cyan)" strokeWidth="1" opacity="0.7" />
          <circle cx={x + 8} cy="96" r="7" stroke="var(--accent-cyan)" strokeWidth="1" opacity="0.7" />
        </g>
      ))}
      <line x1="0" y1="108" x2="500" y2="108" stroke="var(--border-emphasis)" strokeWidth="1.5" />
    </svg>
  )
}
