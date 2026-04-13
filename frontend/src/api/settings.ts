// frontend/src/api/settings.ts
import { apiFetch } from './client'
import type { UserSettings } from '../types'

// 사용자 설정 조회
export async function getSettings(): Promise<UserSettings> {
  return apiFetch<UserSettings>('/api/settings')
}

// 주간 목표 업데이트
export async function updateSettings(weeklyGoal: number): Promise<UserSettings> {
  return apiFetch<UserSettings>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify({ weeklyGoal }),
  })
}
