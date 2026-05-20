import { useSearchParams, Navigate } from 'react-router-dom'
import { DriverScreen } from './DriverScreen'
import { CoDriverScreen } from './CoDriverScreen'
import { EmergencyScreen } from './EmergencyScreen'
import { ElectricianScreen } from './ElectricianScreen'

/**
 * Renders the correct screen based on ?role= query param.
 * Used for multi-window demo: open four browser windows each pointing to
 *   /view?role=driver&fault=F001
 *   /view?role=co-driver&fault=F001
 *   /view?role=emergency&fault=F001
 *   /view?role=electrician&fault=F001
 */
export function RoleRouter() {
  const [params] = useSearchParams()
  const role = params.get('role') ?? 'driver'

  switch (role) {
    case 'driver':
      return <DriverScreen />
    case 'co-driver':
      return <CoDriverScreen />
    case 'emergency':
      return <EmergencyScreen />
    case 'electrician':
      return <ElectricianScreen />
    default:
      return <Navigate to="/" replace />
  }
}
