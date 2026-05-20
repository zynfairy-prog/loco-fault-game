export const LED_NAMES = [
  'T1过热', 'T2过热', 'T3过热', 'T4过热', 'T5过热', 'T6过热',
  'CI1故障', 'CI2故障', 'CI3故障', 'CI4故障', 'CI5故障', 'CI6故障',
  '接地', '主断分', '网压低', '网压高', '过流', '欠压',
  '制动异常', '风压低', '管压低', '蓄电池', '辅变故障', '受电弓故障',
  '轮滑1', '轮滑2', '轮滑3', '轮滑4', '微机故障', '通信中断',
] as const

export type LEDName = typeof LED_NAMES[number]
export type LEDState = 'off' | 'on' | 'blink'

export const METER_NAMES = ['网压', '电流', '速度', '总风压', '管压'] as const
export type MeterName = typeof METER_NAMES[number]

export interface FaultCode {
  code: string
  description: string
  timestamp: string
}

export interface TaskState {
  current: number
  total: number
  description: string
  history: string[]
}

export type TrainState = 'idle' | 'running' | 'emergency_stop'

export interface CIUnit {
  id: 'CI1' | 'CI2' | 'CI3' | 'CI4' | 'CI5' | 'CI6'
  status: 'normal' | 'fault'
  current: number
  temperature: number
}

/** Legacy 5×20 format (old signal parser) */
export interface ScoreReportLegacy {
  diagnosis: number
  procedure: number
  decision: number
  safety: number
  teamwork: number
  total: number
}

/** New v2.5.2 format: 5×100 dimensions + verdict + comments */
export interface PlayerActionLog {
  time: string
  action: string
  result: string
}

export interface ScoreReportV2 {
  investigation: number | 'N/A'
  decision: number | 'N/A'
  operation: number | 'N/A'
  communication: number | 'N/A'
  safety: number | 'N/A'
  total: number
  verdict: 'A' | 'B' | 'C' | 'D' | "D'"
  mode?: string
  human_roles?: string
  ai_roles?: string
  comments?: string
  player_actions_log?: PlayerActionLog[]
}

export type ScoreReport = ScoreReportLegacy | ScoreReportV2

export function isScoreReportV2(r: ScoreReport): r is ScoreReportV2 {
  return 'investigation' in r
}

export const HEATMAP_POSITIONS = [
  'CI1', 'CI2', 'CI3', 'CI4', 'CI5', 'CI6',
  'CABLE_TR_CI', 'CABLE_CI_MOTOR', 'TRANSFORMER', 'MOTOR_BOX',
] as const
export type HeatmapPosition = typeof HEATMAP_POSITIONS[number]
export type HeatmapData = Record<HeatmapPosition, number>

export const GS_IDS = ['GS1', 'GS2', 'GS3', 'GS4', 'GS5', 'GS6', 'GS7', 'GS8'] as const
export type GSId = typeof GS_IDS[number]
export type GSPosition = 'run' | 'disconnect' | 'ground'
export type GSPanelState = Record<GSId, GSPosition>

/** Player count and role assignment for multi-player mode */
export type PlayerCount = 1 | 2 | 3 | 4
export type RoleAssignment = 'human' | 'AI'
export interface RolesConfig {
  driver_main: RoleAssignment
  driver_assist: RoleAssignment
  dispatcher: RoleAssignment
  coordinator: RoleAssignment
}

export interface GameFacts {
  phase: 'T0' | 'T1' | 'T2' | 'T2_5_dispatch' | 'T3_trial' | 'T5_isolation' | 'T6_dispatch_comm' | 'T7_scoring'
  hasDispatch: 'YES' | 'NO'
  hasReport: 'YES' | 'NO'
  symptomReport: '集中' | '分散' | '判断不了' | null
  hasGSAction: 'YES' | 'NO'
  whichGS: string | null
  gsResult: '成功' | '失败' | null
  hasIsolation: 'YES' | 'NO'
  whichCI: string | null
  dispatchApproval: 'pending' | 'approved' | 'rescue' | null
  hasViewedMFD: 'YES' | 'NO'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: number
  quickActions?: string[]
}

export interface GameDashboardState {
  leds: Record<string, LEDState>
  meters: Record<string, number>
  faultCodes: FaultCode[]
  task: TaskState
  trainState: TrainState
  faultId: string
  role: string
  quickActions: string[]
  scoreReport: ScoreReport | null
  /** CI unit data pushed by AI via <<CI_PANEL>>. null = not yet received. */
  ciPanel: CIUnit[] | null
  /** Whether the MicroDisplayModal is open (driver window only, not broadcast). */
  microDisplayOpen: boolean
  /** Heatmap temperature data for mechanical room view. null = not yet received. */
  heatmapData: HeatmapData | null
  /** GS rotary switch states for co-driver panel. */
  gsPanel: GSPanelState
  /** Roles configuration for multi-player mode. */
  rolesConfig: RolesConfig
  /** Whether co-driver is in investigation mode (any heatmap value > 5). */
  coDriverViewMode: 'idle' | 'investigation'
  /** Whether main driver screen is showing co-driver view (single player only). */
  showingCoDriverView: boolean
  /** Persisted chat messages keyed by storageKey, survives view switches. */
  chatHistory: Record<string, ChatMessage[]>
  /** Game facts snapshot for Bot context injection. */
  facts: GameFacts
  /** GS3 animation phase for co-driver operation overlay. */
  gsAnimationPhase: 'idle' | 'waiting_codriver' | 'done'
}

export type GameAction =
  | { type: 'SET_LED'; led: string; state: LEDState }
  | { type: 'SET_METER'; meter: string; value: number }
  | { type: 'ADD_FAULT_CODE'; faultCode: FaultCode }
  | { type: 'CLEAR_FAULT_CODES' }
  | { type: 'SET_TASK'; current: number; total: number; description: string }
  | { type: 'TASK_DONE' }
  | { type: 'SET_TRAIN_STATE'; state: TrainState }
  | { type: 'SET_QUICK_ACTIONS'; actions: string[] }
  | { type: 'SHOW_SCORE_REPORT'; report: ScoreReport }
  | { type: 'SET_CI_PANEL'; units: CIUnit[] }
  | { type: 'OPEN_MICRO_DISPLAY' }
  | { type: 'CLOSE_MICRO_DISPLAY' }
  | { type: 'SET_HEATMAP'; data: HeatmapData }
  | { type: 'SET_GS_PANEL'; states: GSPanelState }
  | { type: 'SET_GS_STATE'; id: GSId; position: GSPosition }
  | { type: 'SET_ROLES_CONFIG'; config: RolesConfig }
  | { type: 'SET_CO_DRIVER_VIEW'; mode: 'idle' | 'investigation' }
  | { type: 'SET_SHOWING_CO_DRIVER_VIEW'; showing: boolean }
  | { type: 'ADD_CHAT_MESSAGE'; storageKey: string; message: ChatMessage }
  | { type: 'UPDATE_FACT'; key: keyof GameFacts; value: GameFacts[keyof GameFacts] }
  | { type: 'SET_GS_ANIMATION_PHASE'; phase: 'idle' | 'waiting_codriver' | 'done' }
  | { type: 'RESET' }

export function createInitialDashboardState(faultId: string, role: string): GameDashboardState {
  const leds: Record<string, LEDState> = {}
  LED_NAMES.forEach((name) => { leds[name] = 'off' })

  const gsPanel = {} as GSPanelState
  GS_IDS.forEach((id) => { gsPanel[id] = 'run' })

  return {
    leds,
    meters: { 网压: 25, 电流: 0, 速度: 0, 总风压: 0.85, 管压: 0.50 },
    faultCodes: [],
    task: { current: 0, total: 0, description: '', history: [] },
    trainState: 'idle',
    faultId,
    role,
    quickActions: [],
    scoreReport: null,
    ciPanel: null,
    microDisplayOpen: false,
    heatmapData: null,
    gsPanel,
    rolesConfig: {
      driver_main: 'human',
      driver_assist: 'AI',
      dispatcher: 'AI',
      coordinator: 'AI',
    },
    coDriverViewMode: 'idle',
    showingCoDriverView: false,
    chatHistory: {},
    facts: {
      phase: 'T0',
      hasDispatch: 'NO',
      hasReport: 'NO',
      symptomReport: null,
      hasGSAction: 'NO',
      whichGS: null,
      gsResult: null,
      hasIsolation: 'NO',
      whichCI: null,
      dispatchApproval: null,
      hasViewedMFD: 'NO',
    },
    gsAnimationPhase: 'idle',
  }
}
