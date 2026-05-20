import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ScanlineOverlay } from '@/components/common/ScanlineOverlay'
import { HomePage } from '@/pages/HomePage'
import { DriverScreen } from '@/pages/DriverScreen'
import { CoDriverScreen } from '@/pages/CoDriverScreen'
import { EmergencyScreen } from '@/pages/EmergencyScreen'
import { ElectricianScreen } from '@/pages/ElectricianScreen'
import { RoleRouter } from '@/pages/RoleRouter'
import { StartupSetupPage } from '@/pages/StartupSetupPage'

export default function App() {
  return (
    <BrowserRouter>
      <ScanlineOverlay />
      <Routes>
        {/* Startup setup page is the real entry point */}
        <Route path="/" element={<Navigate to="/setup" replace />} />
        <Route path="/setup" element={<StartupSetupPage />} />
        {/* Legacy home page (role/fault selector) still accessible */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/driver" element={<DriverScreen />} />
        <Route path="/codriver" element={<CoDriverScreen />} />
        <Route path="/emergency" element={<EmergencyScreen />} />
        <Route path="/electrician" element={<ElectricianScreen />} />
        {/* ?role= shortcut: open any screen via /view?role=driver&fault=F001 */}
        <Route path="/view" element={<RoleRouter />} />
      </Routes>
    </BrowserRouter>
  )
}
