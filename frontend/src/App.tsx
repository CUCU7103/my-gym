// frontend/src/App.tsx
import { AppProvider, useAppContext } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthPage } from './components/auth/AuthPage'
import { TabBar } from './components/TabBar'
import { HomePage } from './components/home/HomePage'
import { RecordsPage } from './components/records/RecordsPage'
import { SettingsPage } from './components/settings/SettingsPage'

/** 앱 실제 컨텐츠 — 로그인 상태일 때만 표시 */
function AppContent() {
  const { activeTab } = useAppContext()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <main style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 0' }}>
        {activeTab === 'home'     && <HomePage />}
        {activeTab === 'records'  && <RecordsPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
      <TabBar />
    </div>
  )
}

/** 인증 상태에 따라 로그인 화면 또는 앱 화면을 표시 */
function AuthGate() {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn) return <AuthPage />
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
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
