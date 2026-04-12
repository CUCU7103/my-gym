// src/utils/date.ts

const TIMEZONE = 'Asia/Seoul'

/** 현재 KST 날짜를 YYYY-MM-DD 형식으로 반환 */
export function getTodayKST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE })
}

/** 이번 주 월요일 날짜를 YYYY-MM-DD로 반환 */
export function getWeekStartKST(): string {
  // KST 기준 오늘 날짜를 'YYYY-MM-DD'로 가져온 후 UTC 자정으로 파싱하여 요일 계산
  const todayStr = getTodayKST()
  const today = new Date(todayStr + 'T00:00:00Z')
  // getUTCDay(): 0=일, 1=월 ... 6=토 (UTC 기준이지만 날짜 문자열로 생성했으므로 동일)
  const dayOfWeek = today.getUTCDay()
  // 월요일 기준: 일요일(0)은 -6, 월(1)은 0, ..., 토(6)은 -5
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setUTCDate(today.getUTCDate() + diff)
  // UTC로 파싱했으므로 en-CA + UTC 타임존으로 날짜 문자열 반환
  return monday.toLocaleDateString('en-CA', { timeZone: 'UTC' })
}

/** 이번 달 1일을 YYYY-MM-DD로 반환 */
export function getMonthStartKST(): string {
  const today = getTodayKST()
  return today.slice(0, 7) + '-01'
}

/** 날짜(YYYY-MM-DD)가 이번 주에 속하는지 확인 */
export function isThisWeekKST(date: string): boolean {
  const weekStart = getWeekStartKST()
  const today = getTodayKST()
  return date >= weekStart && date <= today
}

/** 날짜(YYYY-MM-DD)가 이번 달에 속하는지 확인 */
export function isThisMonthKST(date: string): boolean {
  const monthStart = getMonthStartKST()
  const today = getTodayKST()
  return date >= monthStart && date <= today
}

/** 오늘 포함 최근 7일 날짜 배열을 오래된 순으로 반환 */
export function getRecent7DayDates(): string[] {
  // KST 날짜를 UTC 자정으로 파싱하여 날짜 연산 수행
  const today = new Date(getTodayKST() + 'T00:00:00Z')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setUTCDate(today.getUTCDate() - (6 - i))
    return d.toLocaleDateString('en-CA', { timeZone: 'UTC' })
  })
}

/** YYYY-MM-DD → "4월 12일 일요일" 형식으로 변환 */
export function formatDisplayDate(date: string): string {
  const d = new Date(date + 'T00:00:00')
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  const weekday = weekdays[d.getDay()]
  return `${month}월 ${day}일 ${weekday}`
}

/** 요일 약자 반환 (도트 레이블용) */
export function getDayLabel(date: string): string {
  const d = new Date(date + 'T00:00:00')
  const labels = ['일', '월', '화', '수', '목', '금', '토']
  return labels[d.getDay()]
}

/** 이번 달 날짜 목록 반환 (달력용) */
export function getMonthDates(yearMonth: string): string[] {
  // yearMonth: 'YYYY-MM'
  const [year, month] = yearMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, '0')
    return `${yearMonth}-${day}`
  })
}

/** 달의 첫 날 요일 반환 (0=일, 1=월 ... 6=토) */
export function getFirstDayOfWeek(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month - 1, 1).getDay()
}
