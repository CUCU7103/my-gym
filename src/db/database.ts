// src/db/database.ts
import Dexie, { type Table } from 'dexie'
import type { WorkoutRecord, UserSettings } from '../types'

class GymDatabase extends Dexie {
  workoutRecords!: Table<WorkoutRecord>
  userSettings!: Table<UserSettings & { id: number }>

  constructor() {
    super('my-gym-db')
    this.version(1).stores({
      workoutRecords: 'id, recordedDate, recordedAt',
      userSettings: 'id',
    })
    // v2: WorkoutRecord에 label 필드 추가 (선택 입력, 기존 데이터 영향 없음)
    this.version(2).stores({
      workoutRecords: 'id, recordedDate, recordedAt',
      userSettings: 'id',
    })
  }
}

export const db = new GymDatabase()

/** 기본 설정 반환 또는 생성 */
export async function getOrCreateSettings(): Promise<UserSettings> {
  const existing = await db.userSettings.get(1)
  if (existing) {
    const { id: _id, ...settings } = existing
    return settings as UserSettings
  }
  const defaults: UserSettings = { weeklyGoal: 3, timezone: 'Asia/Seoul' }
  await db.userSettings.put({ id: 1, ...defaults })
  return defaults
}
