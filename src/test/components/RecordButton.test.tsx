// src/test/components/RecordButton.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RecordButton } from '../../components/home/RecordButton'

describe('RecordButton', () => {
  it('기록 전 상태에서 "오늘 운동 기록" 텍스트를 표시한다', () => {
    render(<RecordButton isTodayRecorded={false} onRecord={vi.fn()} />)
    expect(screen.getByText('오늘 운동 기록')).toBeInTheDocument()
  })

  it('기록 완료 상태에서 "오늘 운동 완료" 텍스트를 표시한다', () => {
    render(<RecordButton isTodayRecorded={true} onRecord={vi.fn()} />)
    expect(screen.getByText(/오늘 운동 완료/)).toBeInTheDocument()
  })

  it('기록 완료 상태에서 "오늘도 해냈어요" 보조 텍스트가 표시된다', () => {
    render(<RecordButton isTodayRecorded={true} onRecord={vi.fn()} />)
    expect(screen.getByText(/오늘도 해냈어요/)).toBeInTheDocument()
  })

  it('버튼 클릭 시 onRecord 콜백이 호출된다', () => {
    const onRecord = vi.fn()
    render(<RecordButton isTodayRecorded={false} onRecord={onRecord} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onRecord).toHaveBeenCalledTimes(1)
  })
})
