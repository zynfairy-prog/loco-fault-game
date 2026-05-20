export type RoleId = 'driver' | 'codriver' | 'emergency' | 'electrician'
export type FaultId = 'F001' | 'F002' | 'F003' | 'F004' | 'F005' | 'F006' | 'F007' | 'F008'
export type LEDState = 'inactive' | 'active' | 'warning'
export type MessageRole = 'user' | 'ai' | 'system'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  sender?: string
}

export interface FaultRecord {
  code: string
  description: string
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface GameState {
  selectedRole: RoleId | null
  selectedFault: FaultId | null
  isGameActive: boolean
  faultAlertActive: boolean
}

export interface RoleConfig {
  id: RoleId
  label: string
  labelEn: string
  color: string
  cssVar: string
  description: string
  route: string
  icon: string
}

export interface FaultConfig {
  id: FaultId
  label: string
  description: string
  affectedSystems: string[]
  severity: 'medium' | 'high' | 'critical'
}

export interface InstrumentReading {
  label: string
  value: number
  unit: string
  min: number
  max: number
  warningThreshold?: number
  criticalThreshold?: number
}
