// src/components/records/RecordItem.tsx
import { useState } from 'react'
import type { WorkoutRecord } from '../../types'
import { getTodayKST, formatDisplayDate } from '../../utils/date'
import { ConfirmModal } from '../shared/ConfirmModal'

type RecordItemProps = {
  record: WorkoutRecord
  onDelete: (id: string) => void
}

/** 개별 운동 기록 행 컴포넌트 — 오늘 기록 강조 표시, 라벨 표시 및 삭제 확인 모달 포함 */
export function RecordItem({ record, onDelete }: RecordItemProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const isToday = record.recordedDate === getTodayKST()

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: isToday ? 'rgba(59,130,246,0.05)' : 'var(--surface)',
        border: `1px solid ${isToday ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
        borderRadius: '12px', padding: '12px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%', background: 'var(--blue)', flexShrink: 0,
            boxShadow: isToday ? '0 0 8px rgba(59,130,246,0.8)' : 'none',
          }} />
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 600 }}>
              {formatDisplayDate(record.recordedDate)}
              {isToday && <span style={{ color: 'var(--blue)', marginLeft: '4px' }}>· 오늘</span>}
            </p>
            {/* 라벨이 있는 경우 운동 종류 표시 */}
            {record.label && (
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {record.label}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '9px', padding: '2px 8px', borderRadius: '10px',
            background: 'var(--surface-deep)',
            border: record.source === 'manual' ? '1px solid var(--border)' : '1px solid rgba(59,130,246,0.2)',
            color: record.source === 'manual' ? 'var(--text-muted)' : 'rgba(59,130,246,0.7)',
          }}>
            {record.source === 'manual' ? '수동' : '버튼'}
          </span>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)', padding: '4px' }}
          >
            삭제
          </button>
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          message={`${formatDisplayDate(record.recordedDate)}${record.label ? ` (${record.label})` : ''} 기록을 삭제할까요?`}
          onConfirm={() => { onDelete(record.id); setShowConfirm(false) }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
