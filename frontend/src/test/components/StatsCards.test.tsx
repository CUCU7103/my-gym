// src/test/components/StatsCards.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsCards } from '../../components/home/StatsCards'

describe('StatsCards', () => {
  it('이번 주 횟수와 이번 달 횟수를 표시한다', () => {
    render(<StatsCards weeklyCount={3} monthlyCount={12} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('이번 주')).toBeInTheDocument()
    expect(screen.getByText('이번 달')).toBeInTheDocument()
  })
})
