import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { ScoreReport } from '@/types/game-state'

const DIMENSIONS = [
  { key: 'diagnosis' as const, label: '根因诊断' },
  { key: 'procedure' as const, label: '处置阶梯' },
  { key: 'decision' as const, label: '决策正确性' },
  { key: 'safety' as const, label: '安全意识' },
  { key: 'teamwork' as const, label: '协同沟通' },
]

interface Props {
  score: ScoreReport
}

export function ScoreRadarChart({ score }: Props) {
  const data = DIMENSIONS.map(({ key, label }) => ({
    dimension: label,
    本次得分: score[key],
    满分: 20,
  }))

  // Custom tick: turn red if the score for that axis is below 12
  const CustomTick = ({ x, y, payload }: any) => {
    const dim = DIMENSIONS.find((d) => d.label === payload.value)
    const val = dim ? score[dim.key] : 20
    const color = val < 12 ? '#ff6b6b' : '#e0e6ed'
    return (
      <text x={x} y={y} fill={color} fontSize={13} textAnchor="middle" dominantBaseline="central">
        {payload.value}
      </text>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#3a4a5a" />
        <PolarAngleAxis dataKey="dimension" tick={<CustomTick />} />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 20]}
          tick={{ fill: '#8a9ba8', fontSize: 10 }}
          tickCount={5}
        />
        <Radar
          name="本次得分"
          dataKey="本次得分"
          stroke="#3ddc97"
          fill="#3ddc97"
          fillOpacity={0.45}
          strokeWidth={2}
        />
        <Radar
          name="满分参考"
          dataKey="满分"
          stroke="#6c7a89"
          fill="transparent"
          strokeDasharray="4 3"
          strokeWidth={1}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: '#8a9ba8', paddingTop: 8 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
