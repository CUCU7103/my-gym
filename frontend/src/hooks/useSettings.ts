// src/hooks/useSettings.ts
import { useState, useEffect, useCallback } from 'react'
import { db, getOrCreateSettings } from '../db/database'
import type { UserSettings } from '../types'

/** 사용자 설정 관리 훅 - 주간 목표 등 설정을 IndexedDB에서 읽고 씀 */
export function useSettings() {
  // 초기값은 기본 설정으로 설정 (DB 로드 전 렌더링 대비)
  const [settings, setSettings] = useState<UserSettings>({
    weeklyGoal: 3,
    timezone: 'Asia/Seoul',
  })

  // 컴포넌트 마운트 시 DB에서 설정 로드 (없으면 기본값 생성)
  useEffect(() => {
    getOrCreateSettings().then(setSettings)
  }, [])

  /**
   * 주간 운동 목표 일수 업데이트
   * @param goal 1~7 범위로 자동 클램핑
   */
  const updateWeeklyGoal = useCallback(async (goal: number) => {
    // 1~7 범위를 벗어나면 경계값으로 클램핑
    const clamped = Math.max(1, Math.min(7, goal))
    const updated = { ...settings, weeklyGoal: clamped }
    // id=1 단일 레코드로 저장
    await db.userSettings.put({ id: 1, ...updated })
    setSettings(updated)
  }, [settings])

  return { settings, updateWeeklyGoal }
}
