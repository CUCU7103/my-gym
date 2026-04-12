// src/test/components/MiniCalendar.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MiniCalendar } from '../../components/home/MiniCalendar'

describe('MiniCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('현재 월을 표시한다', () => {
    render(
      <MiniCalendar
        yearMonth="2026-04"
        recordedDates={new Set()}
        onDateSelect={vi.fn()}
      />
    )
    expect(screen.getByText('04월')).toBeInTheDocument()
  })

  it('과거 날짜 클릭 시 onDateSelect가 호출된다', () => {
    const onDateSelect = vi.fn()
    render(
      <MiniCalendar
        yearMonth="2026-04"
        recordedDates={new Set()}
        onDateSelect={onDateSelect}
      />
    )
    // 4월 10일 (과거) 클릭
    fireEvent.click(screen.getByText('10'))
    expect(onDateSelect).toHaveBeenCalledWith('2026-04-10')
  })

  it('미래 날짜 클릭 시 onDateSelect가 호출되지 않는다', () => {
    const onDateSelect = vi.fn()
    render(
      <MiniCalendar
        yearMonth="2026-04"
        recordedDates={new Set()}
        onDateSelect={onDateSelect}
      />
    )
    // 4월 15일 (미래) 클릭
    fireEvent.click(screen.getByText('15'))
    expect(onDateSelect).not.toHaveBeenCalled()
  })
})
