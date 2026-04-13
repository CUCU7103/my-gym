// src/components/shared/ConfirmModal.tsx

type ConfirmModalProps = {
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/** 확인/취소 두 버튼을 가진 모달 컴포넌트 */
export function ConfirmModal({ message, confirmLabel = '삭제', onConfirm, onCancel }: ConfirmModalProps) {
  return (
    // 전체 화면을 덮는 반투명 오버레이
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }}>
      {/* 모달 카드 */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '20px', padding: '24px 20px', width: '80%', maxWidth: '300px',
      }}>
        {/* 안내 메시지 */}
        <p style={{ fontSize: '14px', color: 'var(--text)', textAlign: 'center', marginBottom: '20px', lineHeight: 1.5 }}>
          {message}
        </p>
        {/* 취소 / 확인 버튼 영역 */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px',
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
              background: 'var(--danger)', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
