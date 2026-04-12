// src/types/index.ts

export type WorkoutRecord = {
  id: string            // crypto.randomUUID()
  recordedAt: string    // ISO datetime (기록 생성 시각)
  recordedDate: string  // YYYY-MM-DD (Asia/Seoul 기준, 통계 계산 기준)
  createdAt: string     // ISO datetime
  source: 'today_button' | 'manual'
}

export type UserSettings = {
  weeklyGoal: number    // 1~7, 기본값 3
  timezone: 'Asia/Seoul'
}

export type ActiveTab = 'home' | 'records' | 'settings'

// 파생 통계 타입
export type WorkoutStats = {
  weeklyCount: number        // 이번 주 기록 수
  monthlyCount: number       // 이번 달 기록 수
  totalCount: number         // 전체 기록 수
  recent7Days: boolean[]     // 오늘 포함 최근 7일 (index 0 = 6일 전, index 6 = 오늘)
  weeklyGoalProgress: number // weeklyCount / weeklyGoal (0~1+)
  isTodayRecorded: boolean   // 오늘 기록 여부
}
