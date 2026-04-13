// src/test/components/WeekDots.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeekDots } from '../../components/home/WeekDots'

describe('WeekDots', () => {
  beforeEach(() => {
    // KST 기준 2026-04-12로 시스템 시간 고정
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('7개의 도트를 렌더링한다', () => {
    const { container } = render(<WeekDots recent7Days={Array(7).fill(false)} />)
    expect(container.querySelectorAll('[data-testid="dot"]')).toHaveLength(7)
  })

  it('"오늘" 레이블이 표시된다', () => {
    render(<WeekDots recent7Days={Array(7).fill(false)} />)
    expect(screen.getByText('오늘')).toBeInTheDocument()
  })
})
