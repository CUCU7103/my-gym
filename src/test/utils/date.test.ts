// src/test/utils/date.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getTodayKST,
  getWeekStartKST,
  getMonthStartKST,
  isThisWeekKST,
  isThisMonthKST,
  formatDisplayDate,
  getRecent7DayDates,
  getDayLabel,
  getMonthDates,
  getFirstDayOfWeek,
} from '../../utils/date'

describe('getTodayKST', () => {
  it('YYYY-MM-DD 형식의 문자열을 반환한다', () => {
    const result = getTodayKST()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('getWeekStartKST', () => {
  it('월요일 기준 이번 주 시작 날짜를 반환한다', () => {
    // 2026-04-12 (일요일) 기준 → 이번 주 월요일은 2026-04-06
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const result = getWeekStartKST()
    expect(result).toBe('2026-04-06')
    vi.useRealTimers()
  })
})

describe('getMonthStartKST', () => {
  it('이번 달 1일을 반환한다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const result = getMonthStartKST()
    expect(result).toBe('2026-04-01')
    vi.useRealTimers()
  })
})

describe('isThisWeekKST', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('이번 주 날짜는 true를 반환한다', () => {
    expect(isThisWeekKST('2026-04-08')).toBe(true)
  })

  it('지난 주 날짜는 false를 반환한다', () => {
    expect(isThisWeekKST('2026-04-05')).toBe(false)
  })
})

describe('isThisMonthKST', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('이번 달 날짜는 true를 반환한다', () => {
    expect(isThisMonthKST('2026-04-01')).toBe(true)
  })

  it('지난 달 날짜는 false를 반환한다', () => {
    expect(isThisMonthKST('2026-03-31')).toBe(false)
  })
})

describe('getRecent7DayDates', () => {
  it('오늘 포함 최근 7일 날짜 배열을 오래된 순으로 반환한다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const result = getRecent7DayDates()
    expect(result).toHaveLength(7)
    expect(result[0]).toBe('2026-04-06')
    expect(result[6]).toBe('2026-04-12')
    vi.useRealTimers()
  })
})

describe('formatDisplayDate', () => {
  it('YYYY-MM-DD를 "4월 12일 일요일" 형식으로 변환한다', () => {
    const result = formatDisplayDate('2026-04-12')
    expect(result).toBe('4월 12일 일요일')
  })
})

describe('getDayLabel', () => {
  it('2026-04-12 (일요일)에 대해 "일"을 반환한다', () => {
    const result = getDayLabel('2026-04-12')
    expect(result).toBe('일')
  })

  it('2026-04-13 (월요일)에 대해 "월"을 반환한다', () => {
    const result = getDayLabel('2026-04-13')
    expect(result).toBe('월')
  })
})

describe('getMonthDates', () => {
  it('2026-04 기준으로 길이 30인 배열을 반환한다', () => {
    const result = getMonthDates('2026-04')
    expect(result).toHaveLength(30)
  })

  it('첫 원소는 2026-04-01, 마지막 원소는 2026-04-30이다', () => {
    const result = getMonthDates('2026-04')
    expect(result[0]).toBe('2026-04-01')
    expect(result[29]).toBe('2026-04-30')
  })
})

describe('getFirstDayOfWeek', () => {
  it('2026-04의 첫 날(수요일)에 대해 3을 반환한다', () => {
    const result = getFirstDayOfWeek('2026-04')
    expect(result).toBe(3)
  })
})
