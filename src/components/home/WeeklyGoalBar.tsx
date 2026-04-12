// src/components/home/WeeklyGoalBar.tsx
type WeeklyGoalBarProps = {
  weeklyCount: number
  weeklyGoal: number
}

/** 주간 목표 달성률을 프로그레스 바로 표시하는 컴포넌트 */
export function WeeklyGoalBar({ weeklyCount, weeklyGoal }: WeeklyGoalBarProps) {
  // 진행률 계산 (최대 100%)
  const progress = Math.min(weeklyCount / weeklyGoal, 1)
  const isDone = weeklyCount >= weeklyGoal

  return (
    <div style={{
      background: 'var(--surface)',
      // 목표 달성 시 테두리를 파란색 계열로 강조
      border: `1px solid ${isDone ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
      borderRadius: '14px',
      padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        {/* 목표 달성 여부에 따라 레이블 텍스트 분기 */}
        <span style={{ fontSize: '10px', color: isDone ? 'var(--blue)' : 'var(--text-secondary)' }}>
          {isDone ? '주간 목표 달성! 🎉' : '주간 목표'}
        </span>
        {/* 현재 횟수 / 목표 횟수 표시 */}
        <span style={{ fontSize: '10px', color: 'var(--blue)', fontWeight: 600 }}>
          {weeklyCount} / {weeklyGoal}회
        </span>
      </div>
      {/* 프로그레스 바 */}
      <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px' }}>
        <div style={{
          height: '100%',
          width: `${progress * 100}%`,
          background: 'linear-gradient(90deg, var(--blue-dark), var(--blue))',
          borderRadius: '2px',
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  )
}
