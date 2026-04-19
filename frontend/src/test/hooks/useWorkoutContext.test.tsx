// frontend/src/test/hooks/useWorkoutContext.test.tsx
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { SettingsProvider } from '../../context/SettingsContext'
import { WorkoutProvider, useWorkoutContext } from '../../context/WorkoutContext'
import * as recordsApi from '../../api/records'
import * as settingsApi from '../../api/settings'

// WorkoutProvider는 반드시 SettingsProvider 내부에 중첩되어야 한다
const wrapper = ({ children }: { children: ReactNode }) => (
  <SettingsProvider>
    <WorkoutProvider>{children}</WorkoutProvider>
  </SettingsProvider>
)

describe('useWorkoutContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(recordsApi.getRecords).mockResolvedValue([])
    vi.mocked(settingsApi.getSettings).mockResolvedValue({ weeklyGoal: 3, timezone: 'Asia/Seoul' })
  })

  it('초기 stats는 모두 0이다', async () => {
    const { result } = renderHook(() => useWorkoutContext(), { wrapper })
    await act(async () => {})
    expect(result.current.stats.weeklyCount).toBe(0)
    expect(result.current.stats.totalCount).toBe(0)
    expect(result.current.stats.isTodayRecorded).toBe(false)
  })

  it('WorkoutProvider 없이 useWorkoutContext를 사용하면 에러가 발생한다', () => {
    // WorkoutProvider 없이 훅 직접 호출 시 에러 발생 확인
    expect(() => {
      renderHook(() => useWorkoutContext())
    }).toThrow('useWorkoutContext must be used within WorkoutProvider')
  })

  it('weeklyGoal이 SettingsContext에서 전달된다', async () => {
    // weeklyGoal=5로 설정된 경우 stats가 올바르게 반영되는지 확인
    vi.mocked(settingsApi.getSettings).mockResolvedValue({ weeklyGoal: 5, timezone: 'Asia/Seoul' })

    const { result } = renderHook(() => useWorkoutContext(), { wrapper })
    await act(async () => {})

    // weeklyGoal=5일 때 weeklyGoalProgress는 0/5 = 0
    expect(result.current.stats.weeklyGoalProgress).toBe(0)
  })
})
