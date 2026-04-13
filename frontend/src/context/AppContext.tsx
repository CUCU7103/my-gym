// src/context/AppContext.tsx
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { ActiveTab } from '../types'
import { useWorkoutRecords } from '../hooks/useWorkoutRecords'
import { useSettings } from '../hooks/useSettings'

// AppContext가 제공하는 값의 타입: 활성 탭 + 운동 기록 훅 + 설정 훅의 반환값을 모두 포함
type AppContextValue = {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
} & ReturnType<typeof useWorkoutRecords> & ReturnType<typeof useSettings>

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  // 현재 활성 탭 상태 관리 (기본값: '홈' 탭)
  const [activeTab, setActiveTab] = useState<ActiveTab>('home')
  // 사용자 설정 훅 (주간 목표 등)
  const { settings, updateWeeklyGoal } = useSettings()
  // 운동 기록 훅 - 주간 목표를 인자로 넘겨 통계 계산에 활용
  const workoutData = useWorkoutRecords(settings.weeklyGoal)

  return (
    <AppContext.Provider value={{
      activeTab, setActiveTab,
      settings, updateWeeklyGoal,
      ...workoutData,
    }}>
      {children}
    </AppContext.Provider>
  )
}

/** AppContext를 사용하는 커스텀 훅 - AppProvider 외부에서 사용 시 에러 발생 */
export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}
