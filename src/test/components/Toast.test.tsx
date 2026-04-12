// src/test/components/Toast.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Toast } from '../../components/shared/Toast'

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('메시지를 표시한다', () => {
    render(<Toast message="테스트 메시지" onClose={vi.fn()} />)
    expect(screen.getByText('테스트 메시지')).toBeInTheDocument()
  })

  it('2500ms 후 onClose가 호출된다', () => {
    const onClose = vi.fn()
    render(<Toast message="테스트" onClose={onClose} />)
    expect(onClose).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2500)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
