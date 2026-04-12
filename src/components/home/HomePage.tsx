// src/components/home/HomePage.tsx
import { useState, useCallback, useMemo } from 'react'
import { useAppContext } from '../../context/AppContext'
import { getTodayKST } from '../../utils/date'
import { TodayHeader } from './TodayHeader'
import { RecordButton } from './RecordButton'
import { WeekDots } from './WeekDots'
import { StatsCards } from './StatsCards'
import { WeeklyGoalBar } from './WeeklyGoalBar'
import { MiniCalendar } from './MiniCalendar'
import { Toast } from '../shared/Toast'
import { ConfirmModal } from '../shared/ConfirmModal'
import { SessionInputModal } from './SessionInputModal'
import { TodaySessionList } from './TodaySessionList'

/** 홈 화면 - 오늘의 운동 기록 버튼, 주간 도트, 통계 카드, 목표 바, 미니 캘린더로 구성 */
export function HomePage() {
  const { stats, settings, records, recordToday, cancelToday, addManual } = useAppContext()
  // 토스트 메시지 상태 (null이면 미표시)
  const [toast, setToast] = useState<string | null>(null)
  // 운동 취소 확인 모달 표시 여부
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  // 세션 추가 입력 모달 표시 여부
  const [showSessionInput, setShowSessionInput] = useState(false)

  /**
   * 완료 버튼 클릭 핸들러
   * - 미기록 → 세션 입력 모달 표시
   * - 완료 상태 → 전체 취소 확인 모달 표시
   */
  const handleRecord = useCallback(() => {
    if (stats.isTodayRecorded) {
      setShowCancelConfirm(true)
    } else {
      setShowSessionInput(true)
    }
  }, [stats.isTodayRecorded])

  /** 세션 추가 버튼 핸들러 — 항상 세션 입력 모달 표시 */
  const handleAddSession = useCallback(() => {
    setShowSessionInput(true)
  }, [])

  /** 세션 입력 확인 핸들러 */
  const handleSessionConfirm = useCallback(async (label: string) => {
    setShowSessionInput(false)
    try {
      await recordToday(label || undefined)
    } catch {
      setToast('기록 중 오류가 발생했어요. 다시 시도해주세요')
    }
  }, [recordToday])

  /** 운동 취소 확인 핸들러 — 오늘 전체 기록 삭제 */
  const handleCancelConfirm = useCallback(async () => {
    setShowCancelConfirm(false)
    try {
      const result = await cancelToday()
      if (result === 'cancelled') setToast('오늘 운동 기록을 취소했어요')
    } catch {
      setToast('취소 중 오류가 발생했어요. 다시 시도해주세요')
    }
  }, [cancelToday])

  /** 달력 날짜 선택 핸들러 - 과거 날짜 수동 기록 */
  const handleDateSelect = useCallback(async (date: string) => {
    const today = getTodayKST()
    if (date < today) {
      try {
        const result = await addManual(date)
        if (result === 'recorded') setToast(`${date} 기록을 추가했어요`)
      } catch {
        setToast('기록 중 오류가 발생했어요. 다시 시도해주세요')
      }
    }
  }, [addManual])

  // 기록된 날짜 Set (미니 캘린더에서 O(1) 조회)
  const recordedDateSet = useMemo(
    () => new Set(records.map(r => r.recordedDate)),
    [records]
  )
  // 오늘 세션 목록
  const todaySessions = useMemo(
    () => records.filter(r => r.recordedDate === getTodayKST()),
    [records]
  )
  const currentYearMonth = getTodayKST().slice(0, 7)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px' }}>
      {/* 오늘 날짜 및 완료 상태 헤더 */}
      <TodayHeader sessionCount={stats.todaySessionCount} />
      {/* 오늘 운동 기록 버튼 */}
      <RecordButton
        sessionCount={stats.todaySessionCount}
        onRecord={handleRecord}
      />
      {/* 오늘 세션 라벨 목록 */}
      <TodaySessionList sessions={todaySessions} />
      {/* 완료 상태일 때 세션 추가 버튼 표시 */}
      {stats.isTodayRecorded && (
        <button
          type="button"
          onClick={handleAddSession}
          style={{
            width: '100%', padding: '14px', borderRadius: '16px',
            border: '1px dashed rgba(59,130,246,0.4)',
            background: 'transparent', color: 'var(--blue)',
            cursor: 'pointer', fontSize: '13px', fontWeight: 600,
          }}
        >
          + 운동 세션 추가
        </button>
      )}
      {/* 최근 7일 도트 */}
      <WeekDots recent7Days={stats.recent7Days} />
      {/* 이번 주/달 통계 카드 */}
      <StatsCards weeklyCount={stats.weeklyCount} monthlyCount={stats.monthlyCount} />
      {/* 주간 목표 프로그레스 바 */}
      <WeeklyGoalBar weeklyCount={stats.weeklyCount} weeklyGoal={settings.weeklyGoal} />
      {/* 이번 달 미니 캘린더 */}
      <MiniCalendar
        yearMonth={currentYearMonth}
        recordedDates={recordedDateSet}
        onDateSelect={handleDateSelect}
      />
      {/* 토스트 알림 */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {/* 운동 취소 확인 모달 */}
      {showCancelConfirm && (
        <ConfirmModal
          message="오늘 운동 기록을 전체 취소할까요?"
          confirmLabel="취소하기"
          onConfirm={handleCancelConfirm}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}
      {/* 세션 추가 입력 모달 */}
      {showSessionInput && (
        <SessionInputModal
          onConfirm={handleSessionConfirm}
          onCancel={() => setShowSessionInput(false)}
        />
      )}
    </div>
  )
}
