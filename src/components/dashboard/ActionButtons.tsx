import { useState } from 'react'
import { useDashboardStore } from '@/stores/dashboardStore'

const CI_UNITS = ['CI1', 'CI2', 'CI3', 'CI4', 'CI5', 'CI6']
const GS_UNITS = ['GS1', 'GS2', 'GS3', 'GS4', 'GS5', 'GS6', 'GS7', 'GS8']

const MICRO_DISPLAY_LABELS = /^我打开微机显示屏$|^我重新查看微机显示屏$/

function expandActionText(label: string, context: ActionContext): string {
  const prefix = '[主司机 ACTIONS] '
  const { trainNo, time, faultId, isolatedUnit } = context

  if (label.includes('向调度报告') || label.includes('报调度') || label.includes('停车报告')) {
    const loc = 'K123+456'
    return `${prefix}我向调度报告：${trainNo} 次列车 ${time} 在 ${loc} 公里处主接地保护动作，主断路器跳闸，现已区间停车。故障代码 ${faultId}，请指示。`
  }

  if (label.includes('请求开车') && label.includes('GS')) {
    const gsMatch = label.match(/GS\d+/)
    const gs = gsMatch ? gsMatch[0] : (isolatedUnit ?? 'GS3')
    return `${prefix}我请求开车：${trainNo} 次主接地故障已通过 ${gs} 隔离，机车具备正常牵引能力，请求开车。`
  }

  if (label.includes('请求开车') && (label.includes('CI') || label.includes('切除'))) {
    const ciMatch = label.match(/CI\d+/)
    const ci = ciMatch ? ciMatch[0] : (isolatedUnit ?? 'CI3')
    return `${prefix}我请求开车：${trainNo} 次主接地故障已切除 ${ci} 单元，机车降级带病运行，请求开车。`
  }

  if (label.includes('请求开车')) {
    return `${prefix}我请求开车：${trainNo} 次故障已处置完毕，机车具备运行条件，请求开车。`
  }

  if (label.includes('请求救援')) {
    return `${prefix}我请求救援：${trainNo} 次机车牵引系统严重损坏，机车失去自走能力，请求救援。`
  }

  return `${prefix}${label}`
}

interface ActionContext {
  trainNo: string
  time: string
  faultId: string
  isolatedUnit?: string
}

function CutoffModal({ onClose, onSend, onUpdateFact }: { onClose: () => void; onSend: (msg: string) => void; onUpdateFact: (ci: string) => void }) {
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (unit: string) =>
    setSelected((prev) => (prev.includes(unit) ? prev.filter((u) => u !== unit) : [...prev, unit]))

  const confirm = () => {
    const units = selected.join('、')
    onSend(`[主司机 ACTIONS] 我用微机切除 ${units} 单元`)
    // Update facts for the first selected CI (primary isolation target)
    if (selected.length > 0) onUpdateFact(selected[0])
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="rounded-lg border p-5 flex flex-col gap-4 w-72"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
      >
        <h3 style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>切除牵引单元</h3>
        <div className="grid grid-cols-3 gap-2">
          {CI_UNITS.map((unit) => {
            const active = selected.includes(unit)
            return (
              <button
                key={unit}
                type="button"
                onClick={() => toggle(unit)}
                className="py-2 rounded border font-mono text-sm transition-all"
                style={{
                  borderColor: active ? 'var(--warn-red)' : 'var(--border-subtle)',
                  background: active ? 'rgba(255,59,59,0.15)' : 'var(--bg-surface)',
                  color: active ? 'var(--warn-red)' : 'var(--text-secondary)',
                  fontWeight: active ? 700 : 400,
                }}
              >
                {unit}
              </button>
            )
          })}
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          已选 {selected.length} 个单元。切除后需向调度报告。
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded border text-sm"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            取消
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={selected.length === 0}
            className="px-3 py-1.5 rounded text-sm font-semibold disabled:opacity-40"
            style={{ background: 'var(--warn-red)', color: '#fff' }}
          >
            确认切除
          </button>
        </div>
      </div>
    </div>
  )
}

function BatteryModal({ onClose, onSend }: { onClose: () => void; onSend: (msg: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="rounded-lg border p-5 flex flex-col gap-4 w-72"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--warn-red)' }}
      >
        <h3 style={{ fontSize: 14, color: 'var(--warn-red)', fontWeight: 600 }}>⚠ 断蓄电池确认</h3>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          断开蓄电池将导致所有控制电路失电，操作不可逆。请确认已完成以下步骤：
        </p>
        <ul className="flex flex-col gap-1" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          <li>• 已向调度报告停车原因</li>
          <li>• 已确认列车完全停止</li>
          <li>• 已通知副司机做好准备</li>
        </ul>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded border text-sm"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => { onSend('[主司机 ACTIONS] 我断开蓄电池'); onClose() }}
            className="px-3 py-1.5 rounded text-sm font-semibold"
            style={{ background: 'var(--warn-red)', color: '#fff' }}
          >
            确认断开
          </button>
        </div>
      </div>
    </div>
  )
}

function GSDispatchModal({
  onClose, onSend, onUpdateFact,
}: { onClose: () => void; onSend: (msg: string) => void; onUpdateFact: (gs: string) => void }) {
  const [selectedGS, setSelectedGS] = useState<string | null>(null)

  const confirm = () => {
    if (!selectedGS) return
    onSend(`[主司机 ACTIONS] 我让副司机扳 ${selectedGS} 到接地位，以隔离故障点`)
    onUpdateFact(selectedGS)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="rounded-lg border p-5 flex flex-col gap-4 w-80"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
      >
        <h3 style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>指示副司机操作 GS 开关</h3>
        <div className="grid grid-cols-4 gap-2">
          {GS_UNITS.map((gs) => {
            const active = selectedGS === gs
            return (
              <button
                key={gs}
                type="button"
                onClick={() => setSelectedGS(gs)}
                className="py-2 rounded border font-mono text-sm transition-all"
                style={{
                  borderColor: active ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                  background: active ? 'rgba(0,212,255,0.15)' : 'var(--bg-surface)',
                  color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  fontWeight: active ? 700 : 400,
                }}
              >
                {gs}
              </button>
            )
          })}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded border text-sm"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            取消
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!selectedGS}
            className="px-3 py-1.5 rounded text-sm font-semibold disabled:opacity-40"
            style={{ background: 'var(--accent-cyan)', color: '#000' }}
          >
            下达指令
          </button>
        </div>
      </div>
    </div>
  )
}

interface ActionButtonsProps {
  onSendMessage?: (text: string) => void
}

export function ActionButtons({ onSendMessage }: ActionButtonsProps) {
  const quickActions = useDashboardStore((state) => state.quickActions)
  const dispatch = useDashboardStore((state) => state.dispatch)
  const faultId = useDashboardStore((state) => state.faultId)
  const leds = useDashboardStore((state) => state.leds)
  const gsPanel = useDashboardStore((state) => state.gsPanel)
  const ciPanel = useDashboardStore((state) => state.ciPanel)
  const facts = useDashboardStore((state) => state.facts)
  const isGameOver = useDashboardStore((state) => state.scoreReport !== null)
  const [showCutoff, setShowCutoff] = useState(false)
  const [showBattery, setShowBattery] = useState(false)

  const context: ActionContext = {
    trainNo: 'K1234',
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    faultId,
  }

  const handleQuickAction = (label: string) => {
    if (MICRO_DISPLAY_LABELS.test(label)) {
      dispatch({ type: 'OPEN_MICRO_DISPLAY' })
    }
    const expanded = expandActionText(label, context)
    onSendMessage?.(expanded)
  }

  // ── Path detection from store state + facts ───────────────────────────────
  const groundLedOn = leds['接地'] === 'on' || leds['接地'] === 'blink'
  const mainBreakerOpen = leds['主断分'] === 'on' || leds['主断分'] === 'blink'
  const mainBreakerClosed = !mainBreakerOpen
  const gs3Grounded = gsPanel.GS3 === 'ground'
  const anyCiIsolated = (ciPanel !== null && ciPanel.some((u) => u.status === 'fault'))
    || facts.hasIsolation === 'YES'
  const ci3Isolated = ciPanel !== null && ciPanel.some((u) => u.id === 'CI3' && u.status === 'fault')

  // A path: gsResult is authoritative — if Bot confirmed success, main breaker is closed
  // Also require hasGSAction to prevent false positive on CI-cutout path
  const isPathA = facts.gsResult === '成功' && facts.hasGSAction === 'YES' && !anyCiIsolated

  // CI-cutout path (B/C/D'→B): any CI isolated (from ciPanel OR facts)
  const isCiCutoutPath = anyCiIsolated && !isPathA

  // D path: GS3 grounded but ground LED still on (main breaker won't close)
  const isPathDDamaged = gs3Grounded && groundLedOn && mainBreakerOpen

  // Show rescue button only when not yet resolved (main breaker still open or damaged)
  const showRescue = !mainBreakerClosed || isPathDDamaged

  // Trial breaker: only enabled after GS action but before result, and not after CI isolation
  const trialBreakerEnabled = facts.hasGSAction === 'YES'
    && facts.gsResult === null
    && facts.hasIsolation === 'NO'

  // Departure button label/id from facts (more reliable than ciPanel)
  const departureCI = facts.whichCI
    ?? ciPanel?.find((u) => u.status === 'fault')?.id
    ?? 'CI3'
  const departureGS = facts.whichGS ?? 'GS3'

  // ── Grouped base actions ──────────────────────────────────────────────────
  const operationGroup = [
    {
      label: '按 SB61 软复位',
      disabled: isGameOver,
      onClick: () => {
        dispatch({ type: 'UPDATE_FACT', key: 'phase', value: 'T1' })
        onSendMessage?.('[主司机 ACTIONS] 我按 SB61 软复位，等待微机重启')
      },
      color: 'var(--accent-cyan)',
    },
    {
      label: '查看微机显示屏',
      disabled: facts.phase === 'T0' || isGameOver,
      onClick: () => {
        dispatch({ type: 'OPEN_MICRO_DISPLAY' })
        dispatch({ type: 'UPDATE_FACT', key: 'phase', value: 'T2' })
        dispatch({ type: 'UPDATE_FACT', key: 'hasViewedMFD', value: 'YES' })
        onSendMessage?.('[主司机 ACTIONS] 我打开微机显示屏查看故障代码')
      },
      color: 'var(--accent-cyan)',
    },
    {
      label: '派副司机去机械室',
      disabled: facts.hasDispatch === 'YES' || isGameOver,
      onClick: () => onSendMessage?.('派副司机去机械室查看现场'),
      color: 'var(--role-codriver)',
    },
    {
      label: '指示副司机扳 GS',
      disabled: isGameOver,
      onClick: () => {
        dispatch({ type: 'SET_GS_ANIMATION_PHASE', phase: 'waiting_codriver' })
        dispatch({
          type: 'ADD_CHAT_MESSAGE',
          storageKey: `coze_conv_driver_${faultId}`,
          message: {
            id: `local_${Date.now()}`,
            role: 'user',
            content: '[主司机]: 副司机，请将 GS3 扳至接地位',
            timestamp: Date.now(),
          },
        })
      },
      color: 'var(--role-codriver)',
    },
    {
      label: '切除单元',
      disabled: isGameOver,
      onClick: () => setShowCutoff(true),
      color: 'var(--warn-amber)',
    },
  ]

  const dispatchGroup = [
    {
      label: '向调度报告当前故障情况',
      disabled: isGameOver,
      onClick: () => onSendMessage?.(expandActionText('向调度报告当前故障情况', context)),
      color: 'var(--accent-cyan)',
    },
  ]

  const emergencyGroup = [
    {
      label: '呼叫应急台',
      disabled: isGameOver,
      onClick: () => onSendMessage?.('[主司机 ACTIONS] 呼叫应急救援台，请求 CMD 数据支援'),
      color: 'var(--role-emergency)',
    },
    {
      label: '断蓄电池',
      disabled: isGameOver,
      onClick: () => setShowBattery(true),
      color: 'var(--warn-red)',
    },
  ]

  const send = (msg: string) => onSendMessage?.(msg)

  return (
    <>
      <div className="flex flex-col gap-1 p-2">
        {/* AI quick actions override everything */}
        {quickActions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {quickActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => !isGameOver && handleQuickAction(action)}
                disabled={isGameOver}
                className="px-3 py-1.5 rounded border text-xs font-medium transition-all hover:opacity-80 animate-[slide-in_0.2s_ease-out] disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  borderColor: 'var(--accent-cyan)',
                  background: 'rgba(0,212,255,0.1)',
                  color: 'var(--accent-cyan)',
                }}
              >
                {action}
              </button>
            ))}
          </div>
        ) : (
          <>
            {/* Row 1: operation buttons */}
            <div className="flex flex-wrap gap-1.5">
              {operationGroup.map((a) => (
                <Btn key={a.label} label={a.label} color={a.color} onClick={a.onClick} disabled={a.disabled} />
              ))}
              {/* Trial breaker — disabled after CI isolation or after result known */}
              <Btn
                label="试合主断(按SB3)"
                color="var(--warn-amber)"
                disabled={!trialBreakerEnabled || isGameOver}
                title={!trialBreakerEnabled && !isGameOver ? '需要先扳 GS 才能试合主断' : undefined}
                onClick={() => {
                  dispatch({ type: 'UPDATE_FACT', key: 'gsResult', value: '成功' })
                  dispatch({ type: 'UPDATE_FACT', key: 'phase', value: 'T4_result' })
                  onSendMessage?.('[主司机 ACTIONS] 我尝试合主断，按 SB3 复位按钮')
                }}
              />
            </div>

            {/* Row 2: dispatch + smart departure button */}
            <div className="flex flex-wrap gap-1.5">
              {dispatchGroup.map((a) => (
                <Btn key={a.label} label={a.label} color={a.color} onClick={a.onClick} disabled={a.disabled} />
              ))}

              {/* Smart departure button — only one shows at a time */}
              {isPathA && (
                <Btn
                  label={`请求开车（${departureGS} 已隔离）`}
                  color="#10b981"
                  disabled={isGameOver}
                  onClick={() => {
                    dispatch({ type: 'UPDATE_FACT', key: 'dispatchApproval', value: 'pending' })
                    send(
                      `[主司机 ACTIONS] 我请求开车：${context.trainNo} 次主接地故障已通过 ${departureGS} 隔离，机车具备正常牵引能力，请求开车。`
                    )
                  }}
                />
              )}
              {isCiCutoutPath && !isPathA && (
                <Btn
                  label={`请求开车（${departureCI} 已切除，5/6 牵引）`}
                  color="#3b82f6"
                  disabled={isGameOver}
                  onClick={() => {
                    dispatch({ type: 'UPDATE_FACT', key: 'dispatchApproval', value: 'pending' })
                    send(
                      `[主司机 ACTIONS] 我请求开车：${context.trainNo} 次主接地故障已切除 ${departureCI} 单元，机车降级带病运行，请求开车。`
                    )
                  }}
                />
              )}
            </div>

            {/* Row 3: emergency */}
            <div className="flex flex-wrap gap-1.5">
              {emergencyGroup.map((a) => (
                <Btn key={a.label} label={a.label} color={a.color} onClick={a.onClick} disabled={a.disabled} />
              ))}
              {showRescue && (
                <Btn
                  label={isPathDDamaged ? '请求救援（设备损坏）' : '请求救援'}
                  color="var(--warn-red)"
                  disabled={isGameOver}
                  onClick={() => send(expandActionText('请求救援', context))}
                />
              )}
            </div>
          </>
        )}
      </div>

      {showCutoff && (
        <CutoffModal
          onClose={() => setShowCutoff(false)}
          onSend={(msg) => onSendMessage?.(msg)}
          onUpdateFact={(ci) => {
            dispatch({ type: 'UPDATE_FACT', key: 'hasIsolation', value: 'YES' })
            dispatch({ type: 'UPDATE_FACT', key: 'whichCI', value: ci })
            dispatch({ type: 'UPDATE_FACT', key: 'phase', value: 'T5_isolation' })
          }}
        />
      )}
      {showBattery && (
        <BatteryModal
          onClose={() => setShowBattery(false)}
          onSend={(msg) => onSendMessage?.(msg)}
        />
      )}
    </>
  )
}

function Btn({ label, color, onClick, disabled, title }: { label: string; color: string; onClick: () => void; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="px-3 py-1.5 rounded border text-xs font-medium transition-all hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
      style={{ borderColor: color, background: `${color}18`, color }}
    >
      {label}
    </button>
  )
}
