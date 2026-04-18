// frontend/src/test/hooks/useWorkoutRecords.test.ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWorkoutRecords } from '../../hooks/useWorkoutRecords'
import * as recordsApi from '../../api/records'

describe('useWorkoutRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(recordsApi.getRecords).mockResolvedValue([])
  })

  it('초기 stats는 모두 0이다', async () => {
    const { result } = renderHook(() => useWorkoutRecords(3))
    // refresh() 비동기 완료 대기
    await act(async () => {})
    expect(result.current.stats.weeklyCount).toBe(0)
    expect(result.current.stats.isTodayRecorded).toBe(false)
  })

  it('recordToday 호출 시 addRecord API를 호출한다', async () => {
    // 날짜를 고정해 KST 기준 오늘 날짜를 예측 가능하게 만든다
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-18T10:00:00+09:00'))

    const mockRecord = {
      id: 'uuid-1',
      recordedAt: '2026-04-18T01:00:00.000Z',
      recordedDate: '2026-04-18',
      createdAt: '2026-04-18T01:00:00.000Z',
      source: 'today_button' as const,
    }
    vi.mocked(recordsApi.addRecord).mockResolvedValueOnce(mockRecord)
    vi.mocked(recordsApi.getRecords).mockResolvedValueOnce([]).mockResolvedValueOnce([mockRecord])

    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})

    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.recordToday()
    })

    expect(outcome).toBe('recorded')
    expect(recordsApi.addRecord).toHaveBeenCalledWith('2026-04-18', 'today_button', undefined)

    vi.useRealTimers()
  })

  it('recordToday 시 DUPLICATE_DATE 에러면 "duplicate" 반환', async () => {
    vi.mocked(recordsApi.addRecord).mockRejectedValueOnce({ error: 'DUPLICATE_DATE', message: '중복' })

    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})

    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.recordToday()
    })

    expect(outcome).toBe('duplicate')
  })
})
