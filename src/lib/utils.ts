import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { RoleId, FaultId, RoleConfig, FaultConfig } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 8)
}

export function formatNumber(n: number, decimals = 1): string {
  return n.toFixed(decimals)
}

export function getRoleCssVar(role: RoleId): string {
  return `var(--role-${role})`
}

export function getRoleColor(role: RoleId): string {
  const map: Record<RoleId, string> = {
    driver: '#00D4FF',
    codriver: '#B180FF',
    emergency: '#FFB800',
    electrician: '#3FB950',
  }
  return map[role]
}

export const ROLE_CONFIGS: RoleConfig[] = [
  {
    id: 'driver',
    label: '主司机',
    labelEn: 'Main Driver',
    color: '#00D4FF',
    cssVar: '--role-driver',
    description: '驾驶室操控，监控仪表，指挥处置',
    route: '/driver',
    icon: '🚂',
  },
  {
    id: 'codriver',
    label: '副司机',
    labelEn: 'Co-Driver',
    color: '#B180FF',
    cssVar: '--role-codriver',
    description: '机械室巡检，执行操作指令',
    route: '/codriver',
    icon: '🔧',
  },
  {
    id: 'emergency',
    label: '应急台',
    labelEn: 'Emergency Dispatcher',
    color: '#FFB800',
    cssVar: '--role-emergency',
    description: '远程监控，协调调度，发送建议',
    route: '/emergency',
    icon: '📡',
  },
  {
    id: 'electrician',
    label: '机车电工',
    labelEn: 'Electrician',
    color: '#3FB950',
    cssVar: '--role-electrician',
    description: '故障检测，设备测试，记录归档',
    route: '/electrician',
    icon: '⚡',
  },
]

export const FAULT_CONFIGS: FaultConfig[] = [
  {
    id: 'F001',
    label: 'F001 牵引电机过热',
    description: '1号牵引电机温度超过额定值，触发过热保护',
    affectedSystems: ['牵引系统', '冷却系统'],
    severity: 'high',
  },
  {
    id: 'F002',
    label: 'F002 变流柜故障',
    description: '主变流柜IGBT模块故障，牵引力下降50%',
    affectedSystems: ['变流系统', '牵引系统'],
    severity: 'critical',
  },
  {
    id: 'F003',
    label: 'F003 制动系统异常',
    description: '列车管压力异常，制动响应延迟',
    affectedSystems: ['制动系统', '风压系统'],
    severity: 'critical',
  },
  {
    id: 'F004',
    label: 'F004 受电弓故障',
    description: '受电弓升弓失败，无法从接触网取电',
    affectedSystems: ['受流系统', '高压系统'],
    severity: 'critical',
  },
  {
    id: 'F005',
    label: 'F005 辅助变压器故障',
    description: '辅助变压器输出电压异常，辅助系统供电中断',
    affectedSystems: ['辅助系统', '控制系统'],
    severity: 'high',
  },
  {
    id: 'F006',
    label: 'F006 蓄电池欠压',
    description: '蓄电池电压低于阈值，应急供电能力不足',
    affectedSystems: ['蓄电池系统', '控制系统'],
    severity: 'medium',
  },
  {
    id: 'F007',
    label: 'F007 微机控制系统故障',
    description: '主控微机通信中断，自动控制功能失效',
    affectedSystems: ['控制系统', '通信系统'],
    severity: 'high',
  },
  {
    id: 'F008',
    label: 'F008 轴温报警',
    description: '3号轴轴承温度超限，需立即减速检查',
    affectedSystems: ['走行系统', '监测系统'],
    severity: 'high',
  },
]

export function getRoleConfig(id: RoleId): RoleConfig {
  return ROLE_CONFIGS.find((r) => r.id === id)!
}

export function getFaultConfig(id: FaultId): FaultConfig {
  return FAULT_CONFIGS.find((f) => f.id === id)!
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}
