// src/test/components/RecordList.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
})
