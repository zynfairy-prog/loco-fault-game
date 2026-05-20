import { useEffect, useRef, useState } from 'react'
import type { ScoreReportV2, PlayerActionLog } from '@/types/game-state'

// ── helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number | 'N/A'): string {
  if (score === 'N/A') return '#4b5563'
  if (score >= 90) return '#10b981'
  if (score >= 75) return '#3b82f6'
  if (score >= 60) return '#f59e0b'
  return '#ef4444'
}

const VERDICT_MAP: Record<string, { name: string; color: string; desc: string }> = {
  A:             { name: '最佳',      color: '#10b981', desc: 'A 路径' },
  B:             { name: '优秀',      color: '#10b981', desc: 'B 路径' },
  D_prime_to_B:  { name: '决策补救',  color: '#3b82f6', desc: "D'→B 路径" },
  C:             { name: '安全',      color: '#3b82f6', desc: 'C 路径' },
  D_prime:       { name: '救援',      color: '#f59e0b', desc: "D' 路径" },
  D_lucky:       { name: '侥幸成功',  color: '#f59e0b', desc: 'D 路径' },
  D_loss:        { name: '设备损坏',  color: '#ef4444', desc: 'D 路径' },
  D:             { name: '事故',      color: '#ef4444', desc: 'D 路径' },
  ERROR:         { name: '数据异常',  color: '#ef4444', desc: '异常' },
}

const ROLE_NAMES: Record<string, string> = {
  driver_main: '主司机', driver_assist: '副司机',
  dispatcher: '调度', coordinator: '应急台',
}

function formatRoles(roles: string | undefined): string {
  if (!roles || roles === 'none') return '无'
  return roles.split(',').map((r) => ROLE_NAMES[r.trim()] ?? r.trim()).join('、')
}

const MODE_NAMES: Record<string, string> = {
  '1_player': '1 人模式', '2_player': '2 人模式',
  '3_player': '3 人模式', '4_player': '4 人模式',
}

// Dimension card text lookup: high/mid/low per dimension
const DIM_TEXT: Record<string, { high: string; mid: string; low: string }> = {
  investigation: {
    high: '调查充分，关键信息全部获取，诊断依据扎实。',
    mid:  '调查基本到位，部分细节有遗漏，影响判断效率。',
    low:  '调查不足，关键信息缺失，诊断依据薄弱。',
  },
  decision: {
    high: '决策路径最优，判断准确，无冗余操作。',
    mid:  '决策方向正确，但存在保守或迂回步骤。',
    low:  '决策存在明显失误，走了弯路或错误路径。',
  },
  operation: {
    high: '操作规范，步骤准确，无误操作记录。',
    mid:  '操作基本正确，有轻微失误但未造成影响。',
    low:  '操作存在错误，部分步骤违规或遗漏。',
  },
  communication: {
    high: '调度沟通及时规范，信息传递完整清晰。',
    mid:  '沟通基本到位，部分报告不够及时或完整。',
    low:  '沟通不足，关键信息未及时上报或遗漏。',
  },
  safety: {
    high: '安全意识强，全程无违规操作，风险控制到位。',
    mid:  '安全意识基本到位，有轻微疏忽但未造成危险。',
    low:  '存在安全隐患，部分操作违反安全规程。',
  },
}

const DIM_LABELS: Record<string, string> = {
  investigation: '调查充分度',
  decision:      '决策合理性',
  operation:     '操作准确性',
  communication: '调度沟通',
  safety:        '安全意识',
}

function dimText(key: string, score: number | 'N/A'): string {
  const t = DIM_TEXT[key]
  if (!t) return ''
  if (score === 'N/A') return '本维度未参与评分。'
  if (score >= 80) return t.high
  if (score >= 55) return t.mid
  return t.low
}

// Fallback action logs by verdict
const FALLBACK_LOGS: Record<string, PlayerActionLog[]> = {
  A: [
    { time: 'T1', action: '按 SB61 软复位', result: '微机重启，故障代码 E0301 出现' },
    { time: 'T2', action: '查看微机显示屏', result: '确认主接地故障，CI3 异常' },
    { time: 'T3', action: '指示副司机扳 GS3 至接地位', result: 'GS3 成功接地' },
    { time: 'T3', action: '试合主断（SB3）', result: '主断成功合闸，接地灯熄灭' },
    { time: 'T6', action: '向调度报告并请求开车', result: '调度批准，恢复运行' },
  ],
  B: [
    { time: 'T1', action: '按 SB61 软复位', result: '微机重启，故障代码 E0301 出现' },
    { time: 'T2', action: '查看微机显示屏', result: '确认主接地故障' },
    { time: 'T5', action: '切除 CI3 单元', result: 'CI3 切除，5/6 牵引' },
    { time: 'T6', action: '向调度报告并请求开车', result: '调度批准，降级运行' },
  ],
  C: [
    { time: 'T1', action: '按 SB61 软复位', result: '微机重启' },
    { time: 'T3', action: '直接试合主断（未扳 GS）', result: '主断再次跳闸' },
    { time: 'T5', action: '切除 CI3 单元', result: 'CI3 切除' },
    { time: 'T6', action: '请求开车', result: '调度批准，降级运行' },
  ],
  D: [
    { time: 'T1', action: '按 SB61 软复位', result: '微机重启' },
    { time: 'T3', action: '多次试合主断', result: '主断反复跳闸，设备损坏' },
    { time: 'T7', action: '请求救援', result: '机车失去自走能力' },
  ],
}

// ── RadarChart ────────────────────────────────────────────────────────────────

interface RadarChartProps {
  scores: Record<string, number | 'N/A'>
}

function RadarChart({ scores }: RadarChartProps) {
  const dims = ['investigation', 'decision', 'operation', 'communication', 'safety']
  const labels = ['调查', '决策', '操作', '沟通', '安全']
  const cx = 110, cy = 110, r = 85
  const angleStep = (2 * Math.PI) / 5
  const startAngle = -Math.PI / 2

  const point = (i: number, radius: number) => {
    const a = startAngle + i * angleStep
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) }
  }

  const gridLevels = [20, 40, 60, 80, 100]
  const gridPolygons = gridLevels.map((pct) => {
    const pts = dims.map((_, i) => point(i, (r * pct) / 100))
    return pts.map((p) => `${p.x},${p.y}`).join(' ')
  })

  const scorePoints = dims.map((d, i) => {
    const s = scores[d]
    const pct = s === 'N/A' ? 0 : Math.max(0, Math.min(100, s as number))
    return point(i, (r * pct) / 100)
  })
  const scorePolygon = scorePoints.map((p) => `${p.x},${p.y}`).join(' ')

  const labelPts = dims.map((_, i) => point(i, r + 18))

  return (
    <svg width="220" height="220" style={{ overflow: 'visible' }}>
      {/* Grid polygons */}
      {gridPolygons.map((pts, li) => (
        <polygon
          key={li}
          points={pts}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={li === gridPolygons.length - 1 ? 1.5 : 1}
        />
      ))}
      {/* Axis lines */}
      {dims.map((_, i) => {
        const outer = point(i, r)
        return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
      })}
      {/* Score polygon */}
      <polygon
        points={scorePolygon}
        fill="rgba(99,179,237,0.18)"
        stroke="#63b3ed"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Score dots */}
      {scorePoints.map((p, i) => {
        const s = scores[dims[i]]
        const color = scoreColor(s)
        return <circle key={i} cx={p.x} cy={p.y} r={4} fill={color} stroke="#0a1628" strokeWidth={1.5} />
      })}
      {/* Labels */}
      {labelPts.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={p.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.65)"
          fontSize={11}
          fontFamily="sans-serif"
        >
          {labels[i]}
        </text>
      ))}
    </svg>
  )
}

// ── AnimatedBar ───────────────────────────────────────────────────────────────

function AnimatedBar({ score, delay }: { score: number | 'N/A'; delay: number }) {
  const barRef = useRef<HTMLDivElement>(null)
  const isNA = score === 'N/A'
  const pct = isNA ? 0 : Math.min(100, Math.max(0, score as number))
  const color = scoreColor(score)

  useEffect(() => {
    const el = barRef.current
    if (!el || isNA) return
    el.style.width = '0%'
    const t = setTimeout(() => {
      el.style.transition = `width 0.8s cubic-bezier(0.4,0,0.2,1) ${delay}ms`
      el.style.width = `${pct}%`
    }, 50)
    return () => clearTimeout(t)
  }, [pct, delay, isNA])

  return (
    <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
      <div
        ref={barRef}
        style={{
          height: '100%',
          width: isNA ? '0%' : `${pct}%`,
          background: color,
          borderRadius: 3,
          boxShadow: `0 0 6px ${color}88`,
        }}
      />
    </div>
  )
}

// ── RollingNumber ─────────────────────────────────────────────────────────────

function RollingNumber({ target }: { target: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start: number | null = null
    const duration = 1200
    const raf = (ts: number) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(raf)
    }
    const id = requestAnimationFrame(raf)
    return () => cancelAnimationFrame(id)
  }, [target])
  return <>{display}</>
}

// ── HistoryModal ──────────────────────────────────────────────────────────────

const MOCK_HISTORY = [
  { date: '2026-05-08', faultId: 'F001', verdict: 'B', total: 78, comments: '切除路径处置规范，但未尝试 GS 隔离。' },
  { date: '2026-05-09', faultId: 'F001', verdict: 'A', total: 94, comments: '全流程最优，GS3 隔离成功，调度沟通及时。' },
  { date: '2026-05-10', faultId: 'F001', verdict: 'C', total: 61, comments: '多次试合主断，走了弯路，最终降级运行。' },
]

function HistoryModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(180deg,#0a1628 0%,#0f1f3a 100%)',
          border: '1px solid rgba(99,179,237,0.3)',
          borderRadius: 12, padding: '24px 28px',
          width: 480, color: '#fff',
          boxShadow: '0 0 32px rgba(99,179,237,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>学习记录（近 3 次）</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MOCK_HISTORY.map((h, i) => {
            const v = VERDICT_MAP[h.verdict] ?? VERDICT_MAP.A
            return (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8, padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{h.date}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{h.faultId}</span>
                  <span style={{
                    padding: '1px 8px', borderRadius: 4,
                    background: v.color, color: '#000',
                    fontSize: 11, fontWeight: 700,
                  }}>{v.desc} · {v.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 700, color: v.color, fontFamily: 'monospace' }}>
                    {h.total}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{h.comments}</div>
              </div>
            )
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 16, width: '100%', padding: '8px 0',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13,
          }}
        >
          关闭
        </button>
      </div>
    </div>
  )
}

// ── ScoreDashboard ────────────────────────────────────────────────────────────

interface ScoreDashboardProps {
  report: ScoreReportV2
  faultId?: string
  onReplay?: () => void
  onBackToSetup?: () => void
}

export function ScoreDashboard({ report, faultId, onReplay, onBackToSetup }: ScoreDashboardProps) {
  const { investigation, decision, operation, communication, safety,
    total, verdict, mode, human_roles, ai_roles, comments, player_actions_log } = report

  const [showHistory, setShowHistory] = useState(false)
  const v = VERDICT_MAP[verdict] ?? VERDICT_MAP.A
  const dims = ['investigation', 'decision', 'operation', 'communication', 'safety'] as const
  const scores: Record<string, number | 'N/A'> = { investigation, decision, operation, communication, safety }

  const actionLog: PlayerActionLog[] = player_actions_log?.length
    ? player_actions_log
    : (FALLBACK_LOGS[verdict] ?? FALLBACK_LOGS.A)

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `score_${faultId ?? 'F001'}_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(10px)',
        animation: 'sd-fadein 0.3s ease-out',
      }}>
        <style>{`
          @keyframes sd-fadein { from { opacity: 0 } to { opacity: 1 } }
          @keyframes sd-scalein { from { opacity: 0; transform: scale(0.92) } to { opacity: 1; transform: scale(1) } }
          @keyframes sd-slidein { from { opacity: 0; transform: translateX(24px) } to { opacity: 1; transform: translateX(0) } }
        `}</style>

        <div style={{
          background: 'linear-gradient(180deg,#0a1628 0%,#0f1f3a 100%)',
          border: `1px solid ${v.color}55`,
          borderRadius: 16,
          padding: '24px 28px',
          maxWidth: 860,
          width: '96%',
          maxHeight: '92vh',
          overflowY: 'auto',
          color: '#fff',
          boxShadow: `0 0 60px ${v.color}22`,
          animation: 'sd-scalein 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 4, marginBottom: 4 }}>
              FAULT HANDLING ASSESSMENT
            </div>
            <div style={{ fontSize: 18, fontWeight: 500 }}>
              {faultId ?? 'F001'} 故障处置 · 终局评分
            </div>
          </div>

          {/* Two-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '45% 55%', gap: 20, alignItems: 'start' }}>

            {/* Left column: radar + bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
              <RadarChart scores={scores} />

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dims.map((d, i) => {
                  const s = scores[d]
                  return (
                    <div key={d} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{DIM_LABELS[d]}</span>
                        <span style={{
                          fontSize: 12, fontWeight: 700, fontFamily: 'monospace',
                          color: scoreColor(s),
                        }}>
                          {s === 'N/A' ? 'N/A' : s}
                        </span>
                      </div>
                      <AnimatedBar score={s} delay={500 + i * 100} />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Total score + verdict */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 18px',
                border: `2px solid ${v.color}`,
                borderRadius: 10,
                background: `${v.color}12`,
                animation: 'sd-slidein 0.4s ease-out 0.2s both',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 72 }}>
                  <span style={{ fontSize: 44, fontWeight: 700, color: v.color, fontFamily: 'monospace', lineHeight: 1 }}>
                    <RollingNumber target={total} />
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>综合评分</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'inline-block', padding: '3px 10px',
                    background: v.color, color: '#000',
                    borderRadius: 4, fontSize: 12, fontWeight: 700, marginBottom: 6,
                  }}>
                    {v.desc} · {v.name}
                  </div>
                  {mode && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                      {MODE_NAMES[mode] ?? mode}
                      {human_roles && ` · 玩家：${formatRoles(human_roles)}`}
                      {ai_roles && ` · AI：${formatRoles(ai_roles)}`}
                    </div>
                  )}
                </div>
              </div>

              {/* Dimension cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dims.map((d, i) => {
                  const s = scores[d]
                  const color = scoreColor(s)
                  return (
                    <div
                      key={d}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${color}33`,
                        borderLeft: `3px solid ${color}`,
                        borderRadius: 6,
                        animation: `sd-slidein 0.35s ease-out ${0.3 + i * 0.08}s both`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color }}>{DIM_LABELS[d]}</span>
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color }}>
                          {s === 'N/A' ? 'N/A' : `${s}/100`}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                        {dimText(d, s)}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Comments */}
              {comments && (
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '10px 14px',
                }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>导演评语</div>
                  <div style={{ fontSize: 12, lineHeight: 1.7, color: 'rgba(255,255,255,0.82)' }}>{comments}</div>
                </div>
              )}

              {/* Action log timeline */}
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: 1 }}>
                  操作回顾
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {actionLog.map((entry, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, position: 'relative' }}>
                      {i < actionLog.length - 1 && (
                        <div style={{
                          position: 'absolute', left: 20, top: 20, bottom: 0,
                          width: 1, background: 'rgba(255,255,255,0.1)',
                        }} />
                      )}
                      <div style={{
                        flexShrink: 0, width: 40, height: 20, marginTop: 2,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(99,179,237,0.15)',
                        border: '1px solid rgba(99,179,237,0.3)',
                        borderRadius: 4, fontSize: 9, fontFamily: 'monospace',
                        color: '#63b3ed', fontWeight: 700,
                      }}>
                        {entry.time}
                      </div>
                      <div style={{ flex: 1, paddingBottom: 10 }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
                          {entry.action}
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                          → {entry.result}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={handleExport}
                  style={{
                    padding: '8px 16px', background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6,
                    cursor: 'pointer', fontSize: 12,
                  }}
                >
                  导出报告
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistory(true)}
                  style={{
                    padding: '8px 16px', background: 'rgba(99,179,237,0.1)',
                    color: '#63b3ed',
                    border: '1px solid rgba(99,179,237,0.3)', borderRadius: 6,
                    cursor: 'pointer', fontSize: 12,
                  }}
                >
                  查看学习记录
                </button>
                {onReplay && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('确定重新开始本局？所有进度将清空。')) {
                        onReplay()
                      }
                    }}
                    style={{
                      padding: '8px 16px', background: v.color, color: '#000',
                      border: 'none', borderRadius: 6, fontWeight: 700,
                      cursor: 'pointer', fontSize: 12,
                    }}
                  >
                    再来一局
                  </button>
                )}
                {onBackToSetup && (
                  <button
                    type="button"
                    onClick={onBackToSetup}
                    style={{
                      padding: '8px 16px', background: 'transparent', color: 'rgba(255,255,255,0.5)',
                      border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6,
                      cursor: 'pointer', fontSize: 12,
                    }}
                  >
                    回到选关页
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
    </>
  )
}
