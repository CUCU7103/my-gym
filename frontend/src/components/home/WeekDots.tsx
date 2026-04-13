// src/components/home/WeekDots.tsx
import { getRecent7DayDates, getTodayKST, getDayLabel } from '../../utils/date'

type WeekDotsProps = {
  // index 0 = 6일 전, index 6 = 오늘
  recent7Days: boolean[]
}

/** 최근 7일 운동 기록을 도트로 시각화하는 컴포넌트 */
export function WeekDots({ recent7Days }: WeekDotsProps) {
  // 최근 7일 날짜 배열 (오래된 순)과 오늘 날짜
  const dates = getRecent7DayDates()
  const today = getTodayKST()

  return (
    <div>
      <p style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '8px' }}>
        최근 7일
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {dates.map((date, i) => {
          const isToday = date === today
          const isRecorded = recent7Days[i]
          return (
            <div key={date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              {/* 운동 기록 여부와 오늘 여부에 따라 도트 스타일 분기 */}
              <div
                data-testid="dot"
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: isRecorded ? 'var(--blue)' : '#222',
                  border: isToday && !isRecorded ? '2px solid var(--blue)' : isRecorded ? 'none' : '1px solid #333',
                  boxShadow: isRecorded
                    ? isToday
                      ? '0 0 14px rgba(59,130,246,1)'
                      : '0 0 8px rgba(59,130,246,0.6)'
                    : isToday
                      ? '0 0 8px rgba(59,130,246,0.4)'
                      : 'none',
                }}
              />
              {/* 오늘은 '오늘', 나머지는 요일 약자 표시 */}
              <span style={{
                fontSize: '8px',
                color: isToday ? 'var(--blue)' : 'var(--text-muted)',
              }}>
                {isToday ? '오늘' : getDayLabel(date)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
