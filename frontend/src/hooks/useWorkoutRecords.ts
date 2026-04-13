// frontend/src/hooks/useWorkoutRecords.ts
import { useState, useEffect, useCallback } from 'react'
import { getRecords, addRecord, deleteRecord as apiDeleteRecord, deleteAllRecords as apiDeleteAllRecords } from '../api/records'
import type { WorkoutRecord, WorkoutStats } from '../types'
import {
  getTodayKST,
  isThisWeekKST,
  isThisMonthKST,
  getRecent7DayDates,
} from '../utils/date'

/** 기록 배열과 주간 목표를 받아 파생 통계를 계산 (변경 없음) */
function calcStats(records: WorkoutRecord[], weeklyGoal: number): WorkoutStats {
  const today = getTodayKST()
  const recent7 = getRecent7DayDates()
  const dateSet = new Set(records.map(r => r.recordedDate))

  const weeklyCount = records.filter(r => isThisWeekKST(r.recordedDate)).length
  const monthlyCount = records.filter(r => isThisMonthKST(r.recordedDate)).length
  const todaySessionCount = records.filter(r => r.recordedDate === today).length

  return {
    weeklyCount,
    monthlyCount,
    totalCount: records.length,
    recent7Days: recent7.map(d => dateSet.has(d)),
    weeklyGoalProgress: weeklyGoal > 0 ? weeklyCount / weeklyGoal : 0,
    isTodayRecorded: todaySessionCount > 0,
    todaySessionCount,
  }
}

/** 운동 기록 CRUD 훅 — 서버 API를 통해 데이터를 읽고 씀 */
export function useWorkoutRecords(weeklyGoal: number) {
  const [records, setRecords] = useState<WorkoutRecord[]>([])
  const [stats, setStats] = useState<WorkoutStats>({
    weeklyCount: 0,
    monthlyCount: 0,
    totalCount: 0,
    recent7Days: Array(7).fill(false),
    weeklyGoalProgress: 0,
    isTodayRecorded: false,
    todaySessionCount: 0,
  })

  /** 서버에서 전체 기록을 불러와 상태 갱신 */
  const refresh = useCallback(async () => {
    try {
      const all = await getRecords()
      // 최신 시각 순으로 내림차순 정렬 (서버에서 이미 정렬되지만 보장)
      all.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
      setRecords(all)
      setStats(calcStats(all, weeklyGoal))
    } catch (err) {
      console.error('기록 로드 실패:', err)
    }
  }, [weeklyGoal])

  useEffect(() => { refresh() }, [refresh])

  /**
   * 오늘 날짜로 운동 세션 추가
   * @returns 'recorded' — 성공, 'duplicate' — 중복 날짜
   */
  const recordToday = useCallback(async (label?: string): Promise<'recorded' | 'duplicate'> => {
    const today = getTodayKST()
    try {
      await addRecord(today, 'today_button', label)
      await refresh()
      return 'recorded'
    } catch (err: unknown) {
      const apiErr = err as { error?: string }
      if (apiErr?.error === 'DUPLICATE_DATE') return 'duplicate'
      throw err
    }
  }, [refresh])

  /**
   * 오늘 날짜 운동 기록 전체 취소
   * @returns 'cancelled' — 성공, 'not_found' — 오늘 기록 없음
   */
  const cancelToday = useCallback(async (): Promise<'cancelled' | 'not_found'> => {
    const today = getTodayKST()
    const todayRecords = records.filter(r => r.recordedDate === today)
    if (todayRecords.length === 0) return 'not_found'

    await Promise.all(todayRecords.map(r => apiDeleteRecord(r.id)))
    await refresh()
    return 'cancelled'
  }, [records, refresh])

  /**
   * 특정 날짜로 운동 세션 수동 추가
   * @returns 'recorded' — 성공, 'future' — 미래 날짜, 'duplicate' — 중복
   */
  const addManual = useCallback(async (date: string, label?: string): Promise<'recorded' | 'future' | 'duplicate'> => {
    const today = getTodayKST()
    if (date > today) return 'future'

    try {
      await addRecord(date, 'manual', label)
      await refresh()
      return 'recorded'
    } catch (err: unknown) {
      const apiErr = err as { error?: string }
      if (apiErr?.error === 'DUPLICATE_DATE') return 'duplicate'
      throw err
    }
  }, [refresh])

  /** ID로 특정 운동 기록 삭제 */
  const deleteRecord = useCallback(async (id: string) => {
    await apiDeleteRecord(id)
    await refresh()
  }, [refresh])

  /** 모든 운동 기록 삭제 */
  const deleteAllRecords = useCallback(async () => {
    await apiDeleteAllRecords()
    await refresh()
  }, [refresh])

  return { records, stats, recordToday, cancelToday, addManual, deleteRecord, deleteAllRecords }
}
