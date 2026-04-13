// src/components/home/StatsCards.tsx
type StatsCardsProps = {
  weeklyCount: number
  monthlyCount: number
}

/** 이번 주 / 이번 달 운동 횟수를 카드 형태로 나란히 표시하는 컴포넌트 */
export function StatsCards({ weeklyCount, monthlyCount }: StatsCardsProps) {
  // 두 카드에 공통으로 적용되는 스타일
  const cardStyle = {
    flex: 1,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '14px 8px',
    textAlign: 'center' as const,
  }

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {/* 이번 주 운동 횟수 카드 */}
      <div style={cardStyle}>
        <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>{weeklyCount}</p>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>이번 주</p>
      </div>
      {/* 이번 달 운동 횟수 카드 */}
      <div style={cardStyle}>
        <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>{monthlyCount}</p>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>이번 달</p>
      </div>
    </div>
  )
}
