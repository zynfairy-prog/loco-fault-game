import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { GlowCard } from '@/components/common/GlowCard'
import { ChatBox } from '@/components/chat/ChatBox'
import { StatusLEDPanel } from '@/components/dashboard/StatusLEDPanel'
import { MeterDisplayPanel } from '@/components/dashboard/MeterDisplayPanel'
import { FaultCodeList } from '@/components/dashboard/FaultCodeList'
import { TaskBanner } from '@/components/dashboard/TaskBanner'
import { ActionButtons } from '@/components/dashboard/ActionButtons'
import { ScoreReportPanel } from '@/components/ScoreReportPanel'
import { ScoreDashboard } from '@/components/ScoreDashboard'
import { MicroDisplayModal } from '@/components/MicroDisplayModal'
import { useCozeChat } from '@/hooks/useCozeChat'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useBroadcastSync } from '@/hooks/useBroadcastSync'
import { getRoleColor } from '@/lib/utils'
import { isScoreReportV2 } from '@/types/game-state'

// ── GS3 Animation Overlay ─────────────────────────────────────────────────────

interface GS3AnimationOverlayProps {
  onDone: () => void
}

function GS3AnimationOverlay({ onDone }: GS3AnimationOverlayProps) {
  // step 0=run (0°), 1=disconnect (135°), 2=ground (225°) — matches GSKnob angles
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [phase, setPhase] = useState<'idle' | 'animating' | 'done'>('idle')
  const [showResult, setShowResult] = useState(false)

  const STEP_COLORS = ['#22d3ee', '#fbbf24', '#ef4444']
  const STEP_LABELS = ['运行位', '分闸位', '接地位']
  const STEP_ANGLES = [0, 135, 225]

  function handleClick() {
    if (phase !== 'idle') return
    setPhase('animating')
    // step 0 → 1 (600ms transition)
    setTimeout(() => setStep(1), 0)
    // 100ms pause at disconnect, then step 1 → 2
    setTimeout(() => {
      setStep(2)
      setTimeout(() => {
        setPhase('done')
        setShowResult(true)
        // auto-close after 1.5s
        setTimeout(onDone, 1500)
      }, 600)
    }, 700) // 600ms anim + 100ms pause
  }

  const color = STEP_COLORS[step]
  const angle = STEP_ANGLES[step]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)',
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute', top: 24, left: 0, right: 0,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, marginBottom: 4 }}>
          副司机视角 · 机械室 GS 操作
        </div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
          请将 GS3 扳至接地位
        </div>
      </div>

      {/* GS3 Knob — matches GSKnob appearance */}
      <div
        onClick={handleClick}
        style={{
          cursor: phase === 'idle' ? 'pointer' : 'default',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
        }}
      >
        {/* Knob + position markers */}
        <div style={{ position: 'relative', width: 160, height: 160 }}>
          {/* Pulse ring (idle only) */}
          {phase === 'idle' && (
            <div style={{
              position: 'absolute', inset: -14,
              borderRadius: '50%',
              border: `2px solid ${color}`,
              opacity: 0.6,
              animation: 'gs3-pulse 1.4s ease-in-out infinite',
            }} />
          )}
          <style>{`
            @keyframes gs3-pulse {
              0%, 100% { transform: scale(1); opacity: 0.6; }
              50% { transform: scale(1.1); opacity: 0.2; }
            }
          `}</style>

          {/* Position marker labels — 12/4/8 o'clock, same as GSKnob */}
          <span style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>运行</span>
          <span style={{ position: 'absolute', bottom: 4, right: -24, fontSize: 11, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>分闸</span>
          <span style={{ position: 'absolute', bottom: 4, left: -24, fontSize: 11, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>接地</span>

          {/* Knob body — dark radial gradient, same as GSKnob */}
          <div style={{
            width: 160, height: 160, borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 35%, #4a5568, #1a202c)',
            border: `3px solid ${step === 2 ? '#ef4444' : '#6b7280'}`,
            boxShadow: step === 2 ? `0 0 20px #ef444488, inset 0 2px 4px rgba(255,255,255,0.1)` : `inset 0 2px 4px rgba(255,255,255,0.1)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
            transition: 'border-color 0.35s ease, box-shadow 0.35s ease',
          }}>
            {/* Indicator bar — rotates around center, same as GSKnob */}
            <div style={{
              width: 6, height: 44, borderRadius: 3,
              background: color,
              boxShadow: `0 0 8px ${color}`,
              transform: `rotate(${angle}deg)`,
              transformOrigin: 'center center',
              transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1), background 0.35s ease',
            }} />
            {/* Lock icon when grounded */}
            {step === 2 && (
              <span style={{ position: 'absolute', top: 4, right: 6, fontSize: 14 }}>🔒</span>
            )}
          </div>
        </div>

        {/* ID + position label */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#67e8f9', fontFamily: 'monospace', letterSpacing: 2 }}>GS3</div>
          <div style={{ fontSize: 13, fontWeight: 600, color, fontFamily: 'monospace', marginTop: 4, transition: 'color 0.35s ease' }}>
            {STEP_LABELS[step]}
          </div>
        </div>

        {phase === 'idle' && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            点击旋钮执行操作
          </div>
        )}
      </div>

      {/* Result message */}
      {showResult && (
        <div style={{
          position: 'absolute', bottom: 80,
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: 8, padding: '12px 24px',
          fontSize: 14, color: '#fca5a5',
          animation: 'gs3-fadein 0.3s ease-out',
        }}>
          <style>{`@keyframes gs3-fadein { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }`}</style>
          [副司机]: GS3 已扳至接地位，完毕
        </div>
      )}
    </div>
  )
}

export function DriverScreen() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const faultId = searchParams.get('fault') ?? 'F007'

  const initSession = useDashboardStore((state) => state.initSession)
  const trainState = useDashboardStore((state) => state.trainState)
  const scoreReport = useDashboardStore((state) => state.scoreReport)
  const dispatch = useDashboardStore((state) => state.dispatch)
  const rolesConfig = useDashboardStore((state) => state.rolesConfig)
  const heatmapData = useDashboardStore((state) => state.heatmapData)
  const gsAnimationPhase = useDashboardStore((state) => state.gsAnimationPhase)

  // Single-player mode: show view-switch button
  const isSinglePlayer = rolesConfig.driver_main === 'human' &&
    rolesConfig.driver_assist === 'AI' &&
    rolesConfig.dispatcher === 'AI' &&
    rolesConfig.coordinator === 'AI'

  const heatmapActive = heatmapData !== null && Object.values(heatmapData).some((v) => v > 5)

  // Dispatch dialog state
  const [showDispatchDialog, setShowDispatchDialog] = useState(false)

  // Close MicroDisplayModal when score report arrives so it doesn't block the score panel
  useEffect(() => {
    if (scoreReport) dispatch({ type: 'CLOSE_MICRO_DISPLAY' })
  }, [scoreReport, dispatch])

  // This window owns the AI chat and broadcasts store state to other windows
  useBroadcastSync(true)

  const chat = useCozeChat({
    systemPrefix: '【我是主司机】',
    storageKey: `coze_conv_driver_${faultId}`,
    contextPrefix: `[当前剧本: ${faultId}] [玩家角色: 主司机]`,
  })

  const [time, setTime] = useState(new Date())

  useEffect(() => {
    initSession(faultId, 'driver')
  }, [faultId, initSession])

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Use sessionStorage flag so startup fires only once per browser session per fault
    const startedKey = `conv_started_coze_conv_driver_${faultId}`
    if (sessionStorage.getItem(startedKey)) return
    sessionStorage.setItem(startedKey, '1')
    const rolesMsg = sessionStorage.getItem('startup_roles_msg') ?? ''
    sessionStorage.removeItem('startup_roles_msg')
    const rolesLine = rolesMsg ? `${rolesMsg}\n` : ''
    chat.send(`${rolesLine}玩家选定 ${faultId} 关卡，扮演主司机角色，请按 T0 推送故障触发场景`)
  }, [faultId]) // eslint-disable-line react-hooks/exhaustive-deps

  const isEmergency = trainState === 'emergency_stop'

  const handleLEDClick = (ledName: string) => {
    chat.send(`请解释指示灯"${ledName}"亮起的含义及处置建议`)
  }

  // Intercept "派副司机" action button
  function handleActionSend(text: string) {
    if (text.includes('派副司机') && text.includes('机械室')) {
      setShowDispatchDialog(true)
      return
    }
    chat.send(text)
  }

  function handleDispatchSelf() {
    setShowDispatchDialog(false)
    chat.send('我派副司机去机械室查看现场')
    dispatch({ type: 'SET_SHOWING_CO_DRIVER_VIEW', showing: true })
    // Force investigation mode immediately — don't wait for HEATMAP signal
    dispatch({ type: 'SET_CO_DRIVER_VIEW', mode: 'investigation' })
    dispatch({ type: 'UPDATE_FACT', key: 'hasDispatch', value: 'YES' })
    dispatch({ type: 'UPDATE_FACT', key: 'phase', value: 'T2_5_dispatch' })
    // Clear co-driver conv_started so the investigation startup message fires
    sessionStorage.removeItem(`conv_started_coze_conv_codriver_${faultId}`)
    // Clear idle narration flag so it doesn't fire on next idle entry
    sessionStorage.removeItem(`idle_narration_sent_${faultId}`)
    // Send role takeover signal
    chat.send('[ROLE_TAKEOVER:driver_assist:human]')
    navigate(`/codriver?fault=${faultId}`)
  }

  function handleDispatchAI() {
    setShowDispatchDialog(false)
    chat.send('我派副司机去机械室查看现场')
    dispatch({ type: 'UPDATE_FACT', key: 'hasDispatch', value: 'YES' })
    dispatch({ type: 'UPDATE_FACT', key: 'phase', value: 'T2_5_dispatch' })
    // AI will handle the rest via backend
  }

  return (
    <div
      className="flex h-screen overflow-hidden transition-all duration-300"
      style={{
        background: 'var(--bg-deep)',
        boxShadow: isEmergency ? 'inset 0 0 0 3px var(--warn-red)' : undefined,
      }}
    >
      {/* Score report overlay — V2 dashboard or legacy panel */}
      {scoreReport && isScoreReportV2(scoreReport) && (
        <ScoreDashboard
          report={scoreReport}
          faultId={faultId}
          onReplay={() => {
            // Clear conv_started flag so startup message fires again
            sessionStorage.removeItem(`conv_started_coze_conv_driver_${faultId}`)
            dispatch({ type: 'RESET' })
          }}
          onBackToSetup={() => {
            sessionStorage.removeItem(`conv_started_coze_conv_driver_${faultId}`)
            dispatch({ type: 'RESET' })
            navigate('/setup')
          }}
        />
      )}
      {scoreReport && !isScoreReportV2(scoreReport) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-[90vw] h-[90vh] rounded-xl overflow-hidden shadow-2xl" style={{ border: '1px solid #3a4a5a' }}>
            <ScoreReportPanel
              report={scoreReport}
              onRetry={() => {
                dispatch({ type: 'RESET' })
                navigate('/')
              }}
              onExport={() => {
                const json = JSON.stringify(scoreReport, null, 2)
                const blob = new Blob([json], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `score_${faultId}_${Date.now()}.json`
                a.click()
                URL.revokeObjectURL(url)
              }}
            />
          </div>
        </div>
      )}

      {/* Dispatch dialog */}
      {showDispatchDialog && (
        <div className="absolute inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div
            className="rounded-xl border p-6 w-[400px] space-y-4"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
          >
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              副司机已前往机械室。
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>您可以：</div>
            <button
              onClick={handleDispatchSelf}
              className="w-full py-3 rounded-lg border text-sm font-medium transition-all hover:brightness-110"
              style={{
                background: 'rgba(0,212,255,0.1)',
                borderColor: 'var(--accent-cyan)',
                color: 'var(--accent-cyan)',
              }}
            >
              我亲自查看现场（接管副司机）
            </button>
            <button
              onClick={handleDispatchAI}
              className="w-full py-3 rounded-lg border text-sm font-medium transition-all hover:brightness-110"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-secondary)',
              }}
            >
              让 AI 副司机查看并回报
            </button>
            <button
              onClick={() => setShowDispatchDialog(false)}
              className="w-full text-xs text-center"
              style={{ color: 'var(--text-tertiary)' }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* MicroDisplayModal — driver window only */}
      <MicroDisplayModal
        onCutCI={(message) => {
          chat.send(message)
        }}
      />

      {/* GS3 animation overlay */}
      {gsAnimationPhase === 'waiting_codriver' && (
        <GS3AnimationOverlay
          onDone={() => {
            dispatch({ type: 'SET_GS_ANIMATION_PHASE', phase: 'done' })
            dispatch({ type: 'UPDATE_FACT', key: 'hasGSAction', value: 'YES' })
            dispatch({ type: 'UPDATE_FACT', key: 'whichGS', value: 'GS3' })
            dispatch({ type: 'UPDATE_FACT', key: 'phase', value: 'T3_trial' })
            dispatch({ type: 'SET_GS_STATE', id: 'GS3', position: 'ground' })
            dispatch({
              type: 'ADD_CHAT_MESSAGE',
              storageKey: `coze_conv_driver_${faultId}`,
              message: {
                id: `local_gs3_done_${Date.now()}`,
                role: 'ai',
                content: '[副司机]: GS3 已扳至接地位，完毕',
                timestamp: Date.now(),
              },
            })
          }}
        />
      )}

      {/* Left: Instrument Panel 70% */}
      <div
        className="flex flex-col border-r overflow-hidden"
        style={{ width: '70%', borderColor: isEmergency ? 'var(--warn-red)' : 'var(--border-subtle)' }}
      >
        {/* Top bar */}
        <div
          className="flex items-center gap-6 px-4 py-2 border-b flex-shrink-0"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>车次</span>
            <span className="font-mono font-semibold text-sm" style={{ color: 'var(--accent-cyan)' }}>K1234</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>工号</span>
            <span className="font-mono font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>ZS-0892</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>剧本</span>
            <span className="font-mono font-semibold text-sm" style={{ color: 'var(--warn-amber)' }}>{faultId}</span>
          </div>
          <div className="flex-1" />
          {/* Single-player view-switch button */}
          {isSinglePlayer && (
            <button
              onClick={() => navigate(`/codriver?fault=${faultId}`)}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all hover:brightness-125"
              style={{
                background: heatmapActive ? 'rgba(177,128,255,0.15)' : 'var(--bg-surface)',
                border: `1px solid ${heatmapActive ? 'var(--role-codriver)' : 'var(--border-default)'}`,
                color: heatmapActive ? 'var(--role-codriver)' : 'var(--text-secondary)',
              }}
            >
              {heatmapActive ? '前往现场（副司机视角）' : '查看副司机视角'}
            </button>
          )}
          <div
            className="font-mono font-semibold text-lg"
            style={{ color: 'var(--accent-cyan)', fontVariantNumeric: 'tabular-nums' }}
          >
            {time.toTimeString().slice(0, 8)}
          </div>
        </div>

        {/* Task banner */}
        <TaskBanner />

        {/* LED Matrix */}
        <GlowCard
          title="状态指示屏"
          glowColor={isEmergency ? 'var(--warn-red)' : 'var(--accent-cyan)'}
          className="mx-3 mt-3 flex-shrink-0"
        >
          <StatusLEDPanel onLEDClick={handleLEDClick} />
        </GlowCard>

        {/* Gauges */}
        <GlowCard
          title="仪表读数"
          glowColor="var(--accent-cyan-dim)"
          className="mx-3 mt-2 flex-shrink-0"
        >
          <MeterDisplayPanel />
        </GlowCard>

        {/* Fault code list */}
        <GlowCard
          title="微机显示屏 · 故障履历"
          glowColor="var(--warn-red)"
          className="mx-3 mt-2 flex-1 min-h-0 overflow-hidden"
        >
          <FaultCodeList />
        </GlowCard>

        {/* Action buttons */}
        <div
          className="border-t flex-shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <ActionButtons onSendMessage={handleActionSend} />
        </div>
      </div>

      {/* Right: Chat 30% */}
      <div style={{ width: '30%' }}>
        <ChatBox
          messages={chat.messages}
          isLoading={chat.isLoading}
          streamingText={chat.streamingText}
          onSend={chat.send}
          title="AI 故障导演 · 调度指挥"
          accentColor={getRoleColor('driver')}
          className="h-full"
        />
      </div>
    </div>
  )
}
