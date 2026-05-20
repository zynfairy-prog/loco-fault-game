import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ROLE_CONFIGS, FAULT_CONFIGS } from '@/lib/utils'
import { useGameStore } from '@/stores/gameStore'
import type { RoleId, FaultId } from '@/types'

export function HomePage() {
  const navigate = useNavigate()
  const { selectedRole, selectedFault, setRole, setFault, startGame } = useGameStore()
  const [hoveredRole, setHoveredRole] = useState<RoleId | null>(null)

  const handleStart = () => {
    if (!selectedRole || !selectedFault) return
    startGame()
    navigate(`/${selectedRole}?fault=${selectedFault}`)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-8 py-10 overflow-auto"
      style={{ background: 'var(--bg-deep)' }}
    >
      {/* Title */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-[var(--accent-cyan)]" />
          <span className="font-mono text-xs tracking-[0.3em] uppercase" style={{ color: 'var(--accent-cyan)' }}>
            HXD3 · TRAINING SYSTEM
          </span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-[var(--accent-cyan)]" />
        </div>
        <h1
          className="font-display font-semibold leading-tight mb-1"
          style={{ fontSize: 32, color: 'var(--text-primary)' }}
        >
          机车故障应急处置训练系统
        </h1>
        <p className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
          Locomotive Fault Emergency Response Training · AI-Guided Simulation
        </p>
      </div>

      {/* HXD3 SVG Illustration */}
      <div className="mb-8 w-full max-w-2xl">
        <HXD3Illustration />
      </div>

      {/* Role Selection */}
      <div className="w-full max-w-3xl mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full" style={{ background: 'var(--accent-cyan)' }} />
          <span className="font-mono text-xs tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>
            选择岗位角色
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {ROLE_CONFIGS.map((role) => (
            <motion.button
              key={role.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setRole(role.id)}
              onMouseEnter={() => setHoveredRole(role.id)}
              onMouseLeave={() => setHoveredRole(null)}
              className={cn(
                'relative flex flex-col items-center gap-2 p-4 rounded-lg border transition-all text-left cursor-pointer',
                selectedRole === role.id ? 'border-current' : 'border-[var(--border-default)]'
              )}
              style={{
                background:
                  selectedRole === role.id
                    ? `${role.color}15`
                    : hoveredRole === role.id
                      ? 'var(--bg-surface)'
                      : 'var(--bg-elevated)',
                borderColor: selectedRole === role.id ? role.color : undefined,
                boxShadow:
                  selectedRole === role.id ? `0 0 20px ${role.color}30` : undefined,
              }}
            >
              {selectedRole === role.id && (
                <div
                  className="absolute top-2 right-2 w-2 h-2 rounded-full"
                  style={{ background: role.color, boxShadow: `0 0 6px ${role.color}` }}
                />
              )}
              <span style={{ fontSize: 28 }}>{role.icon}</span>
              <div className="text-center">
                <div
                  className="font-semibold text-sm mb-0.5"
                  style={{ color: selectedRole === role.id ? role.color : 'var(--text-primary)' }}
                >
                  {role.label}
                </div>
                <div className="font-mono text-xs" style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>
                  {role.labelEn}
                </div>
              </div>
              <p className="text-center" style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {role.description}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Fault Selection */}
      <div className="w-full max-w-3xl mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full" style={{ background: 'var(--warn-yellow)' }} />
          <span className="font-mono text-xs tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>
            选择故障剧本
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {FAULT_CONFIGS.map((fault) => (
            <button
              key={fault.id}
              onClick={() => setFault(fault.id as FaultId)}
              className={cn(
                'flex flex-col gap-1 p-3 rounded border text-left transition-all cursor-pointer',
              )}
              style={{
                background:
                  selectedFault === fault.id ? 'rgba(255,184,0,0.1)' : 'var(--bg-elevated)',
                borderColor:
                  selectedFault === fault.id ? 'var(--warn-yellow)' : 'var(--border-default)',
                boxShadow:
                  selectedFault === fault.id ? '0 0 12px rgba(255,184,0,0.2)' : undefined,
              }}
            >
              <span
                className="font-mono font-semibold text-xs"
                style={{ color: selectedFault === fault.id ? 'var(--warn-yellow)' : 'var(--accent-cyan)' }}
              >
                {fault.id}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                {fault.label.replace(fault.id + ' ', '')}
              </span>
              <span
                className="font-mono text-xs"
                style={{
                  color:
                    fault.severity === 'critical'
                      ? 'var(--warn-red)'
                      : fault.severity === 'high'
                        ? 'var(--warn-orange)'
                        : 'var(--warn-yellow)',
                }}
              >
                {fault.severity === 'critical' ? '严重' : fault.severity === 'high' ? '高危' : '中危'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Start Button */}
      <motion.button
        whileHover={selectedRole && selectedFault ? { scale: 1.02 } : {}}
        whileTap={selectedRole && selectedFault ? { scale: 0.98 } : {}}
        onClick={handleStart}
        disabled={!selectedRole || !selectedFault}
        className="px-12 py-3 rounded font-mono font-semibold tracking-widest uppercase transition-all"
        style={{
          background:
            selectedRole && selectedFault ? 'var(--accent-cyan)' : 'var(--bg-surface)',
          color:
            selectedRole && selectedFault ? 'var(--bg-deep)' : 'var(--text-tertiary)',
          border: `1px solid ${selectedRole && selectedFault ? 'var(--accent-cyan)' : 'var(--border-default)'}`,
          boxShadow:
            selectedRole && selectedFault ? '0 0 24px rgba(0,212,255,0.3)' : undefined,
          cursor: selectedRole && selectedFault ? 'pointer' : 'not-allowed',
          fontSize: 14,
          letterSpacing: '0.15em',
        }}
      >
        {selectedRole && selectedFault ? '▶  进入剧本' : '请选择角色和故障'}
      </motion.button>

      {selectedRole && selectedFault && (
        <p className="mt-3 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {ROLE_CONFIGS.find((r) => r.id === selectedRole)?.label} ·{' '}
          {FAULT_CONFIGS.find((f) => f.id === selectedFault)?.label}
        </p>
      )}
    </div>
  )
}

function HXD3Illustration() {
  return (
    <svg
      viewBox="0 0 700 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.3))' }}
      aria-label="HXD3 机车线稿"
    >
      {/* Main body */}
      <rect x="60" y="40" width="580" height="80" rx="4" stroke="var(--accent-cyan)" strokeWidth="1.5" />
      {/* Cab left */}
      <path d="M60 120 L60 40 L120 20 L180 40" stroke="var(--accent-cyan)" strokeWidth="1.5" />
      {/* Cab right */}
      <path d="M640 120 L640 40 L580 20 L520 40" stroke="var(--accent-cyan)" strokeWidth="1.5" />
      {/* Cab windows left */}
      <rect x="75" y="30" width="35" height="28" rx="2" stroke="var(--accent-cyan)" strokeWidth="1" opacity="0.6" />
      <rect x="118" y="30" width="35" height="28" rx="2" stroke="var(--accent-cyan)" strokeWidth="1" opacity="0.6" />
      {/* Cab windows right */}
      <rect x="547" y="30" width="35" height="28" rx="2" stroke="var(--accent-cyan)" strokeWidth="1" opacity="0.6" />
      <rect x="590" y="30" width="35" height="28" rx="2" stroke="var(--accent-cyan)" strokeWidth="1" opacity="0.6" />
      {/* Body panels */}
      <line x1="200" y1="40" x2="200" y2="120" stroke="var(--accent-cyan)" strokeWidth="0.8" opacity="0.4" />
      <line x1="300" y1="40" x2="300" y2="120" stroke="var(--accent-cyan)" strokeWidth="0.8" opacity="0.4" />
      <line x1="400" y1="40" x2="400" y2="120" stroke="var(--accent-cyan)" strokeWidth="0.8" opacity="0.4" />
      <line x1="500" y1="40" x2="500" y2="120" stroke="var(--accent-cyan)" strokeWidth="0.8" opacity="0.4" />
      {/* Ventilation grilles */}
      {[220, 320, 420].map((x) => (
        <g key={x}>
          <rect x={x} y="55" width="60" height="30" rx="1" stroke="var(--accent-cyan)" strokeWidth="0.8" opacity="0.5" />
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1={x + 4} y1={60 + i * 5} x2={x + 56} y2={60 + i * 5} stroke="var(--accent-cyan)" strokeWidth="0.5" opacity="0.4" />
          ))}
        </g>
      ))}
      {/* Pantograph */}
      <line x1="250" y1="40" x2="230" y2="10" stroke="var(--accent-cyan)" strokeWidth="1" opacity="0.7" />
      <line x1="350" y1="40" x2="370" y2="10" stroke="var(--accent-cyan)" strokeWidth="1" opacity="0.7" />
      <line x1="230" y1="10" x2="370" y2="10" stroke="var(--accent-cyan)" strokeWidth="1.5" opacity="0.8" />
      <line x1="450" y1="40" x2="430" y2="10" stroke="var(--accent-cyan)" strokeWidth="1" opacity="0.7" />
      <line x1="550" y1="40" x2="570" y2="10" stroke="var(--accent-cyan)" strokeWidth="1" opacity="0.7" />
      <line x1="430" y1="10" x2="570" y2="10" stroke="var(--accent-cyan)" strokeWidth="1.5" opacity="0.8" />
      {/* Bogies */}
      {[100, 220, 340, 460, 580].map((x) => (
        <g key={x}>
          <rect x={x - 30} y="120" width="60" height="16" rx="2" stroke="var(--accent-cyan)" strokeWidth="1" opacity="0.7" />
          <circle cx={x - 15} cy="140" r="10" stroke="var(--accent-cyan)" strokeWidth="1.2" opacity="0.8" />
          <circle cx={x + 15} cy="140" r="10" stroke="var(--accent-cyan)" strokeWidth="1.2" opacity="0.8" />
          <circle cx={x - 15} cy="140" r="3" stroke="var(--accent-cyan)" strokeWidth="0.8" opacity="0.5" />
          <circle cx={x + 15} cy="140" r="3" stroke="var(--accent-cyan)" strokeWidth="0.8" opacity="0.5" />
        </g>
      ))}
      {/* Rail */}
      <line x1="0" y1="152" x2="700" y2="152" stroke="var(--border-emphasis)" strokeWidth="1.5" />
      <line x1="0" y1="156" x2="700" y2="156" stroke="var(--border-emphasis)" strokeWidth="1.5" />
      {/* Headlights */}
      <circle cx="68" cy="80" r="6" stroke="var(--warn-yellow)" strokeWidth="1.2" opacity="0.8" />
      <circle cx="68" cy="80" r="3" fill="var(--warn-yellow)" opacity="0.4" />
      <circle cx="632" cy="80" r="6" stroke="var(--warn-yellow)" strokeWidth="1.2" opacity="0.8" />
      <circle cx="632" cy="80" r="3" fill="var(--warn-yellow)" opacity="0.4" />
      {/* Label */}
      <text x="350" y="88" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="var(--accent-cyan)" opacity="0.5" letterSpacing="3">
        HXD3
      </text>
    </svg>
  )
}
