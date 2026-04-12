// src/test/components/WeeklyGoalBar.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeeklyGoalBar } from '../../components/home/WeeklyGoalBar'

describe('WeeklyGoalBar', () => {
  it('weeklyCount / weeklyGoal 텍스트를 표시한다', () => {
    render(<WeeklyGoalBar weeklyCount={2} weeklyGoal={3} />)
    expect(screen.getByText('2 / 3회')).toBeInTheDocument()
  })

  it('목표 달성 시 달성 텍스트를 표시한다', () => {
    render(<WeeklyGoalBar weeklyCount={3} weeklyGoal={3} />)
    expect(screen.getByText(/주간 목표 달성/)).toBeInTheDocument()
  })

  it('weeklyGoal이 0이어도 오류 없이 렌더링된다', () => {
    render(<WeeklyGoalBar weeklyCount={0} weeklyGoal={0} />)
    expect(screen.getByText('0 / 0회')).toBeInTheDocument()
  })
})
