import { useEffect, useRef } from 'react'
import { useDashboardStore } from '@/stores/dashboardStore'

interface UseAIRoleSimulatorProps {
  /** The last action text sent by the main driver */
  lastMainDriverAction: string
  /** Callback to simulate clicking an ACTIONS button for a given role */
  simulateAction: (role: string, actionText: string) => void
}

/**
 * Simulates AI role behavior by auto-triggering ACTIONS button clicks
 * after appropriate delays, per spec section 5.2-5.3.
 *
 * Only fires when the corresponding role is assigned to AI in rolesConfig.
 */
export function useAIRoleSimulator({ lastMainDriverAction, simulateAction }: UseAIRoleSimulatorProps) {
  const rolesConfig = useDashboardStore((state) => state.rolesConfig)
  const trainState = useDashboardStore((state) => state.trainState)
  const prevTrainState = useRef(trainState)
  const firedActions = useRef(new Set<string>())

  // AI 应急台: fires 2-3s after T0 (emergency_stop)
  useEffect(() => {
    if (rolesConfig.coordinator !== 'AI') return
    if (trainState !== 'emergency_stop') return
    if (prevTrainState.current === 'emergency_stop') return

    prevTrainState.current = trainState
    const key = 'coordinator_t0'
    if (firedActions.current.has(key)) return
    firedActions.current.add(key)

    const delay = 2000 + Math.random() * 1000 // 2-3s
    const timer = setTimeout(() => {
      simulateAction('应急台', '我查看 CMD 数据并报告')
    }, delay)
    return () => clearTimeout(timer)
  }, [trainState, rolesConfig.coordinator, simulateAction])

  // AI 副司机: fires 1.5-2s after main driver dispatches
  useEffect(() => {
    if (rolesConfig.driver_assist !== 'AI') return
    if (!lastMainDriverAction.includes('派副司机') || !lastMainDriverAction.includes('机械室')) return

    const key = `codriver_dispatch_${lastMainDriverAction}`
    if (firedActions.current.has(key)) return
    firedActions.current.add(key)

    const delay = 1500 + Math.random() * 500 // 1.5-2s
    const timer = setTimeout(() => {
      simulateAction('副司机', '我去机械室查看现场')
    }, delay)
    return () => clearTimeout(timer)
  }, [lastMainDriverAction, rolesConfig.driver_assist, simulateAction])

  // AI 调度: fires 1-1.5s after main driver sends stop report or requests departure
  useEffect(() => {
    if (rolesConfig.dispatcher !== 'AI') return
    const isStopReport = lastMainDriverAction.includes('报调度') || lastMainDriverAction.includes('停车报告')
    const isDepartureRequest = lastMainDriverAction.includes('请求开车') || lastMainDriverAction.includes('申请开车')
    if (!isStopReport && !isDepartureRequest) return

    const key = `dispatcher_${lastMainDriverAction}`
    if (firedActions.current.has(key)) return
    firedActions.current.add(key)

    const delay = 1000 + Math.random() * 500 // 1-1.5s
    const timer = setTimeout(() => {
      if (isStopReport) {
        simulateAction('调度', '调度收到停车报告，等待处置结果')
      } else {
        simulateAction('调度', '调度批准开车')
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [lastMainDriverAction, rolesConfig.dispatcher, simulateAction])
}
