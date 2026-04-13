// src/components/records/RecordsPage.tsx
import { useState, useMemo, useCallback } from 'react'
import { useAppContext } from '../../context/AppContext'
import { isThisWeekKST, isThisMonthKST } from '../../utils/date'
import { FilterChips, type FilterType } from './FilterChips'
import { RecordList } from './RecordList'
import { ManualAddButton } from './ManualAddButton'
import { DatePickerModal } from './DatePickerModal'
import { Toast } from '../shared/Toast'

/** 기록 화면 — 운동 기록 목록 조회, 필터링, 삭제, 수동 날짜 추가 기능 제공 */
export function RecordsPage() {
  const { records, stats, deleteRecord, addManual } = useAppContext()
  // 현재 선택된 필터 (전체 / 이번 달 / 이번 주)
  const [filter, setFilter] = useState<FilterType>('all')
  // 날짜 선택 모달 표시 여부
  const [showDatePicker, setShowDatePicker] = useState(false)
  // 토스트 메시지 (null이면 숨김)
  const [toast, setToast] = useState<string | null>(null)
  // useCallback으로 함수 참조 고정 — 인라인 함수 사용 시 Toast의 useEffect([onClose])가 매 렌더마다 재실행되어 타이머 초기화됨
  const handleToastClose = useCallback(() => setToast(null), [])

  // 필터에 따라 기록 목록 필터링 (records 또는 filter가 변경될 때만 재계산)
  const filtered = useMemo(() => {
    if (filter === 'week')  return records.filter(r => isThisWeekKST(r.recordedDate))
    if (filter === 'month') return records.filter(r => isThisMonthKST(r.recordedDate))
    return records
  }, [records, filter])

  /** 수동 날짜 추가 처리 — 중복/미래 날짜 여부에 따라 토스트 메시지 표시 */
  const handleManualAdd = useCallback(async (date: string) => {
    setShowDatePicker(false)
    const result = await addManual(date)
    if (result === 'duplicate') setToast('이미 기록된 날짜예요')
    else if (result === 'future') setToast('미래 날짜는 기록할 수 없어요')
    else setToast('기록을 추가했어요')
  }, [addManual])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px' }}>
      {/* 헤더 — 제목 및 총 기록 횟수 */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>기록</h1>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
          총 {stats.totalCount}회 기록됨
        </p>
      </div>

      {/* 필터 칩 */}
      <FilterChips active={filter} onChange={setFilter} />

      {/* 필터링된 기록 목록 */}
      <RecordList records={filtered} onDelete={deleteRecord} />

      {/* 과거 날짜 수동 추가 버튼 */}
      <ManualAddButton onClick={() => setShowDatePicker(true)} />

      {/* 날짜 선택 모달 */}
      {showDatePicker && (
        <DatePickerModal onConfirm={handleManualAdd} onCancel={() => setShowDatePicker(false)} />
      )}

      {/* 결과 알림 토스트 */}
      {toast && <Toast message={toast} onClose={handleToastClose} />}
    </div>
  )
}
