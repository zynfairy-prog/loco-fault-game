import { create } from 'zustand'
import type { GameDashboardState, GameAction } from '@/types/game-state'
import { createInitialDashboardState } from '@/types/game-state'

interface DashboardStore extends GameDashboardState {
  dispatch: (action: GameAction) => void
  initSession: (faultId: string, role: string) => void
  /** Replace the entire dashboard state (used by non-driver windows receiving broadcasts) */
  hydrate: (state: GameDashboardState) => void
}

function reducer(state: GameDashboardState, action: GameAction): GameDashboardState {
  switch (action.type) {
    case 'SET_LED':
      return { ...state, leds: { ...state.leds, [action.led]: action.state } }

    case 'SET_METER':
      return { ...state, meters: { ...state.meters, [action.meter]: action.value } }

    case 'ADD_FAULT_CODE': {
      const newCode = action.faultCode
      // Deduplicate by code + description to guard against double-dispatch
      const exists = state.faultCodes.some(
        (fc) => fc.code === newCode.code && fc.description === newCode.description
      )
      if (exists) return state
      return { ...state, faultCodes: [...state.faultCodes, newCode] }
    }

    case 'CLEAR_FAULT_CODES':
      return { ...state, faultCodes: [] }

    case 'SET_TASK':
      return {
        ...state,
        task: {
          current: action.current,
          total: action.total,
          description: action.description,
          history: state.task.description
            ? [...state.task.history, state.task.description]
            : state.task.history,
        },
      }

    case 'TASK_DONE':
      return {
        ...state,
        task: {
          ...state.task,
          history: state.task.description
            ? [...state.task.history, state.task.description]
            : state.task.history,
        },
      }

    case 'SET_TRAIN_STATE':
      return { ...state, trainState: action.state }

    case 'SET_QUICK_ACTIONS':
      return { ...state, quickActions: action.actions }

    case 'SHOW_SCORE_REPORT':
      console.log('[store] SHOW_SCORE_REPORT triggered, phase:', state.facts.phase, action.report)
      // Guard: ignore premature score signals (Bot sometimes sends SCORE before game ends)
      // dispatchApproval is set to non-null only when player requests departure/rescue
      if (state.facts.dispatchApproval === null) {
        console.warn('[store] SHOW_SCORE_REPORT ignored: dispatchApproval is null (game not finished yet)')
        return state
      }
      return { ...state, scoreReport: action.report }

    case 'SET_CI_PANEL': {
      const units = action.units.slice(0, 6)
      if (units.length < action.units.length) {
        console.warn('[dashboardStore] CI_PANEL: received', action.units.length, 'units, truncated to 6')
      }
      return { ...state, ciPanel: units }
    }

    case 'OPEN_MICRO_DISPLAY':
      return { ...state, microDisplayOpen: true }

    case 'CLOSE_MICRO_DISPLAY':
      return { ...state, microDisplayOpen: false }

    case 'SET_HEATMAP': {
      const anyHot = Object.values(action.data).some((v) => v > 5)
      return {
        ...state,
        heatmapData: action.data,
        // Only upgrade to investigation; never downgrade back to idle (preserves manual dispatch)
        coDriverViewMode: anyHot ? 'investigation' : state.coDriverViewMode,
      }
    }

    case 'SET_GS_PANEL':
      return { ...state, gsPanel: action.states }

    case 'SET_GS_STATE':
      return { ...state, gsPanel: { ...state.gsPanel, [action.id]: action.position } }

    case 'SET_ROLES_CONFIG':
      return { ...state, rolesConfig: action.config }

    case 'SET_CO_DRIVER_VIEW':
      return { ...state, coDriverViewMode: action.mode }

    case 'SET_SHOWING_CO_DRIVER_VIEW':
      return { ...state, showingCoDriverView: action.showing }

    case 'ADD_CHAT_MESSAGE': {
      const existing = state.chatHistory[action.storageKey] ?? []
      return {
        ...state,
        chatHistory: {
          ...state.chatHistory,
          [action.storageKey]: [...existing, action.message],
        },
      }
    }

    case 'UPDATE_FACT':
      if (state.scoreReport !== null) {
        console.warn('[store] UPDATE_FACT blocked: scoreReport is non-null', action)
        return state
      }
      console.log('[store] UPDATE_FACT', action.key, '=', action.value, '→ new phase:', action.key === 'phase' ? action.value : state.facts.phase)
      return { ...state, facts: { ...state.facts, [action.key]: action.value } }

    case 'SET_GS_ANIMATION_PHASE':
      return { ...state, gsAnimationPhase: action.phase }

    case 'RESET':
      console.log('[store] RESET dispatched')
      return {
        ...createInitialDashboardState(state.faultId, state.role),
        // Preserve chat history and roles config across resets
        chatHistory: state.chatHistory,
        rolesConfig: state.rolesConfig,
      }

    default:
      return state
  }
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  ...createInitialDashboardState('F007', 'driver'),

  dispatch: (action) => set((state) => reducer(state, action)),

  initSession: (faultId, role) => {
    const current = get()
    // Guard: only reset when faultId actually changes to preserve chat history on view-switch
    if (current.faultId === faultId && current.role !== 'fresh') {
      console.log('[store] initSession: guard hit, skipping reset', { faultId, role })
      return
    }
    console.log('[store] initSession: resetting store', { faultId, role, prevFaultId: current.faultId })
    set((state) => ({
      ...createInitialDashboardState(faultId, role),
      chatHistory: state.chatHistory,
      rolesConfig: state.rolesConfig,
    }))
  },

  hydrate: (newState) => {
    console.log('[store] hydrate called, new facts.phase:', newState.facts?.phase)
    set(newState)
  },
}))

