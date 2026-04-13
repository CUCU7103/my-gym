// src/components/home/MiniCalendar.tsx
import { getMonthDates, getFirstDayOfWeek, getTodayKST } from '../../utils/date'

type MiniCalendarProps = {
  yearMonth: string       // 'YYYY-MM' 형식
  recordedDates: Set<string>
  onDateSelect: (date: string) => void
}

// 달력 헤더 요일 (월요일 시작)
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

/** 미니 달력 컴포넌트 - 이번 달 운동 기록 날짜를 시각적으로 표시하고 과거 날짜 수동 기록 가능 */
export function MiniCalendar({ yearMonth, recordedDates, onDateSelect }: MiniCalendarProps) {
  const today = getTodayKST()
  // 이번 달의 모든 날짜 배열
  const dates = getMonthDates(yearMonth)
  const [, month] = yearMonth.split('-')

  // 첫 날 요일(0=일...6=토) → 월요일 기준 오프셋으로 변환 (일=6, 월=0, ..., 토=5)
  const firstDay = getFirstDayOfWeek(yearMonth)
  const startOffset = firstDay === 0 ? 6 : firstDay - 1

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '14px',
      padding: '12px 14px',
    }}>
      {/* 달력 헤더: 월 표시 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{month}월</span>
      </div>

      {/* 7열 그리드: 요일 헤더 + 날짜 셀 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {/* 요일 헤더 행 */}
        {WEEKDAYS.map(d => (
          <div key={d} style={{ fontSize: '8px', color: 'var(--text-muted)', textAlign: 'center', paddingBottom: '4px' }}>
            {d}
          </div>
        ))}

        {/* 첫 날 이전 빈 셀 (요일 맞춤) */}
        {Array.from({ length: startOffset }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* 날짜 셀 */}
        {dates.map(date => {
          // 앞의 0 제거하여 날짜 숫자만 표시 (예: '01' → '1')
          const day = date.split('-')[2].replace(/^0/, '')
          const isToday = date === today
          const isRecorded = recordedDates.has(date)
          const isFuture = date > today

          return (
            <button
              key={date}
              type="button"
              disabled={isFuture}
              onClick={() => !isFuture && onDateSelect(date)}
              style={{
                aspectRatio: '1',
                borderRadius: '5px',
                border: isToday ? '1px solid var(--blue)' : 'none',
                // 기록된 날짜는 파란 배경, 나머지는 투명
                background: isRecorded ? 'rgba(59,130,246,0.2)' : 'transparent',
                // 기록/오늘/미래/과거 순으로 텍스트 색상 분기
                color: isRecorded
                  ? 'var(--blue)'
                  : isToday
                    ? 'var(--blue)'
                    : isFuture
                      ? '#333'
                      : 'var(--text-muted)',
                fontSize: '9px',
                fontWeight: isToday || isRecorded ? 600 : 400,
                cursor: isFuture ? 'default' : 'pointer',
              }}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
