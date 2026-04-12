// src/test/components/TodaySessionList.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TodaySessionList } from '../../components/home/TodaySessionList'
import type { WorkoutRecord } from '../../types'

/** 테스트용 WorkoutRecord 생성 헬퍼 */
function makeSession(id: string, label?: string): WorkoutRecord {
  return {
    id,
    recordedAt: '2026-04-12T10:00:00.000Z',
    recordedDate: '2026-04-12',
    createdAt: '2026-04-12T10:00:00.000Z',
    source: 'today_button',
    label,
  }
}

describe('TodaySessionList', () => {
  it('세션이 없으면 아무것도 렌더링하지 않는다', () => {
    const { container } = render(<TodaySessionList sessions={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('라벨이 있는 세션은 라벨 텍스트를 표시한다', () => {
    render(<TodaySessionList sessions={[makeSession('1', '헬스')]} />)
    expect(screen.getByText('헬스')).toBeInTheDocument()
  })

  it('라벨이 없는 세션은 "운동" 텍스트를 표시한다', () => {
    render(<TodaySessionList sessions={[makeSession('1')]} />)
    expect(screen.getByText('운동')).toBeInTheDocument()
  })

  it('세션이 1개이면 번호 프리픽스 없이 표시한다', () => {
    render(<TodaySessionList sessions={[makeSession('1', '헬스')]} />)
    expect(screen.queryByText(/1\./)).not.toBeInTheDocument()
    expect(screen.getByText('헬스')).toBeInTheDocument()
  })

  it('세션이 2개 이상이면 번호 프리픽스를 표시한다', () => {
    render(<TodaySessionList sessions={[makeSession('1', '헬스'), makeSession('2', '복싱')]} />)
    expect(screen.getByText(/1\. 헬스/)).toBeInTheDocument()
    expect(screen.getByText(/2\. 복싱/)).toBeInTheDocument()
  })
})
