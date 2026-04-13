# 멀티 세션 운동 기록 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 하루에 여러 운동 세션(헬스, 복싱 등)을 각각 라벨과 함께 기록할 수 있도록 지원한다.

**Architecture:** `WorkoutRecord`에 선택적 `label` 필드를 추가하고, 날짜 중복 체크를 제거해 같은 날 여러 세션 추가를 허용한다. 주간/월간 카운트는 세션 수 기준으로 유지(현행 동일). 홈 화면에 세션 추가 바텀시트와 오늘 세션 라벨 목록 UI를 추가하고, 완료 버튼 재클릭은 "오늘 전체 기록 취소" 확인 모달로 유지한다.

**Tech Stack:** React, TypeScript, Dexie (IndexedDB), Vitest + Testing Library

---

## 변경 파일 맵

| 파일 | 변경 내용 |
|------|-----------|
| `src/types/index.ts` | `WorkoutRecord`에 `label?: string` 추가 |
| `src/db/database.ts` | DB 버전 2 마이그레이션 (`label` 인덱스 없음, 스키마 변경 없음) |
| `src/hooks/useWorkoutRecords.ts` | `recordToday` 중복 체크 제거 → 라벨 파라미터 추가. `cancelToday` 전체 삭제로 변경. `addManual` 중복 체크 제거 → 라벨 파라미터 추가. `todaySessionCount` 통계 추가 |
| `src/types/index.ts` | `WorkoutStats`에 `todaySessionCount: number` 추가 |
| `src/components/home/SessionInputModal.tsx` | **신규** — 라벨 입력 바텀시트 모달 |
| `src/components/home/TodaySessionList.tsx` | **신규** — 오늘 기록한 세션 라벨 목록 |
| `src/components/home/RecordButton.tsx` | props 변경: `sessionCount` 추가, 버튼 텍스트 업데이트 |
| `src/components/home/TodayHeader.tsx` | props 변경: `sessionCount` 추가, 헤더 텍스트 업데이트 |
| `src/components/home/HomePage.tsx` | 세션 추가 버튼, `SessionInputModal`, `TodaySessionList` 연동 |
| `src/test/hooks/useWorkoutRecords.test.ts` | 기존 중복 테스트 수정 + 멀티 세션 테스트 추가 |
| `src/test/components/RecordButton.test.tsx` | sessionCount prop 테스트 추가 |

---

## Task 1: 타입 및 DB 스키마 업데이트

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/db/database.ts`

- [ ] **Step 1: `WorkoutRecord`에 `label` 필드, `WorkoutStats`에 `todaySessionCount` 추가**

`src/types/index.ts`를 다음과 같이 수정:

```typescript
// src/types/index.ts

export type WorkoutRecord = {
  id: string            // crypto.randomUUID()
  recordedAt: string    // ISO datetime (기록 생성 시각)
  recordedDate: string  // YYYY-MM-DD (Asia/Seoul 기준, 통계 계산 기준)
  createdAt: string     // ISO datetime
  source: 'today_button' | 'manual'
  label?: string        // 운동 종류 (예: '헬스', '복싱') — 선택 입력
}

export type UserSettings = {
  weeklyGoal: number    // 1~7, 기본값 3
  timezone: 'Asia/Seoul'
}

export type ActiveTab = 'home' | 'records' | 'settings'

// 파생 통계 타입
export type WorkoutStats = {
  weeklyCount: number        // 이번 주 세션 수
  monthlyCount: number       // 이번 달 세션 수
  totalCount: number         // 전체 세션 수
  recent7Days: boolean[]     // 오늘 포함 최근 7일 (index 0 = 6일 전, index 6 = 오늘)
  weeklyGoalProgress: number // weeklyCount / weeklyGoal (0~1+)
  isTodayRecorded: boolean   // 오늘 1건 이상 기록 여부
  todaySessionCount: number  // 오늘 기록한 세션 수
}
```

- [ ] **Step 2: DB 버전 2 마이그레이션 추가**

`label` 필드는 기존 레코드에서 `undefined`로 유지되므로 스키마 자체는 변경하지 않고, 버전만 올려 마이그레이션을 명시적으로 기록한다.

`src/db/database.ts`를 다음과 같이 수정:

```typescript
// src/db/database.ts
import Dexie, { type Table } from 'dexie'
import type { WorkoutRecord, UserSettings } from '../types'

class GymDatabase extends Dexie {
  workoutRecords!: Table<WorkoutRecord>
  userSettings!: Table<UserSettings & { id: number }>

  constructor() {
    super('my-gym-db')
    this.version(1).stores({
      workoutRecords: 'id, recordedDate, recordedAt',
      userSettings: 'id',
    })
    // v2: WorkoutRecord에 label 필드 추가 (선택 입력, 기존 데이터 영향 없음)
    this.version(2).stores({
      workoutRecords: 'id, recordedDate, recordedAt',
      userSettings: 'id',
    })
  }
}

export const db = new GymDatabase()

/** 기본 설정 반환 또는 생성 */
export async function getOrCreateSettings(): Promise<UserSettings> {
  const existing = await db.userSettings.get(1)
  if (existing) {
    const { id: _id, ...settings } = existing
    return settings as UserSettings
  }
  const defaults: UserSettings = { weeklyGoal: 3, timezone: 'Asia/Seoul' }
  await db.userSettings.put({ id: 1, ...defaults })
  return defaults
}
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음 (기존 코드는 `label`을 참조하지 않으므로)

- [ ] **Step 4: 커밋**

```bash
git add src/types/index.ts src/db/database.ts
git commit -m "feat: WorkoutRecord에 label 필드 추가, DB v2 마이그레이션"
```

---

## Task 2: `useWorkoutRecords` 훅 멀티 세션 지원

**Files:**
- Modify: `src/hooks/useWorkoutRecords.ts`
- Modify: `src/test/hooks/useWorkoutRecords.test.ts`

### 변경 사항 요약
- `calcStats`: `todaySessionCount` 계산 추가
- `recordToday(label?)`: 중복 체크 제거, 라벨 파라미터 추가, 반환값 단순화
- `cancelToday`: 오늘 날짜 기록 **전체** 삭제로 변경
- `addManual(date, label?)`: 중복 체크 제거, 라벨 파라미터 추가

- [ ] **Step 1: 실패하는 테스트 작성**

`src/test/hooks/useWorkoutRecords.test.ts` 전체를 다음으로 교체:

```typescript
// src/test/hooks/useWorkoutRecords.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkoutRecords } from '../../hooks/useWorkoutRecords'

// Dexie를 메모리 기반으로 mock
vi.mock('../../db/database', () => {
  const records: any[] = []
  return {
    db: {
      workoutRecords: {
        toArray: async () => [...records],
        add: async (r: any) => { records.push(r); return r.id },
        delete: async (id: string) => {
          const idx = records.findIndex(r => r.id === id)
          if (idx !== -1) records.splice(idx, 1)
        },
        clear: async () => { records.splice(0, records.length) },
        where: (field: string) => ({
          equals: (val: string) => ({
            first: async () => records.find((r: any) => r[field] === val),
            // 오늘 전체 삭제에 사용
            toArray: async () => records.filter((r: any) => r[field] === val),
            delete: async () => {
              const toDelete = records.filter((r: any) => r[field] === val)
              toDelete.forEach(item => {
                const idx = records.findIndex(r => r.id === item.id)
                if (idx !== -1) records.splice(idx, 1)
              })
            },
          }),
        }),
      },
    },
    getOrCreateSettings: async () => ({ weeklyGoal: 3, timezone: 'Asia/Seoul' }),
  }
})

describe('useWorkoutRecords', () => {
  beforeEach(async () => {
    const { db } = await import('../../db/database')
    await db.workoutRecords.clear()
  })

  it('초기 상태에서 isTodayRecorded는 false이다', async () => {
    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})
    expect(result.current.stats.isTodayRecorded).toBe(false)
  })

  it('recordToday 호출 시 isTodayRecorded가 true가 된다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})
    await act(async () => { await result.current.recordToday() })
    expect(result.current.stats.isTodayRecorded).toBe(true)
    vi.useRealTimers()
  })

  it('같은 날 recordToday를 2번 호출하면 2개의 세션이 기록된다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})
    await act(async () => { await result.current.recordToday('헬스') })
    await act(async () => { await result.current.recordToday('복싱') })
    expect(result.current.stats.todaySessionCount).toBe(2)
    expect(result.current.stats.weeklyCount).toBe(2)
    vi.useRealTimers()
  })

  it('recordToday 라벨이 기록에 저장된다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})
    await act(async () => { await result.current.recordToday('헬스') })
    expect(result.current.records[0].label).toBe('헬스')
    vi.useRealTimers()
  })

  it('cancelToday 호출 시 오늘 기록이 모두 삭제된다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})
    await act(async () => { await result.current.recordToday('헬스') })
    await act(async () => { await result.current.recordToday('복싱') })
    expect(result.current.stats.todaySessionCount).toBe(2)
    await act(async () => { await result.current.cancelToday() })
    expect(result.current.stats.isTodayRecorded).toBe(false)
    expect(result.current.stats.todaySessionCount).toBe(0)
    vi.useRealTimers()
  })

  it('deleteRecord 호출 시 해당 기록만 삭제된다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})
    await act(async () => { await result.current.recordToday('헬스') })
    await act(async () => { await result.current.recordToday('복싱') })
    const firstId = result.current.records.find(r => r.label === '헬스')!.id
    await act(async () => { await result.current.deleteRecord(firstId) })
    expect(result.current.stats.todaySessionCount).toBe(1)
    expect(result.current.records[0].label).toBe('복싱')
    vi.useRealTimers()
  })

  it('addManual - 같은 날 여러 세션 추가 가능하다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})
    await act(async () => { await result.current.addManual('2026-04-10', '헬스') })
    await act(async () => { await result.current.addManual('2026-04-10', '복싱') })
    expect(result.current.stats.totalCount).toBe(2)
    vi.useRealTimers()
  })

  it('addManual - 미래 날짜는 future를 반환한다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})
    let returnVal = ''
    await act(async () => { returnVal = await result.current.addManual('2026-04-13') })
    expect(returnVal).toBe('future')
    vi.useRealTimers()
  })

  it('deleteAllRecords 호출 시 모든 기록이 삭제된다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})
    await act(async () => { await result.current.recordToday() })
    await act(async () => { await result.current.deleteAllRecords() })
    expect(result.current.stats.totalCount).toBe(0)
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/test/hooks/useWorkoutRecords.test.ts
```

Expected: 새로 추가한 멀티 세션 테스트 FAIL

- [ ] **Step 3: 훅 구현 업데이트**

`src/hooks/useWorkoutRecords.ts` 전체를 다음으로 교체:

```typescript
// src/hooks/useWorkoutRecords.ts
import { useState, useEffect, useCallback } from 'react'
import { db } from '../db/database'
import type { WorkoutRecord, WorkoutStats } from '../types'
import {
  getTodayKST,
  isThisWeekKST,
  isThisMonthKST,
  getRecent7DayDates,
} from '../utils/date'

/** 기록 배열과 주간 목표를 받아 통계를 계산 */
function calcStats(records: WorkoutRecord[], weeklyGoal: number): WorkoutStats {
  const today = getTodayKST()
  const recent7 = getRecent7DayDates()
  // 날짜별 기록 여부를 위한 Set (recent7Days용)
  const dateSet = new Set(records.map(r => r.recordedDate))

  // 이번 주 세션 수 (날짜 중복 허용, 세션 기준)
  const weeklyCount = records.filter(r => isThisWeekKST(r.recordedDate)).length
  // 이번 달 세션 수
  const monthlyCount = records.filter(r => isThisMonthKST(r.recordedDate)).length
  // 오늘 세션 수
  const todaySessionCount = records.filter(r => r.recordedDate === today).length

  return {
    weeklyCount,
    monthlyCount,
    totalCount: records.length,
    // 최근 7일 각 날짜에 기록이 1건 이상 있는지 boolean 배열로 반환
    recent7Days: recent7.map(d => dateSet.has(d)),
    // 주간 목표 달성률 (0 나눗셈 방지)
    weeklyGoalProgress: weeklyGoal > 0 ? weeklyCount / weeklyGoal : 0,
    // 오늘 1건 이상 기록 여부
    isTodayRecorded: todaySessionCount > 0,
    todaySessionCount,
  }
}

/** 운동 기록 CRUD 훅 - IndexedDB 데이터를 읽고 쓰는 기능 제공 */
export function useWorkoutRecords(weeklyGoal: number) {
  const [records, setRecords] = useState<WorkoutRecord[]>([])
  const [stats, setStats] = useState<WorkoutStats>({
    weeklyCount: 0,
    monthlyCount: 0,
    totalCount: 0,
    recent7Days: Array(7).fill(false),
    weeklyGoalProgress: 0,
    isTodayRecorded: false,
    todaySessionCount: 0,
  })

  /** DB에서 전체 기록을 불러와 상태 갱신 */
  const refresh = useCallback(async () => {
    const all = await db.workoutRecords.toArray()
    // 최신 날짜 → 최신 시각 순으로 정렬
    all.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    setRecords(all)
    setStats(calcStats(all, weeklyGoal))
  }, [weeklyGoal])

  useEffect(() => { refresh() }, [refresh])

  /**
   * 오늘 날짜로 운동 세션 추가 (같은 날 여러 번 호출 가능)
   * @param label - 운동 종류 (선택, 예: '헬스', '복싱')
   */
  const recordToday = useCallback(async (label?: string): Promise<'recorded'> => {
    const today = getTodayKST()
    const record: WorkoutRecord = {
      id: crypto.randomUUID(),
      recordedAt: new Date().toISOString(),
      recordedDate: today,
      createdAt: new Date().toISOString(),
      source: 'today_button',
      label: label?.trim() || undefined,
    }
    await db.workoutRecords.add(record)
    await refresh()
    return 'recorded'
  }, [refresh])

  /**
   * 오늘 날짜 운동 기록 전체 취소
   * @returns 'cancelled' - 성공, 'not_found' - 오늘 기록 없음
   */
  const cancelToday = useCallback(async (): Promise<'cancelled' | 'not_found'> => {
    const today = getTodayKST()
    // 오늘 날짜의 모든 기록을 한 번에 삭제
    const todayRecords = await db.workoutRecords.where('recordedDate').equals(today).toArray()
    if (todayRecords.length === 0) return 'not_found'

    await Promise.all(todayRecords.map(r => db.workoutRecords.delete(r.id!)))
    await refresh()
    return 'cancelled'
  }, [refresh])

  /**
   * 특정 날짜로 운동 세션 수동 추가 (같은 날 여러 번 호출 가능)
   * @param date - YYYY-MM-DD 형식
   * @param label - 운동 종류 (선택)
   * @returns 'recorded' - 성공, 'future' - 미래 날짜
   */
  const addManual = useCallback(async (date: string, label?: string): Promise<'recorded' | 'future'> => {
    const today = getTodayKST()
    if (date > today) return 'future'

    const record: WorkoutRecord = {
      id: crypto.randomUUID(),
      recordedAt: new Date().toISOString(),
      recordedDate: date,
      createdAt: new Date().toISOString(),
      source: 'manual',
      label: label?.trim() || undefined,
    }
    await db.workoutRecords.add(record)
    await refresh()
    return 'recorded'
  }, [refresh])

  /** ID로 특정 운동 기록 삭제 */
  const deleteRecord = useCallback(async (id: string) => {
    await db.workoutRecords.delete(id)
    await refresh()
  }, [refresh])

  /** 모든 운동 기록 삭제 (데이터 초기화) */
  const deleteAllRecords = useCallback(async () => {
    await db.workoutRecords.clear()
    await refresh()
  }, [refresh])

  return { records, stats, recordToday, cancelToday, addManual, deleteRecord, deleteAllRecords }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/test/hooks/useWorkoutRecords.test.ts
```

Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useWorkoutRecords.ts src/test/hooks/useWorkoutRecords.test.ts
git commit -m "feat: useWorkoutRecords 멀티 세션 지원 (중복 체크 제거, cancelToday 전체 삭제)"
```

---

## Task 3: `SessionInputModal` 컴포넌트 신규 생성

세션 추가 버튼 클릭 시 열리는 바텀시트형 모달. 라벨 텍스트를 입력받아 확인 시 콜백 호출.

**Files:**
- Create: `src/components/home/SessionInputModal.tsx`

- [ ] **Step 1: 컴포넌트 생성**

```typescript
// src/components/home/SessionInputModal.tsx
import { useState, useRef, useEffect } from 'react'

type SessionInputModalProps = {
  onConfirm: (label: string) => void
  onCancel: () => void
}

/**
 * 운동 세션 추가 바텀시트 모달
 * - 라벨(운동 종류)을 텍스트로 입력받는다
 * - 빈 입력으로 확인 시 라벨 없이 세션 추가
 */
export function SessionInputModal({ onConfirm, onCancel }: SessionInputModalProps) {
  const [label, setLabel] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 모달이 열릴 때 자동으로 입력창에 포커스
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleConfirm = () => {
    onConfirm(label.trim())
  }

  // Enter 키로 확인, Escape 키로 취소
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') onCancel()
  }

  return (
    // 전체 화면을 덮는 반투명 오버레이
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      {/* 바텀시트 카드 */}
      <div style={{
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        borderRadius: '20px 20px 0 0', padding: '24px 20px 40px',
        width: '100%', maxWidth: '480px',
      }}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>
          운동 세션 추가
        </p>
        {/* 운동 종류 입력 */}
        <input
          ref={inputRef}
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="운동 종류 입력 (예: 헬스, 복싱) — 선택사항"
          maxLength={30}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: '12px',
            border: '1px solid var(--border)', background: 'var(--surface-deep)',
            color: 'var(--text)', fontSize: '14px', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {/* 확인 / 취소 버튼 */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px', borderRadius: '12px',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px',
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, var(--blue-dark), var(--blue))',
              color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
            }}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/home/SessionInputModal.tsx
git commit -m "feat: SessionInputModal 바텀시트 컴포넌트 추가"
```

---

## Task 4: `TodaySessionList` 컴포넌트 신규 생성

오늘 기록한 세션들을 홈 화면에 표시하는 컴포넌트.

**Files:**
- Create: `src/components/home/TodaySessionList.tsx`

- [ ] **Step 1: 컴포넌트 생성**

```typescript
// src/components/home/TodaySessionList.tsx
import type { WorkoutRecord } from '../../types'

type TodaySessionListProps = {
  sessions: WorkoutRecord[]
}

/**
 * 오늘 기록한 운동 세션 목록
 * - 세션이 없으면 렌더링하지 않음
 * - 라벨이 있는 세션은 이름 표시, 없으면 "운동"으로 표시
 */
export function TodaySessionList({ sessions }: TodaySessionListProps) {
  if (sessions.length === 0) return null

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '6px',
      justifyContent: 'center',
    }}>
      {sessions.map((session, index) => (
        <span
          key={session.id}
          style={{
            fontSize: '11px',
            padding: '3px 10px',
            borderRadius: '20px',
            background: 'var(--blue-tint)',
            border: '1px solid rgba(59,130,246,0.3)',
            color: 'var(--blue)',
          }}
        >
          {/* 여러 세션이면 번호 표시 */}
          {sessions.length > 1 ? `${index + 1}. ` : ''}
          {session.label || '운동'}
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/home/TodaySessionList.tsx
git commit -m "feat: TodaySessionList 오늘 세션 목록 컴포넌트 추가"
```

---

## Task 5: `RecordButton` 및 `TodayHeader` props 업데이트

**Files:**
- Modify: `src/components/home/RecordButton.tsx`
- Modify: `src/components/home/TodayHeader.tsx`
- Modify: `src/test/components/RecordButton.test.tsx`

- [ ] **Step 1: RecordButton 테스트 업데이트**

`src/test/components/RecordButton.test.tsx` 전체를 다음으로 교체:

```typescript
// src/test/components/RecordButton.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RecordButton } from '../../components/home/RecordButton'

describe('RecordButton', () => {
  it('기록 전 상태에서 "오늘 운동 기록" 텍스트를 표시한다', () => {
    render(<RecordButton isTodayRecorded={false} sessionCount={0} onRecord={vi.fn()} />)
    expect(screen.getByText('오늘 운동 기록')).toBeInTheDocument()
  })

  it('1세션 완료 시 "오늘 운동 완료 (1)" 텍스트를 표시한다', () => {
    render(<RecordButton isTodayRecorded={true} sessionCount={1} onRecord={vi.fn()} />)
    expect(screen.getByText(/오늘 운동 완료/)).toBeInTheDocument()
    expect(screen.getByText(/1/)).toBeInTheDocument()
  })

  it('2세션 완료 시 세션 수 2를 표시한다', () => {
    render(<RecordButton isTodayRecorded={true} sessionCount={2} onRecord={vi.fn()} />)
    expect(screen.getByText(/2/)).toBeInTheDocument()
  })

  it('기록 완료 상태에서 "오늘도 해냈어요" 보조 텍스트가 표시된다', () => {
    render(<RecordButton isTodayRecorded={true} sessionCount={1} onRecord={vi.fn()} />)
    expect(screen.getByText(/오늘도 해냈어요/)).toBeInTheDocument()
  })

  it('버튼 클릭 시 onRecord 콜백이 호출된다', () => {
    const onRecord = vi.fn()
    render(<RecordButton isTodayRecorded={false} sessionCount={0} onRecord={onRecord} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onRecord).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: RecordButton 컴포넌트 업데이트**

`src/components/home/RecordButton.tsx` 전체를 다음으로 교체:

```typescript
// src/components/home/RecordButton.tsx
type RecordButtonProps = {
  isTodayRecorded: boolean
  sessionCount: number        // 오늘 기록한 세션 수
  onRecord: () => void
}

/** 오늘 운동 기록 버튼 — 완료 여부 및 세션 수에 따라 스타일과 텍스트가 변경됨 */
export function RecordButton({ isTodayRecorded, sessionCount, onRecord }: RecordButtonProps) {
  return (
    <div>
      <button
        onClick={onRecord}
        style={{
          width: '100%',
          padding: '20px',
          borderRadius: '20px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '15px',
          fontWeight: 700,
          color: '#fff',
          background: 'linear-gradient(135deg, var(--blue-dark), var(--blue))',
          // 완료 시 글로우 효과를 더 강하게 표시
          boxShadow: isTodayRecorded
            ? '0 0 50px rgba(59,130,246,0.7), 0 8px 20px rgba(0,0,0,0.4)'
            : '0 0 30px rgba(59,130,246,0.4), 0 8px 20px rgba(0,0,0,0.4)',
          transition: 'box-shadow 0.3s ease',
        }}
      >
        {isTodayRecorded ? `✓ 오늘 운동 완료 (${sessionCount})` : '오늘 운동 기록'}
      </button>
      {/* 완료 시에만 보조 텍스트 표시 */}
      {isTodayRecorded && (
        <p style={{
          textAlign: 'center',
          marginTop: '8px',
          fontSize: '11px',
          color: 'var(--blue-light)',
        }}>
          ✦ 오늘도 해냈어요
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: TodayHeader 컴포넌트 업데이트**

`src/components/home/TodayHeader.tsx` 전체를 다음으로 교체:

```typescript
// src/components/home/TodayHeader.tsx
import { formatDisplayDate, getTodayKST } from '../../utils/date'

type TodayHeaderProps = {
  isTodayRecorded: boolean
  sessionCount: number    // 오늘 세션 수
}

/** 오늘 날짜와 운동 완료 여부를 표시하는 헤더 컴포넌트 */
export function TodayHeader({ isTodayRecorded, sessionCount }: TodayHeaderProps) {
  const today = getTodayKST()

  const statusText = () => {
    if (!isTodayRecorded) return '아직 기록 안 했어요'
    if (sessionCount === 1) return '✓ 오늘 운동 완료!'
    return `✓ 오늘 운동 완료! (${sessionCount}회)`
  }

  return (
    <div style={{ textAlign: 'center' }}>
      {/* 오늘 날짜 표시 (예: 4월 12일 일요일) */}
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
        {formatDisplayDate(today)}
      </p>
      {/* 운동 완료 여부에 따라 배지 스타일 분기 */}
      <span style={{
        display: 'inline-block',
        padding: '4px 14px',
        borderRadius: '20px',
        fontSize: '11px',
        background: isTodayRecorded ? 'var(--blue-tint)' : 'var(--surface)',
        border: `1px solid ${isTodayRecorded ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
        color: isTodayRecorded ? 'var(--blue)' : 'var(--text-secondary)',
      }}>
        {statusText()}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 실행**

```bash
npx vitest run src/test/components/RecordButton.test.tsx
```

Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/home/RecordButton.tsx src/components/home/TodayHeader.tsx src/test/components/RecordButton.test.tsx
git commit -m "feat: RecordButton/TodayHeader sessionCount prop 추가"
```

---

## Task 6: `HomePage` 전체 연동

**Files:**
- Modify: `src/components/home/HomePage.tsx`

- [ ] **Step 1: HomePage 업데이트**

`src/components/home/HomePage.tsx` 전체를 다음으로 교체:

```typescript
// src/components/home/HomePage.tsx
import { useState, useCallback, useMemo } from 'react'
import { useAppContext } from '../../context/AppContext'
import { getTodayKST } from '../../utils/date'
import { TodayHeader } from './TodayHeader'
import { RecordButton } from './RecordButton'
import { WeekDots } from './WeekDots'
import { StatsCards } from './StatsCards'
import { WeeklyGoalBar } from './WeeklyGoalBar'
import { MiniCalendar } from './MiniCalendar'
import { Toast } from '../shared/Toast'
import { ConfirmModal } from '../shared/ConfirmModal'
import { SessionInputModal } from './SessionInputModal'
import { TodaySessionList } from './TodaySessionList'

/** 홈 화면 - 오늘의 운동 기록 버튼, 주간 도트, 통계 카드, 목표 바, 미니 캘린더로 구성 */
export function HomePage() {
  const { stats, settings, records, recordToday, cancelToday, addManual } = useAppContext()
  // 토스트 메시지 상태 (null이면 미표시)
  const [toast, setToast] = useState<string | null>(null)
  // 운동 취소 확인 모달 표시 여부
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  // 세션 추가 입력 모달 표시 여부
  const [showSessionInput, setShowSessionInput] = useState(false)

  /**
   * 완료 버튼 클릭 핸들러
   * - 미기록 → 세션 입력 모달 표시
   * - 완료 상태 → 전체 취소 확인 모달 표시
   */
  const handleRecord = useCallback(() => {
    if (stats.isTodayRecorded) {
      setShowCancelConfirm(true)
    } else {
      setShowSessionInput(true)
    }
  }, [stats.isTodayRecorded])

  /** 세션 추가 버튼 핸들러 — 항상 세션 입력 모달 표시 */
  const handleAddSession = useCallback(() => {
    setShowSessionInput(true)
  }, [])

  /** 세션 입력 확인 핸들러 */
  const handleSessionConfirm = useCallback(async (label: string) => {
    setShowSessionInput(false)
    await recordToday(label || undefined)
  }, [recordToday])

  /** 운동 취소 확인 핸들러 — 오늘 전체 기록 삭제 */
  const handleCancelConfirm = useCallback(async () => {
    setShowCancelConfirm(false)
    await cancelToday()
    setToast('오늘 운동 기록을 취소했어요')
  }, [cancelToday])

  /** 달력 날짜 선택 핸들러 - 과거 날짜 수동 기록 */
  const handleDateSelect = useCallback(async (date: string) => {
    const today = getTodayKST()
    if (date < today) {
      const result = await addManual(date)
      if (result === 'recorded') setToast(`${date} 기록을 추가했어요`)
    }
  }, [addManual])

  // 기록된 날짜 Set (미니 캘린더에서 O(1) 조회)
  const recordedDateSet = useMemo(
    () => new Set(records.map(r => r.recordedDate)),
    [records]
  )
  // 오늘 세션 목록
  const todaySessions = useMemo(
    () => records.filter(r => r.recordedDate === getTodayKST()),
    [records]
  )
  const currentYearMonth = getTodayKST().slice(0, 7)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px' }}>
      {/* 오늘 날짜 및 완료 상태 헤더 */}
      <TodayHeader
        isTodayRecorded={stats.isTodayRecorded}
        sessionCount={stats.todaySessionCount}
      />
      {/* 오늘 운동 기록 버튼 */}
      <RecordButton
        isTodayRecorded={stats.isTodayRecorded}
        sessionCount={stats.todaySessionCount}
        onRecord={handleRecord}
      />
      {/* 오늘 세션 라벨 목록 */}
      <TodaySessionList sessions={todaySessions} />
      {/* 완료 상태일 때 세션 추가 버튼 표시 */}
      {stats.isTodayRecorded && (
        <button
          type="button"
          onClick={handleAddSession}
          style={{
            width: '100%', padding: '14px', borderRadius: '16px',
            border: '1px dashed rgba(59,130,246,0.4)',
            background: 'transparent', color: 'var(--blue)',
            cursor: 'pointer', fontSize: '13px', fontWeight: 600,
          }}
        >
          + 운동 세션 추가
        </button>
      )}
      {/* 최근 7일 도트 */}
      <WeekDots recent7Days={stats.recent7Days} />
      {/* 이번 주/달 통계 카드 */}
      <StatsCards weeklyCount={stats.weeklyCount} monthlyCount={stats.monthlyCount} />
      {/* 주간 목표 프로그레스 바 */}
      <WeeklyGoalBar weeklyCount={stats.weeklyCount} weeklyGoal={settings.weeklyGoal} />
      {/* 이번 달 미니 캘린더 */}
      <MiniCalendar
        yearMonth={currentYearMonth}
        recordedDates={recordedDateSet}
        onDateSelect={handleDateSelect}
      />
      {/* 토스트 알림 */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {/* 운동 취소 확인 모달 */}
      {showCancelConfirm && (
        <ConfirmModal
          message="오늘 운동 기록을 전체 취소할까요?"
          confirmLabel="취소하기"
          onConfirm={handleCancelConfirm}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}
      {/* 세션 추가 입력 모달 */}
      {showSessionInput && (
        <SessionInputModal
          onConfirm={handleSessionConfirm}
          onCancel={() => setShowSessionInput(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 3: 전체 테스트 실행**

```bash
npx vitest run
```

Expected: 모든 테스트 PASS

- [ ] **Step 4: 커밋**

```bash
git add src/components/home/HomePage.tsx
git commit -m "feat: HomePage 멀티 세션 UI 연동 완료"
```

---

## Task 7: `RecordItem` 라벨 표시 업데이트

기록 탭의 개별 항목에 라벨을 표시한다.

**Files:**
- Modify: `src/components/records/RecordItem.tsx`

- [ ] **Step 1: RecordItem 업데이트**

`src/components/records/RecordItem.tsx`의 날짜 표시 부분에 라벨을 추가:

```typescript
// src/components/records/RecordItem.tsx
import { useState } from 'react'
import type { WorkoutRecord } from '../../types'
import { getTodayKST, formatDisplayDate } from '../../utils/date'
import { ConfirmModal } from '../shared/ConfirmModal'

type RecordItemProps = {
  record: WorkoutRecord
  onDelete: (id: string) => void
}

/** 개별 운동 기록 행 컴포넌트 — 오늘 기록 강조 표시, 라벨 표시 및 삭제 확인 모달 포함 */
export function RecordItem({ record, onDelete }: RecordItemProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const isToday = record.recordedDate === getTodayKST()

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: isToday ? 'rgba(59,130,246,0.05)' : 'var(--surface)',
        border: `1px solid ${isToday ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
        borderRadius: '12px', padding: '12px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%', background: 'var(--blue)', flexShrink: 0,
            boxShadow: isToday ? '0 0 8px rgba(59,130,246,0.8)' : 'none',
          }} />
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 600 }}>
              {formatDisplayDate(record.recordedDate)}
              {isToday && <span style={{ color: 'var(--blue)', marginLeft: '4px' }}>· 오늘</span>}
            </p>
            {/* 라벨이 있는 경우 운동 종류 표시 */}
            {record.label && (
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {record.label}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '9px', padding: '2px 8px', borderRadius: '10px',
            background: 'var(--surface-deep)',
            border: record.source === 'manual' ? '1px solid var(--border)' : '1px solid rgba(59,130,246,0.2)',
            color: record.source === 'manual' ? 'var(--text-muted)' : 'rgba(59,130,246,0.7)',
          }}>
            {record.source === 'manual' ? '수동' : '버튼'}
          </span>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)', padding: '4px' }}
          >
            삭제
          </button>
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          message={`${formatDisplayDate(record.recordedDate)}${record.label ? ` (${record.label})` : ''} 기록을 삭제할까요?`}
          onConfirm={() => { onDelete(record.id); setShowConfirm(false) }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: 타입 체크 및 전체 테스트**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: 오류 없음, 모든 테스트 PASS

- [ ] **Step 3: 커밋**

```bash
git add src/components/records/RecordItem.tsx
git commit -m "feat: RecordItem에 운동 라벨 표시 추가"
```

---

## Self-Review

### Spec 커버리지 확인
- [x] 하루 여러 세션 기록 → Task 2 (`recordToday` 중복 체크 제거)
- [x] 세션에 라벨 입력 → Task 3 (`SessionInputModal`)
- [x] 주간 목표가 세션 기준 → Task 2 (`weeklyCount` = 세션 수, 기존 로직 동일)
- [x] 완료 상태 버튼 재클릭 = 전체 취소 → Task 6 (`handleRecord`)
- [x] 별도 세션 추가 버튼 → Task 6 (`+ 운동 세션 추가` 버튼)
- [x] 오늘 세션 라벨 목록 표시 → Task 4 (`TodaySessionList`), Task 6
- [x] 기록 탭에 라벨 표시 → Task 7

### Placeholder 스캔
- 없음 — 모든 스텝에 실제 코드 포함

### 타입 일관성
- `label?: string` — Task 1에서 정의, Task 2·3·6·7에서 동일하게 참조
- `todaySessionCount: number` — Task 1에서 정의, Task 2·5·6에서 동일하게 참조
- `sessionCount` prop — Task 5에서 정의, Task 6에서 동일하게 전달
- `cancelToday` — Task 2에서 전체 삭제로 재정의, Task 6에서 동일하게 사용
