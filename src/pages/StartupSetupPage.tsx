import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboardStore } from '@/stores/dashboardStore'
import type { PlayerCount, RolesConfig } from '@/types/game-state'

type RoleKey = keyof RolesConfig
const ROLE_LABELS: Record<RoleKey, string> = {
  driver_main: '主司机',
  driver_assist: '副司机',
  dispatcher: '调度',
  coordinator: '应急台',
}
const ROLE_DESCRIPTIONS: Record<RoleKey, string> = {
  driver_main: '主线视角，负责指挥处置',
  driver_assist: '前往机械室查看现场',
  dispatcher: '接收停车报告，批准开车',
  coordinator: '提供 CMD 数据支持',
}

const FAULT_OPTIONS = [
  { id: 'F001', label: 'F001 主接地故障，主断路器跳闸' },
  { id: 'F002', label: 'F002 CI1 变流柜过温' },
  { id: 'F003', label: 'F003 牵引电机绝缘下降' },
  { id: 'F004', label: 'F004 辅助变压器故障' },
  { id: 'F005', label: 'F005 受电弓故障' },
  { id: 'F006', label: 'F006 制动系统异常' },
  { id: 'F007', label: 'F007 网压异常波动' },
  { id: 'F008', label: 'F008 通信中断' },
]

const PLAYER_COUNT_LABELS: Record<PlayerCount, string> = {
  1: '演示',
  2: '主副',
  3: '三人',
  4: '教学',
}

export function StartupSetupPage() {
  const navigate = useNavigate()
  const { dispatch, initSession } = useDashboardStore()

  const [playerCount, setPlayerCount] = useState<PlayerCount>(1)
  const [selectedFault, setSelectedFault] = useState('F001')
  const [myRole, setMyRole] = useState<RoleKey>('driver_main')

  function buildRolesConfig(): RolesConfig {
    if (playerCount === 4) {
      // All human — each player picks their own screen
      return { driver_main: 'human', driver_assist: 'human', dispatcher: 'human', coordinator: 'human' }
    }
    const config: RolesConfig = {
      driver_main: 'AI',
      driver_assist: 'AI',
      dispatcher: 'AI',
      coordinator: 'AI',
    }
    if (playerCount === 1) {
      config[myRole] = 'human'
    } else if (playerCount === 2) {
      config.driver_main = 'human'
      config.driver_assist = 'human'
    } else {
      // 3 players: main + assist + one more
      config.driver_main = 'human'
      config.driver_assist = 'human'
      config.dispatcher = 'human'
    }
    return config
  }

  function handleStart() {
    const rolesConfig = buildRolesConfig()
    const roleForRoute = playerCount === 1 ? myRole : 'driver_main'
    const routeMap: Record<RoleKey, string> = {
      driver_main: 'driver',
      driver_assist: 'codriver',
      dispatcher: 'dispatcher',
      coordinator: 'emergency',
    }

    initSession(selectedFault, roleForRoute)
    dispatch({ type: 'SET_ROLES_CONFIG', config: rolesConfig })

    // Build ROLES startup message
    const rolesMsg = `[ROLES:driver_main:${rolesConfig.driver_main};driver_assist:${rolesConfig.driver_assist};dispatcher:${rolesConfig.dispatcher};coordinator:${rolesConfig.coordinator}]`
    // Store in sessionStorage for useCozeChat to prepend
    sessionStorage.setItem('startup_roles_msg', rolesMsg)

    navigate(`/${routeMap[roleForRoute]}?fault=${selectedFault}`)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg-deep)' }}
    >
      <div
        className="w-full max-w-2xl rounded-xl border p-8 space-y-8"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
      >
        {/* Title */}
        <div>
          <h1 className="text-lg font-display font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
            机车故障·多岗协同诊断智能体——基于生成式 AI 的 HXD3 型电力机车应急处置情景化训练系统
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            关卡选择 · 角色配置
          </p>
        </div>

        {/* Fault selection */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>
            选择关卡
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FAULT_OPTIONS.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFault(f.id)}
                className="text-left px-3 py-2 rounded-lg border text-sm transition-all"
                style={{
                  background: selectedFault === f.id ? 'rgba(0,212,255,0.1)' : 'var(--bg-surface)',
                  borderColor: selectedFault === f.id ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                  color: selectedFault === f.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                }}
              >
                <span className="font-mono font-bold mr-2">{f.id}</span>
                <span className="text-xs">{f.label.replace(f.id + ' ', '')}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Player count */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>
            今天几个人玩？
          </label>
          <div className="flex gap-2">
            {([1, 2, 3, 4] as PlayerCount[]).map((n) => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                className="flex-1 py-3 rounded-lg border text-center transition-all"
                style={{
                  background: playerCount === n ? 'rgba(0,212,255,0.1)' : 'var(--bg-surface)',
                  borderColor: playerCount === n ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                  color: playerCount === n ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                }}
              >
                <div className="text-lg font-bold">{n} 人</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  （{PLAYER_COUNT_LABELS[n]}）
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Role selection (1-player only) */}
        {playerCount === 1 && (
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>
              您扮演
            </label>
            <div className="space-y-2">
              {(Object.keys(ROLE_LABELS) as RoleKey[]).map((role) => (
                <button
                  key={role}
                  onClick={() => setMyRole(role)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all"
                  style={{
                    background: myRole === role ? 'rgba(0,212,255,0.08)' : 'var(--bg-surface)',
                    borderColor: myRole === role ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: myRole === role ? 'var(--accent-cyan)' : 'var(--border-emphasis)' }}
                  >
                    {myRole === role && (
                      <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-cyan)' }} />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: myRole === role ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                      {ROLE_LABELS[role]}
                      {role === 'driver_main' && (
                        <span className="ml-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>（推荐——主线视角）</span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {ROLE_DESCRIPTIONS[role]}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--text-tertiary)' }}>
              其余角色由 AI 扮演。游戏中您随时可切换到副司机视角亲自查看现场或操作 GS。
            </p>
          </div>
        )}

        {/* Multi-player note */}
        {playerCount > 1 && playerCount < 4 && (
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            {playerCount === 2 && '2 人模式：主司机 + 副司机由玩家扮演，调度和应急台由 AI 扮演。'}
            {playerCount === 3 && '3 人模式：主司机 + 副司机 + 调度由玩家扮演，应急台由 AI 扮演。'}
          </div>
        )}
        {playerCount === 4 && (
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            4 人教学模式：每位学生在各自设备上分别选择自己扮演的角色后开始训练。
          </div>
        )}

        {/* Start button */}
        <button
          onClick={handleStart}
          className="w-full py-4 rounded-xl text-base font-semibold transition-all hover:brightness-110 active:scale-[0.99]"
          style={{
            background: 'linear-gradient(135deg, var(--accent-cyan-dim), var(--accent-cyan))',
            color: '#0a0f1a',
          }}
        >
          开始训练
        </button>
      </div>
    </div>
  )
}
