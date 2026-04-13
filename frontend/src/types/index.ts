// src/types/index.ts

export type WorkoutRecord = {
  id: string            // crypto.randomUUID()
  recordedAt: string    // ISO datetime (기록 생성 시각)
  recordedDate: string  // YYYY-MM-DD (Asia/Seoul 기준, 통계 계산 기준)
  createdAt: string     // ISO datetime
  source: 'today_button' | 'manual'
  label?: string        // 운동 종류 (예: '헬스', '복싱') — 선택 입력
}

export type UserSettings = {
  weeklyGoal: number    // 1~7, 기본값 3
  timezone: 'Asia/Seoul'
}

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
