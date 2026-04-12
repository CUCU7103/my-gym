// src/components/records/RecordItem.tsx
import { useState } from 'react'
import type { WorkoutRecord } from '../../types'
import { getTodayKST, formatDisplayDate } from '../../utils/date'
import { ConfirmModal } from '../shared/ConfirmModal'

type RecordItemProps = {
  record: WorkoutRecord
  onDelete: (id: string) => void
}

/** 개별 운동 기록 행 컴포넌트 — 오늘 기록 강조 표시 및 삭제 확인 모달 포함 */
export function RecordItem({ record, onDelete }: RecordItemProps) {
  // 삭제 확인 모달 표시 여부
  const [showConfirm, setShowConfirm] = useState(false)
  // 오늘 날짜와 일치하는 기록인지 확인
  const isToday = record.recordedDate === getTodayKST()

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        // 오늘 기록은 파란 배경 강조, 그 외 기본 surface
        background: isToday ? 'rgba(59,130,246,0.05)' : 'var(--surface)',
        border: `1px solid ${isToday ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
        borderRadius: '12px', padding: '12px 14px',
      }}>
        {/* 왼쪽: 날짜 정보 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* 오늘 기록은 파란 글로우 효과 적용 */}
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%', background: 'var(--blue)', flexShrink: 0,
            boxShadow: isToday ? '0 0 8px rgba(59,130,246,0.8)' : 'none',
          }} />
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 600 }}>
              {formatDisplayDate(record.recordedDate)}
              {/* 오늘 기록에만 "오늘" 뱃지 표시 */}
              {isToday && <span style={{ color: 'var(--blue)', marginLeft: '4px' }}>· 오늘</span>}
            </p>
          </div>
        </div>

        {/* 오른쪽: 기록 출처 뱃지 및 삭제 버튼 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 수동 입력(manual) vs 버튼 입력(today_button) 구분 배지 */}
          <span style={{
            fontSize: '9px', padding: '2px 8px', borderRadius: '10px',
            background: 'var(--surface-deep)',
            border: record.source === 'manual' ? '1px solid var(--border)' : '1px solid rgba(59,130,246,0.2)',
            color: record.source === 'manual' ? 'var(--text-muted)' : 'rgba(59,130,246,0.7)',
          }}>
            {record.source === 'manual' ? '수동' : '버튼'}
          </span>
          {/* 삭제 버튼 클릭 시 확인 모달 표시 */}
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)', padding: '4px' }}
          >
            삭제
          </button>
        </div>
      </div>

      {/* 삭제 확인 모달 — showConfirm이 true일 때만 렌더링 */}
      {showConfirm && (
        <ConfirmModal
          message={`${formatDisplayDate(record.recordedDate)} 기록을 삭제할까요?`}
          onConfirm={() => { onDelete(record.id); setShowConfirm(false) }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
