import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GlowCard } from '@/components/common/GlowCard'
import { DataDisplay } from '@/components/common/DataDisplay'
import { ChatBox } from '@/components/chat/ChatBox'
import { useCozeChat } from '@/hooks/useCozeChat'
import { useBroadcastSync } from '@/hooks/useBroadcastSync'
import { getRoleColor } from '@/lib/utils'

const HANDOVER_RECORDS = {
  fault: { code: 'E0612', desc: 'CI1变流柜IGBT过温保护', time: '14:23:05', actions: ['降速至60km/h', '切除CI1单元', '通知应急台'] },
  cmd: [
    { label: '网压', value: '24.8 kV', status: 'warn' },
    { label: '电流', value: '1240 A', status: 'warn' },
    { label: '速度', value: '87.5 km/h', status: 'normal' },
    { label: 'CI1温度', value: '142 °C', status: 'critical' },
    { label: '总风压', value: '0.85 MPa', status: 'normal' },
    { label: '管压', value: '0.50 MPa', status: 'normal' },
  ],
  history: [
    { code: 'E0612', desc: 'CI1变流柜IGBT过温', time: '14:23:05' },
    { code: 'E0401', desc: '1号牵引电机过热', time: '14:23:07' },
    { code: 'W0201', desc: '网压波动超限', time: '14:22:51' },
  ],
}

const TEST_DEVICES = [
  { id: 'insulation', label: '绝缘耐压测试仪', icon: '⚡', available: true },
  { id: 'resistance', label: '绕组电阻测试仪', icon: '🔌', available: true },
  { id: 'thermometer', label: '红外测温仪', icon: '🌡️', available: true },
  { id: 'oscilloscope', label: '示波器', icon: '📊', available: false },
  { id: 'multimeter', label: '万用表', icon: '🔧', available: true },
]

const TEST_OBJECTS = [
  { id: 'motor1', label: '1号牵引电机', fault: true },
  { id: 'ci1', label: 'CI1变流柜', fault: true },
  { id: 'ci2', label: 'CI2变流柜', fault: false },
  { id: 'aux', label: '辅助变压器', fault: false },
  { id: 'battery', label: '蓄电池组', fault: false },
]

const TEST_RESULTS = [
  { label: '绝缘电阻', value: 0.8, unit: 'MΩ', normal: '>1.0', status: 'warn' },
  { label: '绕组电阻', value: 0.42, unit: 'Ω', normal: '0.35±0.05', status: 'critical' },
  { label: '表面温度', value: 142, unit: '°C', normal: '<120', status: 'critical' },
  { label: '绝缘耐压', value: 2.5, unit: 'kV', normal: '>3.0', status: 'warn' },
]

export function ElectricianScreen() {
  const [searchParams] = useSearchParams()
  const faultId = searchParams.get('fault') ?? 'F007'
  const chat = useCozeChat({ systemPrefix: '【我是机车电工】', storageKey: `coze_conv_electrician_${faultId}`, contextPrefix: `[当前剧本: ${faultId}] [玩家角色: 机车电工]` })
  const sentRef = useRef(false)
  const [selectedDevice, setSelectedDevice] = useState<string | null>('insulation')
  const [selectedObject, setSelectedObject] = useState<string | null>('motor1')

  // Listen for store broadcasts from the driver window
  useBroadcastSync(false)

  useEffect(() => {
    if (sentRef.current) return
    sentRef.current = true
    chat.send(`我已选定挑战故障 ${faultId}，扮演机车电工，准备入段检修`)
  }, [faultId]) // eslint-disable-line react-hooks/exhaustive-deps

  const statusColor = (s: string) =>
    s === 'critical' ? 'var(--warn-red)' : s === 'warn' ? 'var(--warn-yellow)' : 'var(--status-ok)'

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-deep)' }}>
      {/* Top 30%: Handover Records */}
      <div
        className="flex gap-2 p-2 border-b flex-shrink-0"
        style={{ height: '30%', borderColor: 'var(--border-subtle)' }}
      >
        {/* Fault Record */}
        <GlowCard title="故障处置记录" glowColor="var(--warn-red)" className="flex-1">
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-sm" style={{ color: 'var(--warn-red)' }}>
                {HANDOVER_RECORDS.fault.code}
              </span>
              <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {HANDOVER_RECORDS.fault.time}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-primary)' }}>
              {HANDOVER_RECORDS.fault.desc}
            </p>
            <div className="space-y-1">
              {HANDOVER_RECORDS.fault.actions.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--status-ok)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{a}</span>
                </div>
              ))}
            </div>
          </div>
        </GlowCard>

        {/* CMD Snapshot */}
        <GlowCard title="CMD 数据快照" glowColor="var(--accent-cyan)" className="flex-1">
          <div className="p-3 grid grid-cols-3 gap-2">
            {HANDOVER_RECORDS.cmd.map((item) => (
              <div key={item.label} className="flex flex-col gap-0.5">
                <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>
                  {item.label}
                </span>
                <span
                  className="font-mono font-semibold text-sm"
                  style={{ color: statusColor(item.status), fontVariantNumeric: 'tabular-nums' }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </GlowCard>

        {/* Fault History */}
        <GlowCard title="微机故障履历" glowColor="var(--warn-orange)" className="flex-1">
          <div className="p-3 space-y-2 overflow-y-auto h-full">
            {HANDOVER_RECORDS.history.map((h, i) => (
              <div key={i} className="flex items-center gap-2 py-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-mono text-xs font-semibold" style={{ color: 'var(--warn-orange)' }}>
                  {h.code}
                </span>
                <span className="text-xs flex-1" style={{ color: 'var(--text-secondary)' }}>
                  {h.desc}
                </span>
                <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {h.time}
                </span>
              </div>
            ))}
          </div>
        </GlowCard>
      </div>

      {/* Bottom 70%: Test Tools */}
      <div className="flex flex-1 min-h-0 gap-2 p-2">
        {/* Left: Device Panel */}
        <GlowCard title="检测设备" glowColor="var(--role-electrician)" className="overflow-hidden" style={{ width: '22%' } as React.CSSProperties}>
          <div className="p-2 space-y-1 overflow-y-auto h-full">
            {TEST_DEVICES.map((d) => (
              <button
                key={d.id}
                onClick={() => d.available && setSelectedDevice(d.id)}
                className="w-full flex items-center gap-2 p-2 rounded text-left transition-all"
                style={{
                  background: selectedDevice === d.id ? 'rgba(63,185,80,0.15)' : 'var(--bg-surface)',
                  border: `1px solid ${selectedDevice === d.id ? 'var(--role-electrician)' : 'var(--border-subtle)'}`,
                  opacity: d.available ? 1 : 0.4,
                  cursor: d.available ? 'pointer' : 'not-allowed',
                }}
              >
                <span style={{ fontSize: 16 }}>{d.icon}</span>
                <span className="text-xs" style={{ color: selectedDevice === d.id ? 'var(--role-electrician)' : 'var(--text-secondary)' }}>
                  {d.label}
                </span>
                {!d.available && (
                  <span className="ml-auto font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>借出</span>
                )}
              </button>
            ))}
          </div>
        </GlowCard>

        {/* Center: Test Object + Parameters */}
        <GlowCard title="检测对象" glowColor="var(--accent-cyan)" className="flex-1 overflow-hidden">
          <div className="p-3 h-full flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2 flex-shrink-0">
              {TEST_OBJECTS.map((obj) => (
                <button
                  key={obj.id}
                  onClick={() => setSelectedObject(obj.id)}
                  className="p-2 rounded border text-center transition-all"
                  style={{
                    background: selectedObject === obj.id ? 'rgba(0,212,255,0.1)' : 'var(--bg-surface)',
                    borderColor: selectedObject === obj.id
                      ? 'var(--accent-cyan)'
                      : obj.fault
                        ? 'var(--warn-red)'
                        : 'var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    className="text-xs font-semibold"
                    style={{ color: obj.fault ? 'var(--warn-red)' : selectedObject === obj.id ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}
                  >
                    {obj.label}
                  </div>
                  {obj.fault && (
                    <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--warn-red)', fontSize: 9 }}>
                      ● 故障
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Test parameters display */}
            <div
              className="flex-1 rounded border p-3 font-mono text-xs"
              style={{ background: 'var(--bg-deep)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
            >
              <div className="mb-2" style={{ color: 'var(--accent-cyan)' }}>
                &gt; 检测对象: {TEST_OBJECTS.find((o) => o.id === selectedObject)?.label ?? '未选择'}
              </div>
              <div className="mb-1" style={{ color: 'var(--text-tertiary)' }}>
                &gt; 检测设备: {TEST_DEVICES.find((d) => d.id === selectedDevice)?.label ?? '未选择'}
              </div>
              <div className="mt-3" style={{ color: 'var(--text-tertiary)' }}>
                &gt; 按下"开始检测"执行测试...
              </div>
              <button
                className="mt-3 px-4 py-1.5 rounded font-mono text-xs"
                style={{
                  background: 'var(--role-electrician)',
                  color: 'var(--bg-deep)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ▶ 开始检测
              </button>
            </div>
          </div>
        </GlowCard>

        {/* Right: Results + Chat */}
        <div className="flex flex-col gap-2" style={{ width: '28%' }}>
          <GlowCard title="测试结果" glowColor="var(--warn-orange)" className="flex-1 overflow-hidden">
            <div className="p-3 space-y-3 overflow-y-auto h-full">
              {TEST_RESULTS.map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{r.label}</div>
                    <div className="font-mono text-xs" style={{ color: 'var(--text-tertiary)', fontSize: 9 }}>
                      正常: {r.normal}
                    </div>
                  </div>
                  <DataDisplay
                    value={r.value}
                    unit={r.unit}
                    size="sm"
                    color={statusColor(r.status)}
                  />
                </div>
              ))}
            </div>
          </GlowCard>
          <div className="flex-shrink-0" style={{ height: 200 }}>
            <ChatBox
              messages={chat.messages}
              isLoading={chat.isLoading}
              streamingText={chat.streamingText}
              onSend={chat.send}
              title="故障分析助手"
              accentColor={getRoleColor('electrician')}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
