// src/components/records/DatePickerModal.tsx
import { useState } from 'react'
import { getTodayKST } from '../../utils/date'

type DatePickerModalProps = {
  onConfirm: (date: string) => void
  onCancel: () => void
}

/** 과거 날짜 수동 추가용 날짜 선택 모달 — 오늘 이후 날짜는 선택 불가 */
export function DatePickerModal({ onConfirm, onCancel }: DatePickerModalProps) {
  const today = getTodayKST()
  // 기본 선택값은 오늘 날짜
  const [selected, setSelected] = useState(today)

  return (
    // 전체 화면 오버레이
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }}>
      {/* 모달 카드 */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '20px', padding: '24px 20px', width: '80%', maxWidth: '300px',
      }}>
        <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '16px', fontWeight: 600 }}>
          날짜 선택
        </p>
        {/* 날짜 입력 — max를 오늘로 제한하여 미래 날짜 선택 방지 */}
        <input
          type="date"
          value={selected}
          max={today}
          onChange={e => setSelected(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: '10px',
            background: 'var(--surface-deep)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: '14px', marginBottom: '16px',
            colorScheme: 'dark',
          }}
        />
        {/* 취소 / 추가 버튼 */}
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
            onClick={() => onConfirm(selected)}
            style={{
              flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
              background: 'var(--blue)', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
            }}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  )
}
