// src/components/home/SessionInputModal.tsx
import { useState, useRef, useEffect } from 'react'

type SessionInputModalProps = {
  onConfirm: (label: string) => void
  onCancel: () => void
}

/**
 * 운동 세션 추가 바텀시트 모달
 * - 라벨(운동 종류)을 텍스트로 입력받는다
 * - 빈 입력으로 확인 시 라벨 없이 세션 추가
 */
export function SessionInputModal({ onConfirm, onCancel }: SessionInputModalProps) {
  const [label, setLabel] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 모달이 열릴 때 자동으로 입력창에 포커스
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleConfirm = () => {
    onConfirm(label.trim())
  }

  // Enter 키로 확인, Escape 키로 취소
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') onCancel()
  }

  return (
    // 전체 화면을 덮는 반투명 오버레이
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      {/* 바텀시트 카드 */}
      <div style={{
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        borderRadius: '20px 20px 0 0', padding: '24px 20px 40px',
        width: '100%', maxWidth: '480px',
      }}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>
          운동 세션 추가
        </p>
        {/* 운동 종류 입력 */}
        <input
          ref={inputRef}
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="운동 종류 입력 (예: 헬스, 복싱) — 선택사항"
          maxLength={30}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: '12px',
            border: '1px solid var(--border)', background: 'var(--surface-deep)',
            color: 'var(--text)', fontSize: '14px', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {/* 확인 / 취소 버튼 */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px', borderRadius: '12px',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px',
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, var(--blue-dark), var(--blue))',
              color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
            }}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  )
}
