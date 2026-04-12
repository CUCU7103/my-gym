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

/** 홈 화면 - 오늘의 운동 기록 버튼, 주간 도트, 통계 카드, 목표 바, 미니 캘린더로 구성 */
export function HomePage() {
  const { stats, settings, records, recordToday, addManual } = useAppContext()
  // 토스트 메시지 상태 (null이면 미표시)
  const [toast, setToast] = useState<string | null>(null)

  /** 오늘 운동 기록 버튼 핸들러 - 중복 기록 시 토스트 표시 */
  const handleRecord = useCallback(async () => {
    const result = await recordToday()
    if (result === 'duplicate') {
      setToast('오늘은 이미 기록했어요')
    }
  }, [recordToday])

  /** 달력 날짜 선택 핸들러 - 과거 날짜 수동 기록 (중복 여부는 addManual에서 처리) */
  const handleDateSelect = useCallback(async (date: string) => {
    const today = getTodayKST()
    // 과거 날짜만 수동 기록 허용
    if (date < today) {
      const result = await addManual(date)
      if (result === 'recorded') setToast(`${date} 기록을 추가했어요`)
      else if (result === 'duplicate') setToast('이미 기록된 날짜예요')
    }
  }, [addManual])

  // 기록된 날짜 Set (미니 캘린더에서 O(1) 조회, records 변경 시에만 재생성)
  const recordedDateSet = useMemo(
    () => new Set(records.map(r => r.recordedDate)),
    [records]
  )
  // 이번 달 YYYY-MM 형식
  const currentYearMonth = getTodayKST().slice(0, 7)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px' }}>
      {/* 오늘 날짜 및 완료 상태 헤더 */}
      <TodayHeader isTodayRecorded={stats.isTodayRecorded} />
      {/* 오늘 운동 기록 버튼 */}
      <RecordButton isTodayRecorded={stats.isTodayRecorded} onRecord={handleRecord} />
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
    </div>
  )
}
