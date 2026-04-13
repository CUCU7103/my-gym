// frontend/src/hooks/useSettings.ts
import { useState, useEffect, useCallback } from 'react'
import { getSettings, updateSettings } from '../api/settings'
import type { UserSettings } from '../types'

// 사용자 설정 관리 훅 — 서버 API에서 설정을 읽고 업데이트한다
export function useSettings() {
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

  return { settings, updateWeeklyGoal }
}
