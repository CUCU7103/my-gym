// src/components/TabBar.tsx
import type { ActiveTab } from '../types'

type TabBarProps = {
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
}

// 하단 탭 메뉴 항목 목록 (id, 레이블, 아이콘)
const TABS: { id: ActiveTab; label: string; icon: string }[] = [
  { id: 'home',     label: '홈',   icon: '🏠' },
  { id: 'records',  label: '기록', icon: '📋' },
  { id: 'settings', label: '설정', icon: '⚙️' },
]

/** 하단 고정 탭 바 - 화면 전환 네비게이션 담당 */
export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    // flex 레이아웃에 의해 자연스럽게 하단에 고정됨 — App.tsx의 flex column 구조 참고
    <nav style={{
      display: 'flex',
      justifyContent: 'space-around',
      // iOS 홈 인디케이터 영역을 safe-area-inset으로 처리
      padding: '10px 0 max(12px, env(safe-area-inset-bottom))',
      background: 'var(--surface-deep)',
      borderTop: '1px solid var(--border-subtle)',
      flexShrink: 0,
    }}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
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
