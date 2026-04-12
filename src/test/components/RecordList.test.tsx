// src/test/components/RecordList.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecordList } from '../../components/records/RecordList'
import type { WorkoutRecord } from '../../types'

const mockRecords: WorkoutRecord[] = [
  { id: '1', recordedAt: '2026-04-12T10:00:00Z', recordedDate: '2026-04-12', createdAt: '2026-04-12T10:00:00Z', source: 'today_button' },
  { id: '2', recordedAt: '2026-04-10T10:00:00Z', recordedDate: '2026-04-10', createdAt: '2026-04-10T10:00:00Z', source: 'manual' },
]

describe('RecordList', () => {
  it('기록이 없으면 빈 상태 메시지를 표시한다', () => {
    render(<RecordList records={[]} onDelete={vi.fn()} />)
    expect(screen.getByText(/기록이 없어요/)).toBeInTheDocument()
  })

  it('기록 목록의 삭제 버튼을 렌더링한다', () => {
    render(<RecordList records={mockRecords} onDelete={vi.fn()} />)
    expect(screen.getAllByText('삭제')).toHaveLength(2)
  })

  it('수동 추가 기록에 "수동" 배지를 표시한다', () => {
    render(<RecordList records={mockRecords} onDelete={vi.fn()} />)
    expect(screen.getByText('수동')).toBeInTheDocument()
  })

  it('삭제 버튼 클릭 시 확인 모달이 표시된다', async () => {
    const user = userEvent.setup()
    render(<RecordList records={mockRecords} onDelete={vi.fn()} />)

    const deleteButtons = screen.getAllByText('삭제')
    await user.click(deleteButtons[0])

    // 모달 메시지와 확인/취소 버튼이 나타나야 한다
    expect(screen.getByText(/기록을 삭제할까요\?/)).toBeInTheDocument()
    // 모달의 확인 버튼(삭제)과 취소 버튼이 있어야 한다
    expect(screen.getByText('취소')).toBeInTheDocument()
  })

  it('모달에서 취소 클릭 시 onDelete가 호출되지 않는다', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<RecordList records={mockRecords} onDelete={onDelete} />)

    const deleteButtons = screen.getAllByText('삭제')
    await user.click(deleteButtons[0])

    // 모달이 표시된 후 취소 클릭
    await user.click(screen.getByText('취소'))

    expect(onDelete).not.toHaveBeenCalled()
  })

  it('모달에서 삭제 확인 클릭 시 onDelete가 올바른 id로 호출된다', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<RecordList records={mockRecords} onDelete={onDelete} />)

    // 첫 번째 기록(id='1')의 삭제 버튼 클릭 → 모달 표시
    const deleteButtons = screen.getAllByText('삭제')
    await user.click(deleteButtons[0])

    // 모달이 열리면 '취소' 버튼이 생긴다. 취소 버튼의 다음 형제(nextSibling)가 모달 확인 버튼
    const cancelButton = screen.getByText('취소')
    const confirmButton = cancelButton.parentElement!.querySelector('button:last-child') as HTMLElement
    await user.click(confirmButton)

    expect(onDelete).toHaveBeenCalledWith('1')
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
