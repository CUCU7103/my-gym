// frontend/src/test/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// API 모듈 전체를 모킹 (실제 서버 불필요)
vi.mock('../api/records', () => ({
  getRecords: vi.fn().mockResolvedValue([]),
  addRecord: vi.fn().mockResolvedValue({
    id: 'test-id',
    recordedAt: new Date().toISOString(),
    recordedDate: '2026-04-13',
    createdAt: new Date().toISOString(),
    source: 'today_button',
  }),
  deleteRecord: vi.fn().mockResolvedValue(undefined),
  deleteAllRecords: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../api/settings', () => ({
  getSettings: vi.fn().mockResolvedValue({ weeklyGoal: 3, timezone: 'Asia/Seoul' }),
  updateSettings: vi.fn().mockResolvedValue({ weeklyGoal: 3, timezone: 'Asia/Seoul' }),
}))
