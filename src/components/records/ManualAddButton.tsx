// src/components/records/ManualAddButton.tsx

type ManualAddButtonProps = {
  onClick: () => void
}

/** 과거 날짜 기록을 수동으로 추가하는 버튼 — 점선 테두리 스타일 */
export function ManualAddButton({ onClick }: ManualAddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', padding: '12px',
        borderRadius: '12px', border: '1.5px dashed var(--border)',
        background: 'transparent', color: 'var(--text-muted)',
        cursor: 'pointer', fontSize: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
      }}
    >
      + 과거 날짜 기록 추가
    </button>
  )
}
