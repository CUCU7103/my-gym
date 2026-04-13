// src/components/settings/GoalStepper.tsx
type GoalStepperProps = {
  value: number
  onChange: (v: number) => void
}

/** 주간 운동 목표 설정 스테퍼 — 1~7 범위 내에서 ±1 조절 */
export function GoalStepper({ value, onChange }: GoalStepperProps) {
  // 비활성화 여부에 따라 색상을 다르게 표시
  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    width: '28px', height: '28px', borderRadius: '50%',
    background: 'var(--border)', border: 'none',
    color: disabled ? 'var(--text-muted)' : 'var(--blue)',
    fontSize: '16px', cursor: disabled ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {/* 감소 버튼 — 최솟값(1)이면 클릭해도 onChange를 호출하지 않음 */}
      <button
        type="button"
        style={btnStyle(value <= 1)}
        onClick={() => value > 1 && onChange(value - 1)}
      >
        −
      </button>
      <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--blue)', minWidth: '20px', textAlign: 'center' }}>
        {value}
      </span>
      {/* 증가 버튼 — 최댓값(7)이면 클릭해도 onChange를 호출하지 않음 */}
      <button
        type="button"
        style={btnStyle(value >= 7)}
        onClick={() => value < 7 && onChange(value + 1)}
      >
        +
      </button>
    </div>
  )
}
