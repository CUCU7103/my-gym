// frontend/src/context/SettingsContext.tsx
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { getSettings, updateSettings } from '../api/settings'
import type { UserSettings } from '../types'

type SettingsContextValue = {
  settings: UserSettings
  updateWeeklyGoal: (goal: number) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>({
    weeklyGoal: 3,
    timezone: 'Asia/Seoul',
  })

  // 마운트 시 서버에서 설정 로드
  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch((err) => console.error('설정 로드 실패:', err))
  }, [])

  /**
   * 주간 운동 목표 업데이트
   * @param goal 1~7 범위로 자동 클램핑
   */
  const updateWeeklyGoal = useCallback(async (goal: number) => {
    const clamped = Math.max(1, Math.min(7, goal))
    try {
      const updated = await updateSettings(clamped)
      setSettings(updated)
    } catch (err) {
      console.error('설정 업데이트 실패:', err)
    }
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, updateWeeklyGoal }}>
      {children}
    </SettingsContext.Provider>
  )
}

/** SettingsContext를 사용하는 커스텀 훅 */
export function useSettingsContext() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettingsContext must be used within SettingsProvider')
  return ctx
}
