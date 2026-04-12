// src/components/records/RecordList.tsx
import type { WorkoutRecord } from '../../types'
import { RecordItem } from './RecordItem'

type RecordListProps = {
  records: WorkoutRecord[]
  onDelete: (id: string) => void
}

/** 운동 기록 목록 컴포넌트 — 기록이 없을 때 빈 상태 메시지 표시 */
export function RecordList({ records, onDelete }: RecordListProps) {
  // 기록이 없으면 빈 상태 안내 메시지 렌더링
  if (records.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>기록이 없어요</p>
      </div>
    )
  }

  // 기록이 있으면 각 RecordItem을 세로로 나열
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {records.map(record => (
        <RecordItem key={record.id} record={record} onDelete={onDelete} />
      ))}
    </div>
  )
}
