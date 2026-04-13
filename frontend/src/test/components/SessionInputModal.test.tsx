// src/test/components/SessionInputModal.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SessionInputModal } from '../../components/home/SessionInputModal'

describe('SessionInputModal', () => {
  it('"운동 세션 추가" 타이틀을 표시한다', () => {
    render(<SessionInputModal onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('운동 세션 추가')).toBeInTheDocument()
  })

  it('추가 버튼 클릭 시 입력된 라벨로 onConfirm이 호출된다', () => {
    const onConfirm = vi.fn()
    render(<SessionInputModal onConfirm={onConfirm} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '헬스' } })
    fireEvent.click(screen.getByText('추가'))
    expect(onConfirm).toHaveBeenCalledWith('헬스')
  })

  it('빈 라벨로 추가 버튼 클릭 시 빈 문자열로 onConfirm이 호출된다', () => {
    const onConfirm = vi.fn()
    render(<SessionInputModal onConfirm={onConfirm} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText('추가'))
    expect(onConfirm).toHaveBeenCalledWith('')
  })

  it('취소 버튼 클릭 시 onCancel이 호출된다', () => {
    const onCancel = vi.fn()
    render(<SessionInputModal onConfirm={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('취소'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('Enter 키 입력 시 onConfirm이 호출된다', () => {
    const onConfirm = vi.fn()
    render(<SessionInputModal onConfirm={onConfirm} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '복싱' } })
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    expect(onConfirm).toHaveBeenCalledWith('복싱')
  })
})
