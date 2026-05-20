import { useGameStore } from '@/stores/gameStore'
import { getRoleConfig, getFaultConfig } from '@/lib/utils'

export function useGameState() {
  const { selectedRole, selectedFault, isGameActive, faultAlertActive } = useGameStore()

  const roleConfig = selectedRole ? getRoleConfig(selectedRole) : null
  const faultConfig = selectedFault ? getFaultConfig(selectedFault) : null
  const isReady = selectedRole !== null && selectedFault !== null

  return {
    selectedRole,
    selectedFault,
    isGameActive,
    faultAlertActive,
    roleConfig,
    faultConfig,
    isReady,
  }
}
