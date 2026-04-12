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
})
