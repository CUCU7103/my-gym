// src/test/hooks/useWorkoutRecords.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkoutRecords } from '../../hooks/useWorkoutRecords'

// Dexie를 메모리 기반으로 mock
vi.mock('../../db/database', () => {
  const records: any[] = []
  return {
    db: {
      workoutRecords: {
        toArray: async () => [...records],
        add: async (r: any) => { records.push(r); return r.id },
        delete: async (id: string) => {
          const idx = records.findIndex(r => r.id === id)
          if (idx !== -1) records.splice(idx, 1)
        },
        clear: async () => { records.splice(0, records.length) },
        where: (field: string) => ({
          equals: (val: string) => ({
            first: async () => records.find((r: any) => r[field] === val),
          }),
        }),
      },
    },
    getOrCreateSettings: async () => ({ weeklyGoal: 3, timezone: 'Asia/Seoul' }),
  }
})

describe('useWorkoutRecords', () => {
  // 각 테스트 전에 mock 데이터 초기화
  beforeEach(async () => {
    const { db } = await import('../../db/database')
    await db.workoutRecords.clear()
  })

  it('초기 상태에서 isTodayRecorded는 false이다', async () => {
    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})
    expect(result.current.stats.isTodayRecorded).toBe(false)
  })

  it('recordToday 호출 시 isTodayRecorded가 true가 된다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))

    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})

    await act(async () => {
      await result.current.recordToday()
    })

    expect(result.current.stats.isTodayRecorded).toBe(true)
    vi.useRealTimers()
  })

  it('같은 날 중복 recordToday 호출 시 기록이 1건만 생성된다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))

    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})

    await act(async () => { await result.current.recordToday() })
    await act(async () => { await result.current.recordToday() })

    expect(result.current.stats.weeklyCount).toBe(1)
    vi.useRealTimers()
  })

  it('deleteRecord 호출 시 해당 기록이 삭제된다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))

    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})
    await act(async () => { await result.current.recordToday() })
    expect(result.current.stats.isTodayRecorded).toBe(true)

    const record = result.current.records[0]
    await act(async () => { await result.current.deleteRecord(record.id) })
    expect(result.current.stats.isTodayRecorded).toBe(false)
    vi.useRealTimers()
  })
})
