// backend/src/types.ts
// 프론트엔드 types/index.ts와 동일한 구조를 유지한다

export type WorkoutRecord = {
  id: string
  recordedAt: string    // ISO datetime
  recordedDate: string  // YYYY-MM-DD (Asia/Seoul 기준)
  createdAt: string     // ISO datetime
  source: 'today_button' | 'manual'
  label?: string
}

export type UserSettings = {
  weeklyGoal: number    // 1~7
  timezone: 'Asia/Seoul'
}
