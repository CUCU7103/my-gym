// src/test/hooks/useSettings.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSettings } from '../../hooks/useSettings'

vi.mock('../../db/database', () => {
  let settings = { weeklyGoal: 3, timezone: 'Asia/Seoul' }
  return {
    db: {
      userSettings: {
        put: async (s: any) => { settings = s },
      },
    },
    getOrCreateSettings: async () => ({ ...settings }),
  }
})

describe('useSettings', () => {
  it('기본 weeklyGoal은 3이다', async () => {
    const { result } = renderHook(() => useSettings())
    await act(async () => {})
    expect(result.current.settings.weeklyGoal).toBe(3)
  })

  it('updateWeeklyGoal 호출 시 값이 변경된다', async () => {
    const { result } = renderHook(() => useSettings())
    await act(async () => {})
    await act(async () => { await result.current.updateWeeklyGoal(5) })
    expect(result.current.settings.weeklyGoal).toBe(5)
  })
})
