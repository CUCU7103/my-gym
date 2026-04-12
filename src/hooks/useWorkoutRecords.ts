// src/hooks/useWorkoutRecords.ts
import { useState, useEffect, useCallback } from 'react'
import { db } from '../db/database'
import type { WorkoutRecord, WorkoutStats } from '../types'
import {
  getTodayKST,
  isThisWeekKST,
  isThisMonthKST,
  getRecent7DayDates,
} from '../utils/date'

/** 기록 배열과 주간 목표를 받아 통계를 계산 */
function calcStats(records: WorkoutRecord[], weeklyGoal: number): WorkoutStats {
  const today = getTodayKST()
  const recent7 = getRecent7DayDates()
  // 날짜별 기록 여부를 위한 Set (recent7Days용)
  const dateSet = new Set(records.map(r => r.recordedDate))

  // 이번 주 세션 수 (날짜 중복 허용, 세션 기준)
  const weeklyCount = records.filter(r => isThisWeekKST(r.recordedDate)).length
  // 이번 달 세션 수
  const monthlyCount = records.filter(r => isThisMonthKST(r.recordedDate)).length
  // 오늘 세션 수
  const todaySessionCount = records.filter(r => r.recordedDate === today).length

  return {
    weeklyCount,
    monthlyCount,
    totalCount: records.length,
    // 최근 7일 각 날짜에 기록이 1건 이상 있는지 boolean 배열로 반환
    recent7Days: recent7.map(d => dateSet.has(d)),
    // 주간 목표 달성률 (0 나눗셈 방지)
    weeklyGoalProgress: weeklyGoal > 0 ? weeklyCount / weeklyGoal : 0,
    // 오늘 1건 이상 기록 여부
    isTodayRecorded: todaySessionCount > 0,
    todaySessionCount,
  }
}

/** 운동 기록 CRUD 훅 - IndexedDB 데이터를 읽고 쓰는 기능 제공 */
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

  /** DB에서 전체 기록을 불러와 상태 갱신 */
  const refresh = useCallback(async () => {
    const all = await db.workoutRecords.toArray()
    // 최신 시각 순으로 내림차순 정렬
    all.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    setRecords(all)
    setStats(calcStats(all, weeklyGoal))
  }, [weeklyGoal])

  useEffect(() => { refresh() }, [refresh])

  /**
   * 오늘 날짜로 운동 세션 추가 (같은 날 여러 번 호출 가능)
   * @param label - 운동 종류 (선택, 예: '헬스', '복싱')
   */
  const recordToday = useCallback(async (label?: string): Promise<'recorded'> => {
    const today = getTodayKST()
    const record: WorkoutRecord = {
      id: crypto.randomUUID(),
      recordedAt: new Date().toISOString(),
      recordedDate: today,
      createdAt: new Date().toISOString(),
      source: 'today_button',
      label: label?.trim() || undefined,
    }
    await db.workoutRecords.add(record)
    await refresh()
    return 'recorded'
  }, [refresh])

  /**
   * 오늘 날짜 운동 기록 전체 취소
   * @returns 'cancelled' - 성공, 'not_found' - 오늘 기록 없음
   */
  const cancelToday = useCallback(async (): Promise<'cancelled' | 'not_found'> => {
    const today = getTodayKST()
    // 오늘 날짜의 모든 기록을 조회 후 일괄 삭제
    const todayRecords = await db.workoutRecords.where('recordedDate').equals(today).toArray()
    if (todayRecords.length === 0) return 'not_found'

    await Promise.all(todayRecords.map(r => db.workoutRecords.delete(r.id!)))
    await refresh()
    return 'cancelled'
  }, [refresh])

  /**
   * 특정 날짜로 운동 세션 수동 추가 (같은 날 여러 번 호출 가능)
   * @param date - YYYY-MM-DD 형식
   * @param label - 운동 종류 (선택)
   * @returns 'recorded' - 성공, 'future' - 미래 날짜
   */
  const addManual = useCallback(async (date: string, label?: string): Promise<'recorded' | 'future'> => {
    const today = getTodayKST()
    if (date > today) return 'future'

    const record: WorkoutRecord = {
      id: crypto.randomUUID(),
      recordedAt: new Date().toISOString(),
      recordedDate: date,
      createdAt: new Date().toISOString(),
      source: 'manual',
      label: label?.trim() || undefined,
    }
    await db.workoutRecords.add(record)
    await refresh()
    return 'recorded'
  }, [refresh])

  /** ID로 특정 운동 기록 삭제 */
  const deleteRecord = useCallback(async (id: string) => {
    await db.workoutRecords.delete(id)
    await refresh()
  }, [refresh])

  /** 모든 운동 기록 삭제 (데이터 초기화) */
  const deleteAllRecords = useCallback(async () => {
    await db.workoutRecords.clear()
    await refresh()
  }, [refresh])

  return { records, stats, recordToday, cancelToday, addManual, deleteRecord, deleteAllRecords }
}
