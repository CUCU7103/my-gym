// src/App.tsx
import { AppProvider, useAppContext } from './context/AppContext'
import { TabBar } from './components/TabBar'
import { HomePage } from './components/home/HomePage'
import { RecordsPage } from './components/records/RecordsPage'
import { SettingsPage } from './components/settings/SettingsPage'

/** 실제 앱 컨텐츠 - AppProvider 내부에서 useAppContext 사용 */
function AppContent() {
  const { activeTab } = useAppContext()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      {/* 스크롤 가능한 메인 영역 */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 0' }}>
        {activeTab === 'home'     && <HomePage />}
        {activeTab === 'records'  && <RecordsPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
      {/* 하단 탭 바 */}
      <TabBar />
    </div>
  )
}

/** 앱 루트 - AppProvider로 전역 상태 주입 */
export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
