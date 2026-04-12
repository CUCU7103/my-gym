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
            // 오늘 전체 삭제에 사용
            toArray: async () => records.filter((r: any) => r[field] === val),
            delete: async () => {
              const toDelete = records.filter((r: any) => r[field] === val)
              toDelete.forEach(item => {
                const idx = records.findIndex(r => r.id === item.id)
                if (idx !== -1) records.splice(idx, 1)
              })
            },
          }),
        }),
      },
    },
    getOrCreateSettings: async () => ({ weeklyGoal: 3, timezone: 'Asia/Seoul' }),
  }
})

describe('useWorkoutRecords', () => {
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
    await act(async () => { await result.current.recordToday() })
    expect(result.current.stats.isTodayRecorded).toBe(true)
    vi.useRealTimers()
  })

  it('같은 날 recordToday를 2번 호출하면 2개의 세션이 기록된다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})
    await act(async () => { await result.current.recordToday('헬스') })
    await act(async () => { await result.current.recordToday('복싱') })
    expect(result.current.stats.todaySessionCount).toBe(2)
    expect(result.current.stats.weeklyCount).toBe(2)
    vi.useRealTimers()
  })

  it('recordToday 라벨이 기록에 저장된다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})
    await act(async () => { await result.current.recordToday('헬스') })
    expect(result.current.records[0].label).toBe('헬스')
    vi.useRealTimers()
  })

  it('cancelToday 호출 시 오늘 기록이 모두 삭제된다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})
    await act(async () => { await result.current.recordToday('헬스') })
    await act(async () => { await result.current.recordToday('복싱') })
    expect(result.current.stats.todaySessionCount).toBe(2)
    await act(async () => { await result.current.cancelToday() })
    expect(result.current.stats.isTodayRecorded).toBe(false)
    expect(result.current.stats.todaySessionCount).toBe(0)
    vi.useRealTimers()
  })

  it('deleteRecord 호출 시 해당 기록만 삭제된다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})
    await act(async () => { await result.current.recordToday('헬스') })
    await act(async () => { await result.current.recordToday('복싱') })
    const firstId = result.current.records.find(r => r.label === '헬스')!.id
    await act(async () => { await result.current.deleteRecord(firstId) })
    expect(result.current.stats.todaySessionCount).toBe(1)
    expect(result.current.records[0].label).toBe('복싱')
    vi.useRealTimers()
  })

  it('addManual - 같은 날 여러 세션 추가 가능하다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})
    await act(async () => { await result.current.addManual('2026-04-10', '헬스') })
    await act(async () => { await result.current.addManual('2026-04-10', '복싱') })
    expect(result.current.stats.totalCount).toBe(2)
    vi.useRealTimers()
  })

  it('addManual - 미래 날짜는 future를 반환한다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})
    let returnVal = ''
    await act(async () => { returnVal = await result.current.addManual('2026-04-13') })
    expect(returnVal).toBe('future')
    vi.useRealTimers()
  })

  it('deleteAllRecords 호출 시 모든 기록이 삭제된다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})
    await act(async () => { await result.current.recordToday() })
    await act(async () => { await result.current.deleteAllRecords() })
    expect(result.current.stats.totalCount).toBe(0)
    vi.useRealTimers()
  })
})
