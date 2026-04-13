// frontend/src/api/records.ts
import { apiFetch } from './client'
import type { WorkoutRecord } from '../types'

export type RecordFilter = 'all' | 'week' | 'month'

// 운동 기록 전체 조회 (필터 선택)
export async function getRecords(filter: RecordFilter = 'all'): Promise<WorkoutRecord[]> {
  const query = filter !== 'all' ? `?filter=${filter}` : ''
  return apiFetch<WorkoutRecord[]>(`/api/records${query}`)
}

// 운동 기록 추가
export async function addRecord(
  recordedDate: string,
  source: 'today_button' | 'manual',
  label?: string
): Promise<WorkoutRecord> {
  return apiFetch<WorkoutRecord>('/api/records', {
    method: 'POST',
    body: JSON.stringify({ recordedDate, source, label }),
  })
}

// 특정 기록 삭제
export async function deleteRecord(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/records/${id}`, { method: 'DELETE' })
}

// 전체 기록 삭제
export async function deleteAllRecords(): Promise<void> {
  await apiFetch<{ ok: boolean }>('/api/records', { method: 'DELETE' })
}
