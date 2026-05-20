import { useEffect, useRef } from 'react'
import { useDashboardStore } from '@/stores/dashboardStore'
import type { GameDashboardState } from '@/types/game-state'

const CHANNEL_NAME = 'loco-fault-game'

// These fields are local to the driver window and must not be broadcast
// (other windows have no MicroDisplayModal to open/close)
const LOCAL_ONLY_FIELDS = new Set(['microDisplayOpen'])

/**
 * Driver window: broadcasts store state to other windows on every change.
 * Listener windows: receive broadcasts and hydrate their local store.
 *
 * @param isDriver - true in the driver window (broadcasts), false elsewhere (listens)
 */
export function useBroadcastSync(isDriver: boolean) {
  const channelRef = useRef<BroadcastChannel | null>(null)
  const hydrate = useDashboardStore((s) => s.hydrate)

  useEffect(() => {
    channelRef.current = new BroadcastChannel(CHANNEL_NAME)

    if (!isDriver) {
      channelRef.current.onmessage = (e: MessageEvent<GameDashboardState>) => {
        hydrate(e.data)
      }
    }

    return () => {
      channelRef.current?.close()
    }
  }, [isDriver, hydrate])

  // Driver: subscribe to store changes and broadcast
  useEffect(() => {
    if (!isDriver) return

    const unsub = useDashboardStore.subscribe((state) => {
      // Strip store methods and local-only fields before broadcasting
      const { dispatch: _d, initSession: _i, hydrate: _h, ...plain } = state as any
      LOCAL_ONLY_FIELDS.forEach((k) => delete plain[k])
      channelRef.current?.postMessage(plain)
    })

    return unsub
  }, [isDriver])
}
