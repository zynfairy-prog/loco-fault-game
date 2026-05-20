import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { RoleId, FaultId, ChatMessage, GameState } from '@/types'
import { generateId } from '@/lib/utils'

interface GameStore extends GameState {
  messages: Record<RoleId, ChatMessage[]>
  setRole: (role: RoleId) => void
  setFault: (fault: FaultId) => void
  startGame: () => void
  resetGame: () => void
  addMessage: (role: RoleId, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  triggerFaultAlert: () => void
  clearAlert: () => void
}

const initialMessages: Record<RoleId, ChatMessage[]> = {
  driver: [],
  codriver: [],
  emergency: [],
  electrician: [],
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      selectedRole: null,
      selectedFault: null,
      isGameActive: false,
      faultAlertActive: false,
      messages: initialMessages,

      setRole: (role) => set({ selectedRole: role }),
      setFault: (fault) => set({ selectedFault: fault }),

      startGame: () =>
        set((state) => ({
          isGameActive: true,
          messages: {
            ...initialMessages,
            [state.selectedRole ?? 'driver']: [
              {
                id: generateId(),
                role: 'system',
                content: `故障剧本 ${state.selectedFault} 已启动。请开始处置。`,
                timestamp: new Date(),
              },
            ],
          },
        })),

      resetGame: () =>
        set({
          isGameActive: false,
          faultAlertActive: false,
          messages: initialMessages,
        }),

      addMessage: (role, message) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [role]: [
              ...state.messages[role],
              { ...message, id: generateId(), timestamp: new Date() },
            ],
          },
        })),

      triggerFaultAlert: () => set({ faultAlertActive: true }),
      clearAlert: () => set({ faultAlertActive: false }),
    }),
    {
      name: 'loco-fault-game',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        selectedRole: state.selectedRole,
        selectedFault: state.selectedFault,
      }),
    }
  )
)
