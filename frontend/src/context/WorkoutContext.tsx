// frontend/src/context/WorkoutContext.tsx
import { createContext, useContext, type ReactNode } from 'react'
import { useWorkoutRecords } from '../hooks/useWorkoutRecords'
import { useSettingsContext } from './SettingsContext'
import type { WorkoutRecord, WorkoutStats } from '../types'

type WorkoutContextValue = {
  records: WorkoutRecord[]
  stats: WorkoutStats
  recordToday: (label?: string) => Promise<'recorded' | 'duplicate'>
  cancelToday: () => Promise<'cancelled' | 'not_found'>
  addManual: (date: string, label?: string) => Promise<'recorded' | 'future' | 'duplicate'>
  deleteRecord: (id: string) => Promise<void>
  deleteAllRecords: () => Promise<void>
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null)

export function WorkoutProvider({ children }: { children: ReactNode }) {
  // weeklyGoal을 SettingsContext에서 직접 읽어 useWorkoutRecords에 전달
  const { settings } = useSettingsContext()
  const workoutData = useWorkoutRecords(settings.weeklyGoal)

  return (
    <WorkoutContext.Provider value={workoutData}>
      {children}
    </WorkoutContext.Provider>
  )
}

/** WorkoutContext를 사용하는 커스텀 훅 */
export function useWorkoutContext() {
  const ctx = useContext(WorkoutContext)
  if (!ctx) throw new Error('useWorkoutContext must be used within WorkoutProvider')
  return ctx
}
