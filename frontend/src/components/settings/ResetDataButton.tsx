// src/components/settings/ResetDataButton.tsx
import { useState } from 'react'
import { ConfirmModal } from '../shared/ConfirmModal'

type ResetDataButtonProps = {
  onReset: () => void
}

/** 모든 운동 기록 초기화 버튼 — 확인 모달을 통해 실수 방지 */
export function ResetDataButton({ onReset }: ResetDataButtonProps) {
  // 확인 모달 표시 여부
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        style={{
          width: '100%', padding: '13px',
          borderRadius: '12px', border: '1px solid rgba(239,68,68,0.3)',
          background: 'rgba(239,68,68,0.05)', color: 'var(--danger)',
          cursor: 'pointer', fontSize: '13px', fontWeight: 600,
        }}
      >
        모든 기록 초기화
      </button>
      {/* 초기화 전 한 번 더 확인하는 모달 */}
      {showConfirm && (
        <ConfirmModal
          message="모든 운동 기록이 삭제됩니다. 되돌릴 수 없어요."
          onConfirm={() => { onReset(); setShowConfirm(false) }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
