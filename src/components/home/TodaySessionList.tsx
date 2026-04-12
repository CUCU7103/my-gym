// src/components/home/TodaySessionList.tsx
import type { WorkoutRecord } from '../../types'

type TodaySessionListProps = {
  sessions: WorkoutRecord[]
}

/**
 * 오늘 기록한 운동 세션 목록
 * - 세션이 없으면 렌더링하지 않음
 * - 라벨이 있는 세션은 이름 표시, 없으면 "운동"으로 표시
 */
export function TodaySessionList({ sessions }: TodaySessionListProps) {
  if (sessions.length === 0) return null

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '6px',
      justifyContent: 'center',
    }}>
      {sessions.map((session, index) => (
        <span
          key={session.id}
          style={{
            fontSize: '11px',
            padding: '3px 10px',
            borderRadius: '20px',
            background: 'var(--blue-tint)',
            border: '1px solid rgba(59,130,246,0.3)',
            color: 'var(--blue)',
          }}
        >
          {/* 여러 세션이면 번호 표시 */}
          {sessions.length > 1 ? `${index + 1}. ` : ''}
          {session.label || '운동'}
        </span>
      ))}
    </div>
  )
}
