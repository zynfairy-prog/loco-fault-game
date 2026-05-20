import { ScoreRadarChart } from '@/components/ScoreRadarChart'
import type { ScoreReport } from '@/types/game-state'

const DIMENSIONS = [
  {
    key: 'diagnosis' as const,
    label: '根因诊断',
    full: 20,
    tips: {
      high: '准确识别了故障根因，逻辑链完整。',
      mid: '根因判断基本正确，但推理过程有跳步。',
      low: '未能准确定位根因，建议复习接地保护动作逻辑。',
    },
    knowledge: '接地保护动作 → 主断跳闸 → 牵引中断，三者因果关系',
    pitfall: '注意区分"接地故障"与"过流保护"的触发条件',
  },
  {
    key: 'procedure' as const,
    label: '处置阶梯',
    full: 20,
    tips: {
      high: '处置步骤规范，阶梯顺序正确。',
      mid: '大部分步骤正确，但顺序有误或遗漏了向调度报告。',
      low: '处置步骤混乱，建议重新学习 F001 标准处置流程。',
    },
    knowledge: '停车 → 报调度 → 检查 → 复位 → 确认 → 请求救援',
    pitfall: '不能在未报调度前擅自复位，否则扣分',
  },
  {
    key: 'decision' as const,
    label: '决策正确性',
    full: 20,
    tips: {
      high: '关键决策点判断准确，无误操作。',
      mid: '部分决策存在犹豫或走了弯路。',
      low: '出现了错误操作（如在接地故障未消除时强行复位）。',
    },
    knowledge: '接地故障未消除时复位会导致二次跳闸，加重故障',
    pitfall: '切除单元 ≠ 消除故障，切除只是隔离，需后续检修',
  },
  {
    key: 'safety' as const,
    label: '安全意识',
    full: 20,
    tips: {
      high: '全程安全意识到位，未出现违规操作。',
      mid: '安全意识基本到位，但有 1-2 处未按规程确认。',
      low: '存在安全隐患操作，建议重点复习安全规程。',
    },
    knowledge: '高压作业前必须确认断电、验电、挂接地线',
    pitfall: '蓄电池断开后控制电路失电，操作前必须告知全体人员',
  },
  {
    key: 'teamwork' as const,
    label: '协同沟通',
    full: 20,
    tips: {
      high: '与调度、副司机沟通及时准确，信息传递完整。',
      mid: '沟通基本到位，但部分信息传递不完整或延迟。',
      low: '沟通不足，未及时向调度报告或未通知副司机。',
    },
    knowledge: '报调度要素：车次、位置、故障现象、已采取措施、请求事项',
    pitfall: '应急台呼叫和调度报告是两个独立动作，不能互相替代',
  },
]

function getTipLevel(score: number): 'high' | 'mid' | 'low' {
  if (score >= 16) return 'high'
  if (score >= 12) return 'mid'
  return 'low'
}

function ScoreBar({ value, max = 20 }: { value: number; max?: number }) {
  const pct = Math.round((value / max) * 100)
  const color = value < 12 ? '#ff6b6b' : value >= 16 ? '#3ddc97' : '#f0a500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#3a4a5a' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="font-mono text-xs w-10 text-right" style={{ color }}>
        {value}/{max}
      </span>
    </div>
  )
}

interface Props {
  report: ScoreReport
  onReplay?: () => void
  onRetry?: () => void
  onExport?: () => void
}

export function ScoreReportPanel({ report, onReplay, onRetry, onExport }: Props) {
  const grade =
    report.total >= 90 ? { label: '优秀', color: '#3ddc97' }
    : report.total >= 75 ? { label: '良好', color: '#f0a500' }
    : report.total >= 60 ? { label: '及格', color: '#ff9f43' }
    : { label: '不及格', color: '#ff6b6b' }

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: 'var(--bg-deep)', color: '#e0e6ed' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0"
        style={{ borderColor: '#3a4a5a', background: 'var(--bg-elevated)' }}
      >
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 16, fontWeight: 700, color: '#e0e6ed' }}>评分报告</span>
          <span
            className="px-2 py-0.5 rounded font-mono text-sm font-bold"
            style={{ background: `${grade.color}22`, color: grade.color, border: `1px solid ${grade.color}` }}
          >
            {grade.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span style={{ fontSize: 13, color: '#8a9ba8' }}>总分</span>
          <span
            className="font-mono font-bold"
            style={{ fontSize: 32, color: grade.color, lineHeight: 1 }}
          >
            {report.total}
          </span>
          <span style={{ fontSize: 13, color: '#8a9ba8' }}>/100</span>
        </div>
      </div>

      {/* Body: two columns */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: radar chart */}
        <div
          className="flex flex-col items-center justify-center border-r p-4"
          style={{ width: '45%', borderColor: '#3a4a5a' }}
        >
          <ScoreRadarChart score={report} />

          {/* Score summary bars */}
          <div className="w-full flex flex-col gap-2 mt-2 px-2">
            {DIMENSIONS.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-0.5">
                <span style={{ fontSize: 11, color: '#8a9ba8' }}>{label}</span>
                <ScoreBar value={report[key]} />
              </div>
            ))}
          </div>
        </div>

        {/* Right: text commentary */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {DIMENSIONS.map(({ key, label, tips, knowledge, pitfall }) => {
            const val = report[key]
            const level = getTipLevel(val)
            const dimColor = val < 12 ? '#ff6b6b' : val >= 16 ? '#3ddc97' : '#f0a500'
            return (
              <div
                key={key}
                className="rounded-lg p-3 flex flex-col gap-1.5"
                style={{ background: '#161b22', border: `1px solid #3a4a5a` }}
              >
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 13, fontWeight: 600, color: dimColor }}>{label}</span>
                  <span className="font-mono text-xs" style={{ color: dimColor }}>
                    {val}/20
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#c0cdd8', lineHeight: 1.6 }}>{tips[level]}</p>
                <div
                  className="rounded px-2 py-1.5 flex flex-col gap-1"
                  style={{ background: '#0d1117' }}
                >
                  <span style={{ fontSize: 10, color: '#3ddc97', fontWeight: 600 }}>📚 知识点</span>
                  <span style={{ fontSize: 11, color: '#8a9ba8', lineHeight: 1.5 }}>{knowledge}</span>
                  <span style={{ fontSize: 10, color: '#ff9f43', fontWeight: 600, marginTop: 2 }}>
                    ⚠ 易混淆
                  </span>
                  <span style={{ fontSize: 11, color: '#8a9ba8', lineHeight: 1.5 }}>{pitfall}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer buttons */}
      <div
        className="flex items-center justify-end gap-3 px-6 py-3 border-t flex-shrink-0"
        style={{ borderColor: '#3a4a5a', background: 'var(--bg-elevated)' }}
      >
        {onReplay && (
          <button
            type="button"
            onClick={onReplay}
            className="px-4 py-2 rounded border text-sm"
            style={{ borderColor: '#3a4a5a', color: '#8a9ba8' }}
          >
            查看回放
          </button>
        )}
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="px-4 py-2 rounded border text-sm"
            style={{ borderColor: '#3ddc97', color: '#3ddc97', background: 'rgba(61,220,151,0.08)' }}
          >
            导出报告
          </button>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 rounded text-sm font-semibold"
            style={{ background: '#3ddc97', color: '#0a0e14' }}
          >
            再来一局
          </button>
        )}
      </div>
    </div>
  )
}
