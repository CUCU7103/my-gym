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
  // 빠른 조회를 위해 날짜 Set 생성
  const dateSet = new Set(records.map(r => r.recordedDate))

  // 이번 주 기록 수 계산
  const weeklyCount = records.filter(r => isThisWeekKST(r.recordedDate)).length
  // 이번 달 기록 수 계산
  const monthlyCount = records.filter(r => isThisMonthKST(r.recordedDate)).length

  return {
    weeklyCount,
    monthlyCount,
    totalCount: records.length,
    // 최근 7일 각 날짜에 기록이 있는지 boolean 배열로 반환
    recent7Days: recent7.map(d => dateSet.has(d)),
    // 주간 목표 달성률 (0 나눗셈 방지)
    weeklyGoalProgress: weeklyGoal > 0 ? weeklyCount / weeklyGoal : 0,
    // 오늘 기록 여부
    isTodayRecorded: dateSet.has(today),
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
  })

  /** DB에서 전체 기록을 불러와 상태 갱신 */
  const refresh = useCallback(async () => {
    const all = await db.workoutRecords.toArray()
    // 최신 날짜가 앞에 오도록 내림차순 정렬
    all.sort((a, b) => b.recordedDate.localeCompare(a.recordedDate))
    setRecords(all)
    setStats(calcStats(all, weeklyGoal))
  }, [weeklyGoal])

  // 컴포넌트 마운트 또는 weeklyGoal 변경 시 데이터 로드
  useEffect(() => { refresh() }, [refresh])

  /**
   * 오늘 날짜로 운동 기록 추가
   * @returns 'recorded' - 성공, 'duplicate' - 이미 오늘 기록 존재
   */
  const recordToday = useCallback(async (): Promise<'recorded' | 'duplicate'> => {
    const today = getTodayKST()
    // 오늘 날짜로 이미 기록이 있는지 확인
    const existing = await db.workoutRecords.where('recordedDate').equals(today).first()
    if (existing) return 'duplicate'

    const record: WorkoutRecord = {
      id: crypto.randomUUID(),
      recordedAt: new Date().toISOString(),
      recordedDate: today,
      createdAt: new Date().toISOString(),
      source: 'today_button',
    }
    await db.workoutRecords.add(record)
    await refresh()
    return 'recorded'
  }, [refresh])

  /**
   * 특정 날짜로 운동 기록 수동 추가
   * @returns 'recorded' - 성공, 'duplicate' - 해당 날짜 기록 존재, 'future' - 미래 날짜
   */
  const addManual = useCallback(async (date: string): Promise<'recorded' | 'duplicate' | 'future'> => {
    const today = getTodayKST()
    // 미래 날짜는 추가 불가
    if (date > today) return 'future'

    // 해당 날짜에 이미 기록이 있는지 확인
    const existing = await db.workoutRecords.where('recordedDate').equals(date).first()
    if (existing) return 'duplicate'

    const record: WorkoutRecord = {
      id: crypto.randomUUID(),
      recordedAt: new Date().toISOString(),
      recordedDate: date,
      createdAt: new Date().toISOString(),
      source: 'manual',
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

  return { records, stats, recordToday, addManual, deleteRecord, deleteAllRecords }
}
