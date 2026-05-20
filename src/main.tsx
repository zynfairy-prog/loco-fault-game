import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useDashboardStore } from '@/stores/dashboardStore'
import { parseSignals } from '@/lib/signal-parser'

if (import.meta.env.DEV) {
  (window as any).__gameStore = useDashboardStore
  ;(window as any).__parseSignals = parseSignals
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
