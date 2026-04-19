// frontend/src/App.tsx
import { useState } from 'react'
import { SettingsProvider } from './context/SettingsContext'
import { WorkoutProvider } from './context/WorkoutContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthPage } from './components/auth/AuthPage'
import { TabBar } from './components/TabBar'
import { HomePage } from './components/home/HomePage'
import { RecordsPage } from './components/records/RecordsPage'
import { SettingsPage } from './components/settings/SettingsPage'
import type { ActiveTab } from './types'

/** 앱 실제 컨텐츠 — 로그인 상태일 때만 표시 */
function AppContent() {
  // activeTab은 단순 UI 상태로 App에서 직접 관리 (Context 불필요)
  const [activeTab, setActiveTab] = useState<ActiveTab>('home')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <main style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 0' }}>
        {activeTab === 'home'     && <HomePage />}
        {activeTab === 'records'  && <RecordsPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

/** 인증 상태에 따라 로그인 화면 또는 앱 화면을 표시 */
function AuthGate() {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn) return <AuthPage />
  return (
    <SettingsProvider>
      <WorkoutProvider>
        <AppContent />
      </WorkoutProvider>
    </SettingsProvider>
  )
}

/** 앱 루트 */
export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
