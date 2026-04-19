// src/types/index.ts
// WorkoutRecord·UserSettings는 shared/types.ts에서 관리된다
export type { WorkoutRecord, UserSettings } from '@shared/types'

export type ActiveTab = 'home' | 'records' | 'settings'

// 파생 통계 타입
export type WorkoutStats = {
  weeklyCount: number        // 이번 주 세션 수
  monthlyCount: number       // 이번 달 세션 수
  totalCount: number         // 전체 세션 수
  recent7Days: boolean[]     // 오늘 포함 최근 7일 (index 0 = 6일 전, index 6 = 오늘)
  weeklyGoalProgress: number // weeklyCount / weeklyGoal (0~1+)
  isTodayRecorded: boolean   // 오늘 1건 이상 기록 여부
  todaySessionCount: number  // 오늘 기록한 세션 수
}
