// src/components/home/RecordButton.tsx
type RecordButtonProps = {
  isTodayRecorded: boolean
  onRecord: () => void
}

/** 오늘 운동 기록 버튼 - 완료 여부에 따라 스타일과 텍스트가 변경됨 */
export function RecordButton({ isTodayRecorded, onRecord }: RecordButtonProps) {
  return (
    <div>
      <button
        onClick={onRecord}
        style={{
          width: '100%',
          padding: '20px',
          borderRadius: '20px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '15px',
          fontWeight: 700,
          color: '#fff',
          background: 'linear-gradient(135deg, var(--blue-dark), var(--blue))',
          // 완료 시 글로우 효과를 더 강하게 표시
          boxShadow: isTodayRecorded
            ? '0 0 50px rgba(59,130,246,0.7), 0 8px 20px rgba(0,0,0,0.4)'
            : '0 0 30px rgba(59,130,246,0.4), 0 8px 20px rgba(0,0,0,0.4)',
          transition: 'box-shadow 0.3s ease',
        }}
      >
        {isTodayRecorded ? '✓ 오늘 운동 완료' : '오늘 운동 기록'}
      </button>
      {/* 완료 시에만 보조 텍스트 표시 */}
      {isTodayRecorded && (
        <p style={{
          textAlign: 'center',
          marginTop: '8px',
          fontSize: '11px',
          color: 'var(--blue-light)',
        }}>
          ✦ 오늘도 해냈어요
        </p>
      )}
    </div>
  )
}
