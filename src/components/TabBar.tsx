// src/components/TabBar.tsx
import { useAppContext } from '../context/AppContext'
import type { ActiveTab } from '../types'

// 하단 탭 메뉴 항목 목록 (id, 레이블, 아이콘)
const TABS: { id: ActiveTab; label: string; icon: string }[] = [
  { id: 'home',     label: '홈',   icon: '🏠' },
  { id: 'records',  label: '기록', icon: '📋' },
  { id: 'settings', label: '설정', icon: '⚙️' },
]

/** 하단 고정 탭 바 - 화면 전환 네비게이션 담당 */
export function TabBar() {
  const { activeTab, setActiveTab } = useAppContext()

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-around',
      // iOS 홈 인디케이터 영역을 safe-area-inset으로 처리
      padding: '10px 0 max(12px, env(safe-area-inset-bottom))',
      background: 'var(--surface-deep)',
      borderTop: '1px solid var(--border-subtle)',
      position: 'sticky',
      bottom: 0,
    }}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            padding: '4px 16px',
          }}
        >
          <span style={{ fontSize: '18px' }}>{tab.icon}</span>
          <span style={{
            fontSize: '10px',
            // 활성 탭은 파란색 + 굵은 글씨, 비활성 탭은 흐린 색
            color: activeTab === tab.id ? 'var(--blue)' : 'var(--text-muted)',
            fontWeight: activeTab === tab.id ? 600 : 400,
          }}>
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  )
}
