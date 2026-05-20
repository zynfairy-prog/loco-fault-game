import type { GSId, GSPosition, GSPanelState } from '@/types/game-state'
import { GSKnob } from './GSKnob'

interface ControlCabinetSVGProps {
  gsPanel: GSPanelState
  interactive: boolean
  onGSChange: (id: GSId, from: GSPosition, to: GSPosition) => void
}

// GS layout per spec: upper group top-to-bottom GS8,GS6,GS5,GS4; lower group GS7,GS3,GS2,GS1
const GS_UPPER: Array<{ id: GSId; label: string }> = [
  { id: 'GS8', label: 'APU2接地' },
  { id: 'GS6', label: 'CI6接地' },
  { id: 'GS5', label: 'CI5接地' },
  { id: 'GS4', label: 'CI4接地' },
]
const GS_LOWER: Array<{ id: GSId; label: string }> = [
  { id: 'GS7', label: 'APU1接地' },
  { id: 'GS3', label: 'CI3接地' },
  { id: 'GS2', label: 'CI2接地' },
  { id: 'GS1', label: 'CI1接地' },
]

// QA switch positions (row, col) in a grid
const QA_SWITCHES_ROW1 = ['QA17','QA18','QA21','QA22','QA11','QA12','QA13','QA14','QA15','QA16']
const QA_SWITCHES_ROW2 = ['QA19','QA20','','','QA25','QA72','QA74','','QA23','QA24']

export function ControlCabinetSVG({ gsPanel, interactive, onGSChange }: ControlCabinetSVGProps) {
  return (
    <div className="bg-gray-900 border border-gray-600 rounded-lg overflow-hidden">
      {/* Cabinet header */}
      <div className="bg-gray-800 border-b border-gray-600 px-3 py-1.5 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px #4ade80' }} />
        <span className="text-xs font-mono text-gray-300 tracking-wider">控制柜 · HXD3-CTRL-01</span>
      </div>

      {/* Upper section: QA switches (non-interactive background) */}
      <div className="p-3 border-b border-gray-700">
        <div className="text-[9px] text-gray-500 mb-2 uppercase tracking-widest">QA 自动开关阵</div>
        <div className="space-y-1.5">
          {/* Row 1 */}
          <div className="flex gap-1 flex-wrap">
            {QA_SWITCHES_ROW1.map((label) => (
              <QASwitch key={label} label={label} />
            ))}
          </div>
          {/* Row 2 */}
          <div className="flex gap-1 flex-wrap">
            {QA_SWITCHES_ROW2.map((label, i) =>
              label ? <QASwitch key={label} label={label} /> : <div key={i} className="w-8" />
            )}
          </div>
          {/* Buttons and meter row */}
          <div className="flex gap-2 items-center mt-1">
            <ButtonSwitch label="SB95" color="red" />
            <ButtonSwitch label="SA96" color="yellow" />
            <ButtonSwitch label="SA75" color="green" />
            <div className="ml-2 flex items-center gap-1">
              <div className="w-8 h-8 rounded-full border-2 border-gray-500 bg-gray-800 flex items-center justify-center">
                <div className="w-0.5 h-3 bg-gray-300 origin-bottom" style={{ transform: 'rotate(-30deg)' }} />
              </div>
              <span className="text-[9px] text-gray-400">PV71</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lower section: interactive area */}
      <div className="p-3 flex gap-4">
        {/* Left: PWH1 + KE relays + GND-MF */}
        <div className="flex flex-col gap-2 min-w-[80px]">
          {/* PWH1 */}
          <div className="border border-gray-600 rounded p-1.5 bg-gray-800">
            <div className="text-[9px] text-gray-400 mb-1">PWH1</div>
            <div className="w-12 h-16 bg-gray-700 rounded border border-gray-500 flex items-center justify-center">
              <span className="text-[8px] text-gray-400 rotate-90">可拆卸</span>
            </div>
          </div>
          {/* KE relays */}
          <div className="border border-gray-600 rounded p-1.5 bg-gray-800">
            <div className="text-[9px] text-gray-400 mb-1">KE 继电器</div>
            <div className="space-y-0.5">
              {['KE17','KE18','KE19','KE20','KE21'].map((ke) => (
                <div key={ke} className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-600 border border-gray-500 rounded-sm" />
                  <span className="text-[8px] text-gray-400">{ke}</span>
                </div>
              ))}
            </div>
          </div>
          {/* GND-MF */}
          <div className="border border-gray-600 rounded p-1 bg-gray-800">
            <div className="text-[8px] text-gray-400">GND-MF</div>
            <div className="flex gap-0.5 mt-0.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-1.5 h-3 bg-gray-600 border border-gray-500" />
              ))}
            </div>
          </div>
        </div>

        {/* Middle: QS isolators */}
        <div className="flex flex-col gap-3 min-w-[60px]">
          <div className="text-[9px] text-gray-500 uppercase tracking-widest">QS 刀闸</div>
          {['QS3','QS4','QS11'].map((qs) => (
            <QSIsolator key={qs} label={qs} />
          ))}
        </div>

        {/* Right: GS knobs - the interactive zone */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="text-[9px] text-gray-500 uppercase tracking-widest flex items-center gap-2">
            GS 接地开关
            {interactive && (
              <span className="text-[8px] text-cyan-400 bg-cyan-900/30 px-1.5 py-0.5 rounded">可操作</span>
            )}
          </div>
          {/* Upper group: GS8 GS6 GS5 GS4 — horizontal */}
          <div>
            <div className="text-[8px] text-gray-500 mb-1">上组</div>
            <div className="grid grid-cols-4 gap-2">
              {GS_UPPER.map(({ id, label }) => (
                <GSKnob
                  key={id}
                  id={id}
                  label={label}
                  position={gsPanel[id]}
                  interactive={interactive}
                  onPositionChange={onGSChange}
                />
              ))}
            </div>
          </div>
          {/* Lower group: GS7 GS3 GS2 GS1 — horizontal */}
          <div>
            <div className="text-[8px] text-gray-500 mb-1">下组</div>
            <div className="grid grid-cols-4 gap-2">
              {GS_LOWER.map(({ id, label }) => (
                <GSKnob
                  key={id}
                  id={id}
                  label={label}
                  position={gsPanel[id]}
                  interactive={interactive}
                  onPositionChange={onGSChange}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function QASwitch({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-8 h-5 bg-gray-700 border border-gray-500 rounded-sm flex items-center justify-center relative">
        {/* Switch handle */}
        <div className="w-1 h-3 bg-gray-300 rounded-full" />
      </div>
      <span className="text-[7px] text-gray-500 font-mono">{label}</span>
    </div>
  )
}

function ButtonSwitch({ label, color }: { label: string; color: 'red' | 'yellow' | 'green' }) {
  const colorMap = { red: '#ef4444', yellow: '#fbbf24', green: '#4ade80' }
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className="w-5 h-5 rounded-full border-2 border-gray-500"
        style={{ background: colorMap[color] + '44', borderColor: colorMap[color] }}
      />
      <span className="text-[7px] text-gray-500 font-mono">{label}</span>
    </div>
  )
}

function QSIsolator({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-10 h-14 bg-gray-800 border border-gray-600 rounded flex flex-col items-center justify-between p-1">
        {/* Handle */}
        <div className="w-2 h-6 bg-gray-400 rounded-full" />
        {/* Base */}
        <div className="w-8 h-2 bg-gray-600 rounded" />
      </div>
      <span className="text-[8px] text-gray-400 font-mono">{label}</span>
    </div>
  )
}
