// frontend/src/test/hooks/useSettingsContext.test.tsx
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, type ReactNode } from 'vitest'
import { SettingsProvider, useSettingsContext } from '../../context/SettingsContext'
import * as settingsApi from '../../api/settings'

// SettingsProvider로 감싸주는 wrapper
const wrapper = ({ children }: { children: ReactNode }) => (
  <SettingsProvider>{children}</SettingsProvider>
)

describe('useSettingsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(settingsApi.getSettings).mockResolvedValue({ weeklyGoal: 3, timezone: 'Asia/Seoul' })
  })

  it('초기값으로 weeklyGoal=3을 갖는다', async () => {
    const { result } = renderHook(() => useSettingsContext(), { wrapper })
    await act(async () => {})
    expect(result.current.settings.weeklyGoal).toBe(3)
  })

  it('updateWeeklyGoal 호출 시 updateSettings API를 호출한다', async () => {
    vi.mocked(settingsApi.updateSettings).mockResolvedValueOnce({ weeklyGoal: 5, timezone: 'Asia/Seoul' })

    const { result } = renderHook(() => useSettingsContext(), { wrapper })
    await act(async () => {})

    await act(async () => {
      await result.current.updateWeeklyGoal(5)
    })

    expect(settingsApi.updateSettings).toHaveBeenCalledWith(5)
    expect(result.current.settings.weeklyGoal).toBe(5)
  })

  it('weeklyGoal은 1~7로 클램핑된다', async () => {
    vi.mocked(settingsApi.updateSettings).mockResolvedValueOnce({ weeklyGoal: 7, timezone: 'Asia/Seoul' })

    const { result } = renderHook(() => useSettingsContext(), { wrapper })
    await act(async () => {})

    await act(async () => {
      await result.current.updateWeeklyGoal(99) // 7로 클램핑
    })

    expect(settingsApi.updateSettings).toHaveBeenCalledWith(7)
  })
})
