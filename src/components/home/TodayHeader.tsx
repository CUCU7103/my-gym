// src/components/home/TodayHeader.tsx
import { formatDisplayDate, getTodayKST } from '../../utils/date'

type TodayHeaderProps = {
  isTodayRecorded: boolean
}

/** 오늘 날짜와 운동 완료 여부를 표시하는 헤더 컴포넌트 */
export function TodayHeader({ isTodayRecorded }: TodayHeaderProps) {
  const today = getTodayKST()

  return (
    <div style={{ textAlign: 'center' }}>
      {/* 오늘 날짜 표시 (예: 4월 12일 일요일) */}
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
        {formatDisplayDate(today)}
      </p>
      {/* 운동 완료 여부에 따라 배지 스타일 분기 */}
      <span style={{
        display: 'inline-block',
        padding: '4px 14px',
        borderRadius: '20px',
        fontSize: '11px',
        background: isTodayRecorded ? 'var(--blue-tint)' : 'var(--surface)',
        border: `1px solid ${isTodayRecorded ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
        color: isTodayRecorded ? 'var(--blue)' : 'var(--text-secondary)',
      }}>
        {isTodayRecorded ? '✓ 오늘 운동 완료!' : '아직 기록 안 했어요'}
      </span>
    </div>
  )
}
