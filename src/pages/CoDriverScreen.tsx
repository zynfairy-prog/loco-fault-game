import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ChatBox } from '@/components/chat/ChatBox'
import { useCozeChat } from '@/hooks/useCozeChat'
import { useBroadcastSync } from '@/hooks/useBroadcastSync'
import { useDashboardStore } from '@/stores/dashboardStore'
import { getRoleColor } from '@/lib/utils'
import { MechanicalRoomView } from '@/components/codriver/MechanicalRoomView'
import { ControlCabinetSVG } from '@/components/codriver/ControlCabinetSVG'
import type { GSId, GSPosition, HeatmapData } from '@/types/game-state'

// Build observation text from heatmap data
function buildObservationText(heatmapData: HeatmapData | null, isInvestigation: boolean): string[] {
  if (!heatmapData) {
    return isInvestigation
      ? ['正在接收现场热区数据，请稍候…']
      : ['机械室未见明显异常']
  }
  const lines: string[] = []
  const hotCIs = (['CI1','CI2','CI3','CI4','CI5','CI6'] as const)
    .filter((ci) => (heatmapData[ci] ?? 0) > 30)
  const hotCables = (heatmapData.CABLE_TR_CI ?? 0) > 30 || (heatmapData.CABLE_CI_MOTOR ?? 0) > 30
  const hotOther = (heatmapData.TRANSFORMER ?? 0) > 30 || (heatmapData.MOTOR_BOX ?? 0) > 30

  if (hotCIs.length > 0) {
    const maxTemp = Math.max(...hotCIs.map((ci) => heatmapData[ci] ?? 0))
    if (maxTemp > 70) lines.push('嗅觉：机械室内有明显焦糊味')
    else lines.push('嗅觉：机械室内有轻微异味')
    lines.push(`温度：${hotCIs.length} 处变流器单元表面偏高`)
  }
  if (hotCables) lines.push('视觉：电缆段有粉尘聚集')
  if (hotOther) lines.push('温度：其他设备外壳偏高')
  if (lines.length === 0) lines.push('机械室各设备运转正常，未见明显异常')
  return lines
}

// Determine the most likely fault unit from heatmap
function getPrimaryFaultUnit(heatmapData: HeatmapData | null): string | null {
  if (!heatmapData) return null
  const ciEntries = (['CI1','CI2','CI3','CI4','CI5','CI6'] as const)
    .map((ci) => ({ ci, val: heatmapData[ci] ?? 0 }))
    .filter((e) => e.val > 30)
    .sort((a, b) => b.val - a.val)
  return ciEntries[0]?.ci ?? null
}

export function CoDriverScreen() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const faultId = searchParams.get('fault') ?? 'F007'

  const { heatmapData, gsPanel, coDriverViewMode, rolesConfig, dispatch } = useDashboardStore()

  const chat = useCozeChat({
    systemPrefix: '【我是副司机】',
    storageKey: `coze_conv_codriver_${faultId}`,
    contextPrefix: `[当前剧本: ${faultId}] [玩家角色: 副司机]`,
  })

  useBroadcastSync(false)

  useEffect(() => {
    const startedKey = `conv_started_coze_conv_codriver_${faultId}`
    if (sessionStorage.getItem(startedKey)) return
    sessionStorage.setItem(startedKey, '1')
    const rolesMsg = sessionStorage.getItem('startup_roles_msg') ?? ''
    sessionStorage.removeItem('startup_roles_msg')
    const rolesLine = rolesMsg ? `${rolesMsg}\n` : ''
    // Always request HEATMAP re-push so co-driver window gets heat zone data
    const mode = useDashboardStore.getState().coDriverViewMode
    if (mode === 'investigation') {
      chat.send(`${rolesLine}玩家选定 ${faultId} 关卡，扮演副司机角色，现在进入现场调查。请立即推送 <<HEATMAP:...>> 信号以渲染热区。`, { silent: true })
    } else {
      chat.send(`${rolesLine}玩家选定 ${faultId} 关卡，扮演副司机角色，等待主司机派遣`, { silent: true })
    }
  }, [faultId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Idle mode narration (only fires when truly idle, not after dispatch)
  useEffect(() => {
    const narrationKey = `idle_narration_sent_${faultId}`
    if (coDriverViewMode === 'idle' && !sessionStorage.getItem(narrationKey)) {
      sessionStorage.setItem(narrationKey, '1')
      chat.send('[副司机视角] 玩家切到副司机视角，当前未派人调查现场，请按"闲逛模式"样本推送旁白。', { silent: true })
    }
  }, [coDriverViewMode, faultId]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleGSChange(id: GSId, from: GSPosition, to: GSPosition) {
    dispatch({ type: 'SET_GS_STATE', id, position: to })
    chat.send(JSON.stringify({
      action: `副司机扳 ${id} 到${positionLabel(to)}`,
      from_state: from,
      to_state: to,
      timestamp: new Date().toISOString(),
    }))
  }

  function handleReturnToDriverRoom() {
    if (rolesConfig.driver_main === 'human') {
      dispatch({ type: 'SET_SHOWING_CO_DRIVER_VIEW', showing: false })
      navigate(`/driver?fault=${faultId}`)
    } else {
      chat.send('我回司机室了')
    }
  }

  function handleSymptomReport(judgment: 'concentrated' | 'dispersed' | 'unclear') {
    setSelectedJudgment(judgment)
    const primaryUnit = getPrimaryFaultUnit(heatmapData) ?? 'CI3'

    const judgmentText =
      judgment === 'concentrated'
        ? `症状集中于 ${primaryUnit} 一路，大概率为一点接地`
        : judgment === 'dispersed'
        ? '症状分散，各处均有轻微异常，难以明确故障点'
        : '情况复杂，无法判断故障集中点，建议进一步检测'

    const symptomValue = judgment === 'concentrated' ? '集中' : judgment === 'dispersed' ? '分散' : '判断不了'
    dispatch({ type: 'UPDATE_FACT', key: 'hasReport', value: 'YES' })
    dispatch({ type: 'UPDATE_FACT', key: 'symptomReport', value: symptomValue })

    const msg = `[副司机 ACTIONS] 现场判断：${judgmentText}。`
    chat.send(msg)

    // Sync report to driver's chat channel so driver sees it immediately
    dispatch({
      type: 'ADD_CHAT_MESSAGE',
      storageKey: `coze_conv_driver_${faultId}`,
      message: {
        id: `sync_${Date.now()}`,
        role: 'ai',
        content: `【副司机回报】${judgmentText}。`,
        timestamp: Date.now(),
      },
    })

    // Auto-navigate back to driver room after reporting
    setTimeout(() => {
      dispatch({ type: 'SET_SHOWING_CO_DRIVER_VIEW', showing: false })
      navigate(`/driver?fault=${faultId}`)
    }, 800)
  }

  const isInvestigation = coDriverViewMode === 'investigation'
  const [selectedJudgment, setSelectedJudgment] = useState<'concentrated' | 'dispersed' | 'unclear' | null>(null)
  // Judgment buttons only unlock after Bot has sent at least one AI message (investigation report received)
  const botHasResponded = chat.messages.some((m) => m.role === 'ai')
  const groundedGS = Object.entries(gsPanel)
    .filter(([, pos]) => pos === 'ground')
    .map(([id]) => id as GSId)
  const primaryUnit = getPrimaryFaultUnit(heatmapData) ?? 'CI3'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '65% 35%',
        gridTemplateRows: 'auto 1fr auto',
        height: '100vh',
        background: 'var(--bg-deep)',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          gridColumn: '1 / -1',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-elevated)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 4, height: 20, borderRadius: 2, background: 'var(--role-codriver)' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.1em', color: 'var(--role-codriver)', textTransform: 'uppercase' }}>
            副司机大屏 · 机械室视图
          </span>
        </div>
        <button
          onClick={handleReturnToDriverRoom}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 6, fontSize: 13, fontFamily: 'monospace',
            background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)', cursor: 'pointer',
          }}
        >
          ← 我回司机室
        </button>
      </div>

      {/* ── Left: mechanical room + cabinet ── */}
      <div style={{ gridColumn: 1, gridRow: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flexShrink: 0, padding: '10px 12px 4px' }}>
          <MechanicalRoomView heatmapData={heatmapData} />
          <div style={{ marginTop: 4, fontSize: 11, textAlign: 'center', color: isInvestigation ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
            {isInvestigation ? '副司机现场调查模式。请观察各设备热区分布，作出判断。' : '机械室运转正常。如需调查故障现场，请回主司机室派副司机查看。'}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 8px', minHeight: 0 }}>
          <ControlCabinetSVG gsPanel={gsPanel} interactive={isInvestigation} onGSChange={handleGSChange} />
        </div>
      </div>

      {/* ── Right: chat (rows 2–3) ── */}
      <div style={{ gridColumn: 2, gridRow: '2 / 4', borderLeft: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <ChatBox
          messages={chat.messages}
          isLoading={chat.isLoading}
          streamingText={chat.streamingText}
          onSend={chat.send}
          title="与主司机 · AI 导演对讲"
          accentColor={getRoleColor('codriver')}
          className="h-full"
        />
      </div>

      {/* ── Bottom ACTIONS (left column, row 3) ── */}
      <div
        style={{
          gridColumn: 1, gridRow: 3,
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-elevated)',
          flexShrink: 0,
        }}
      >
        {isInvestigation ? (
          /* Investigation mode: judgment panel (no obs list — player reads HEATMAP directly) */
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Judgment buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                {botHasResponded ? '根据热区图，你的判断：' : '等待 AI 副司机回报…'}
              </span>
              <ActionBtn
                label="症状集中"
                color="var(--warn-red)"
                selected={selectedJudgment === 'concentrated'}
                disabled={!botHasResponded}
                onClick={() => handleSymptomReport('concentrated')}
              />
              <ActionBtn
                label="症状分散"
                color="var(--warn-amber)"
                selected={selectedJudgment === 'dispersed'}
                disabled={!botHasResponded}
                onClick={() => handleSymptomReport('dispersed')}
              />
              <ActionBtn
                label="判断不了"
                color="var(--text-tertiary)"
                selected={selectedJudgment === 'unclear'}
                disabled={!botHasResponded}
                onClick={() => handleSymptomReport('unclear')}
              />
              <div style={{ flex: 1 }} />
              {groundedGS.map((id) => (
                <ActionBtn
                  key={id}
                  label={`把 ${id} 复位`}
                  color="var(--accent-cyan)"
                  onClick={() => chat.send(`[副司机 ACTIONS] 我把 ${id} 复位回运行位，GS 开关从接地位扳到运行位`)}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Idle mode: single button */
          <div style={{ padding: '8px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <ActionBtn
              label="我去机械室查看现场"
              color="var(--role-codriver)"
              onClick={() => chat.send('[副司机 ACTIONS] 我去机械室查看现场，请派遣调查任务')}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ActionBtn({ label, color, onClick, selected, disabled }: { label: string; color: string; onClick: () => void; selected?: boolean; disabled?: boolean }) {
  const displayColor = disabled ? 'rgba(255,255,255,0.25)' : color
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        padding: '6px 12px', borderRadius: 6, fontSize: 12,
        fontWeight: selected ? 700 : 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: `1px solid ${displayColor}`,
        background: selected ? `${color}40` : `${displayColor}18`,
        color: displayColor,
        boxShadow: selected ? `0 0 8px ${color}66` : undefined,
      }}
    >
      {label}
    </button>
  )
}

function positionLabel(pos: GSPosition): string {
  return pos === 'run' ? '运行位' : pos === 'disconnect' ? '分闸位' : '接地位'
}
