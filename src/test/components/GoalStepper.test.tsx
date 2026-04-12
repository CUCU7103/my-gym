// src/test/components/GoalStepper.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GoalStepper } from '../../components/settings/GoalStepper'

describe('GoalStepper', () => {
  it('현재 값을 표시한다', () => {
    render(<GoalStepper value={3} onChange={vi.fn()} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('+버튼 클릭 시 onChange(4)가 호출된다', () => {
    const onChange = vi.fn()
    render(<GoalStepper value={3} onChange={onChange} />)
    fireEvent.click(screen.getByText('+'))
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('-버튼 클릭 시 onChange(2)가 호출된다', () => {
    const onChange = vi.fn()
    render(<GoalStepper value={3} onChange={onChange} />)
    fireEvent.click(screen.getByText('−'))
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('최솟값(1)에서 - 버튼이 비활성화된다', () => {
    const onChange = vi.fn()
    render(<GoalStepper value={1} onChange={onChange} />)
    fireEvent.click(screen.getByText('−'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('최댓값(7)에서 + 버튼이 비활성화된다', () => {
    const onChange = vi.fn()
    render(<GoalStepper value={7} onChange={onChange} />)
    fireEvent.click(screen.getByText('+'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
