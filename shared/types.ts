// shared/types.ts
// 프론트엔드와 백엔드가 공유하는 핵심 도메인 타입
// ActiveTab, WorkoutStats 등 프론트엔드 전용 타입은 각자 정의한다

export type WorkoutRecord = {
  id: string
  recordedAt: string    // ISO datetime (기록 생성 시각)
  recordedDate: string  // YYYY-MM-DD (Asia/Seoul 기준, 통계 계산 기준)
  createdAt: string     // ISO datetime
  source: 'today_button' | 'manual'
  label?: string        // 운동 종류 (선택 입력)
}

export type UserSettings = {
  weeklyGoal: number    // 1~7, 기본값 3
  timezone: 'Asia/Seoul'
}
