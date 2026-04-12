# my-gym MVP 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운동 출석 기록 PWA — 버튼 한 번으로 오늘 운동을 기록하고, 주간/월간 성취를 즉시 확인하는 모바일 웹앱을 구현한다.

**Architecture:** React + TypeScript + Vite 기반 SPA. 데이터는 Dexie.js(IndexedDB 래퍼)로 로컬 저장. 화면은 홈/기록/설정 3개 탭으로 구성되며, 탭바를 통해 전환한다. 전역 상태는 React Context + useReducer로 관리하고, 날짜 계산은 Asia/Seoul 타임존 기준으로 처리한다.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Dexie.js 3, Vitest, @testing-library/react, vite-plugin-pwa

---

## 파일 구조

```
my-gym/
├── index.html
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── package.json
├── public/
│   ├── manifest.json
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
└── src/
    ├── main.tsx                          # 앱 진입점
    ├── App.tsx                           # 루트 컴포넌트, 탭 라우팅
    ├── db/
    │   └── database.ts                   # Dexie DB 정의, WorkoutRecord/UserSettings 스키마
    ├── types/
    │   └── index.ts                      # WorkoutRecord, UserSettings 타입 정의
    ├── utils/
    │   └── date.ts                       # Asia/Seoul 기준 날짜 유틸 함수
    ├── hooks/
    │   ├── useWorkoutRecords.ts          # 기록 CRUD + 파생 통계 계산 훅
    │   └── useSettings.ts               # UserSettings 읽기/쓰기 훅
    ├── context/
    │   └── AppContext.tsx                # 전역 상태 (records, settings, activeTab)
    ├── components/
    │   ├── TabBar.tsx                    # 하단 탭 네비게이션
    │   ├── home/
    │   │   ├── HomePage.tsx             # 홈 화면 조합 컴포넌트
    │   │   ├── TodayHeader.tsx          # 날짜 + 오늘 상태 뱃지
    │   │   ├── RecordButton.tsx         # 메인 기록 버튼 (기록 전/완료 상태)
    │   │   ├── WeekDots.tsx             # 최근 7일 도트
    │   │   ├── StatsCards.tsx           # 이번 주/이번 달 통계 카드
    │   │   ├── WeeklyGoalBar.tsx        # 주간 목표 프로그레스 바
    │   │   └── MiniCalendar.tsx         # 이번 달 미니 캘린더
    │   ├── records/
    │   │   ├── RecordsPage.tsx          # 기록 화면 조합 컴포넌트
    │   │   ├── FilterChips.tsx          # 전체/이번달/이번주 필터 칩
    │   │   ├── RecordList.tsx           # 기록 리스트
    │   │   ├── RecordItem.tsx           # 기록 아이템 (삭제 버튼 포함)
    │   │   ├── ManualAddButton.tsx      # 과거 날짜 수동 추가 버튼
    │   │   └── DatePickerModal.tsx      # 날짜 선택 모달
    │   ├── settings/
    │   │   ├── SettingsPage.tsx         # 설정 화면 조합 컴포넌트
    │   │   ├── GoalStepper.tsx          # 주간 목표 스테퍼
    │   │   └── ResetDataButton.tsx      # 데이터 초기화 버튼 + 확인 모달
    │   └── shared/
    │       ├── ConfirmModal.tsx          # 삭제/초기화 확인 모달
    │       └── Toast.tsx                # 토스트 메시지
    ├── styles/
    │   └── global.css                   # 전역 CSS (다크 테마 변수, 리셋)
    └── test/
        ├── setup.ts                     # Vitest 셋업 (jsdom, testing-library)
        ├── utils/
        │   └── date.test.ts             # date 유틸 단위 테스트
        ├── hooks/
        │   ├── useWorkoutRecords.test.ts
        │   └── useSettings.test.ts
        └── components/
            ├── RecordButton.test.tsx
            ├── WeekDots.test.tsx
            ├── StatsCards.test.tsx
            ├── WeeklyGoalBar.test.tsx
            ├── RecordList.test.tsx
            └── GoalStepper.test.tsx
```

---

## Task 1: 프로젝트 초기화

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles/global.css`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Vite + React + TypeScript 프로젝트 생성**

```bash
cd /Users/joongyu/toy-project/my-gym
npm create vite@latest . -- --template react-ts
```

프롬프트에서 "Ignore files and continue" 선택.

- [ ] **Step 2: 의존성 설치**

```bash
npm install dexie
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom vite-plugin-pwa
```

- [ ] **Step 3: vitest.config.ts 작성**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

- [ ] **Step 4: 테스트 셋업 파일 작성**

```ts
// src/test/setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: vite.config.ts에 PWA 플러그인 추가**

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'my-gym',
        short_name: 'my-gym',
        description: '운동 출석 기록 앱',
        theme_color: '#0f0f0f',
        background_color: '#0f0f0f',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
```

- [ ] **Step 6: 전역 CSS 다크 테마 변수 작성**

```css
/* src/styles/global.css */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0f0f0f;
  --surface: #1a1a1a;
  --surface-deep: #111111;
  --border: #2a2a2a;
  --border-subtle: #1e1e1e;
  --blue: #3B82F6;
  --blue-dark: #2563EB;
  --blue-light: #93C5FD;
  --blue-tint: rgba(59, 130, 246, 0.1);
  --text: #f1f1f1;
  --text-secondary: #888888;
  --text-muted: #555555;
  --danger: #ef4444;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  min-height: 100dvh;
  max-width: 430px;
  margin: 0 auto;
}

#root { min-height: 100dvh; display: flex; flex-direction: column; }
```

- [ ] **Step 7: main.tsx 작성**

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 8: 앱이 뜨는지 확인**

```bash
npm run dev
```

Expected: `http://localhost:5173` 에서 기본 Vite 화면 노출.

- [ ] **Step 9: 커밋**

```bash
git init
git add .
git commit -m "feat: 프로젝트 초기화 (Vite + React + TypeScript + Dexie + PWA)"
```

---

## Task 2: 타입 정의 및 날짜 유틸

**Files:**
- Create: `src/types/index.ts`
- Create: `src/utils/date.ts`
- Create: `src/test/utils/date.test.ts`

- [ ] **Step 1: 타입 정의 작성**

```ts
// src/types/index.ts

export type WorkoutRecord = {
  id: string            // crypto.randomUUID()
  recordedAt: string    // ISO datetime (기록 생성 시각)
  recordedDate: string  // YYYY-MM-DD (Asia/Seoul 기준, 통계 계산 기준)
  createdAt: string     // ISO datetime
  source: 'today_button' | 'manual'
}

export type UserSettings = {
  weeklyGoal: number    // 1~7, 기본값 3
  timezone: 'Asia/Seoul'
}

export type ActiveTab = 'home' | 'records' | 'settings'

// 파생 통계 타입
export type WorkoutStats = {
  weeklyCount: number        // 이번 주 기록 수
  monthlyCount: number       // 이번 달 기록 수
  totalCount: number         // 전체 기록 수
  recent7Days: boolean[]     // 오늘 포함 최근 7일 (index 0 = 6일 전, index 6 = 오늘)
  weeklyGoalProgress: number // weeklyCount / weeklyGoal (0~1+)
  isTodayRecorded: boolean   // 오늘 기록 여부
}
```

- [ ] **Step 2: date 유틸 테스트 작성**

```ts
// src/test/utils/date.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getTodayKST,
  getWeekStartKST,
  getMonthStartKST,
  isThisWeekKST,
  isThisMonthKST,
  formatDisplayDate,
  getRecent7DayDates,
} from '../../utils/date'

describe('getTodayKST', () => {
  it('YYYY-MM-DD 형식의 문자열을 반환한다', () => {
    const result = getTodayKST()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('getWeekStartKST', () => {
  it('월요일 기준 이번 주 시작 날짜를 반환한다', () => {
    // 2026-04-12 (일요일) 기준 → 이번 주 월요일은 2026-04-06
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const result = getWeekStartKST()
    expect(result).toBe('2026-04-06')
    vi.useRealTimers()
  })
})

describe('getMonthStartKST', () => {
  it('이번 달 1일을 반환한다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const result = getMonthStartKST()
    expect(result).toBe('2026-04-01')
    vi.useRealTimers()
  })
})

describe('isThisWeekKST', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('이번 주 날짜는 true를 반환한다', () => {
    expect(isThisWeekKST('2026-04-08')).toBe(true)
  })

  it('지난 주 날짜는 false를 반환한다', () => {
    expect(isThisWeekKST('2026-04-05')).toBe(false)
  })
})

describe('isThisMonthKST', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('이번 달 날짜는 true를 반환한다', () => {
    expect(isThisMonthKST('2026-04-01')).toBe(true)
  })

  it('지난 달 날짜는 false를 반환한다', () => {
    expect(isThisMonthKST('2026-03-31')).toBe(false)
  })
})

describe('getRecent7DayDates', () => {
  it('오늘 포함 최근 7일 날짜 배열을 오래된 순으로 반환한다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
    const result = getRecent7DayDates()
    expect(result).toHaveLength(7)
    expect(result[0]).toBe('2026-04-06')
    expect(result[6]).toBe('2026-04-12')
    vi.useRealTimers()
  })
})

describe('formatDisplayDate', () => {
  it('YYYY-MM-DD를 "4월 12일 일요일" 형식으로 변환한다', () => {
    const result = formatDisplayDate('2026-04-12')
    expect(result).toBe('4월 12일 일요일')
  })
})
```

- [ ] **Step 3: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/test/utils/date.test.ts
```

Expected: FAIL (모듈 없음)

- [ ] **Step 4: date 유틸 구현**

```ts
// src/utils/date.ts

const TIMEZONE = 'Asia/Seoul'

/** 현재 KST 날짜를 YYYY-MM-DD 형식으로 반환 */
export function getTodayKST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE })
}

/** 이번 주 월요일 날짜를 YYYY-MM-DD로 반환 */
export function getWeekStartKST(): string {
  const today = new Date(getTodayKST() + 'T00:00:00')
  // getDay(): 0=일, 1=월 ... 6=토
  const dayOfWeek = today.getDay()
  // 월요일 기준: 일요일(0)은 -6, 월(1)은 0, ..., 토(6)은 -5
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  return monday.toLocaleDateString('en-CA', { timeZone: 'UTC' })
}

/** 이번 달 1일을 YYYY-MM-DD로 반환 */
export function getMonthStartKST(): string {
  const today = getTodayKST()
  return today.slice(0, 7) + '-01'
}

/** 날짜(YYYY-MM-DD)가 이번 주에 속하는지 확인 */
export function isThisWeekKST(date: string): boolean {
  const weekStart = getWeekStartKST()
  const today = getTodayKST()
  return date >= weekStart && date <= today
}

/** 날짜(YYYY-MM-DD)가 이번 달에 속하는지 확인 */
export function isThisMonthKST(date: string): boolean {
  const monthStart = getMonthStartKST()
  const today = getTodayKST()
  return date >= monthStart && date <= today
}

/** 오늘 포함 최근 7일 날짜 배열을 오래된 순으로 반환 */
export function getRecent7DayDates(): string[] {
  const today = new Date(getTodayKST() + 'T00:00:00')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return d.toLocaleDateString('en-CA', { timeZone: 'UTC' })
  })
}

/** YYYY-MM-DD → "4월 12일 일요일" 형식으로 변환 */
export function formatDisplayDate(date: string): string {
  const d = new Date(date + 'T00:00:00')
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  const weekday = weekdays[d.getDay()]
  return `${month}월 ${day}일 ${weekday}`
}

/** 요일 약자 반환 (도트 레이블용) */
export function getDayLabel(date: string): string {
  const d = new Date(date + 'T00:00:00')
  const labels = ['일', '월', '화', '수', '목', '금', '토']
  return labels[d.getDay()]
}

/** 이번 달 날짜 목록 반환 (달력용) */
export function getMonthDates(yearMonth: string): string[] {
  // yearMonth: 'YYYY-MM'
  const [year, month] = yearMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, '0')
    return `${yearMonth}-${day}`
  })
}

/** 달의 첫 날 요일 반환 (0=일, 1=월 ... 6=토) */
export function getFirstDayOfWeek(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month - 1, 1).getDay()
}
```

- [ ] **Step 5: 테스트 재실행 — 통과 확인**

```bash
npx vitest run src/test/utils/date.test.ts
```

Expected: 모든 테스트 PASS

- [ ] **Step 6: 커밋**

```bash
git add src/types/index.ts src/utils/date.ts src/test/utils/date.test.ts
git commit -m "feat: 타입 정의 및 날짜 유틸 구현 (Asia/Seoul 기준)"
```

---

## Task 3: IndexedDB 스키마 및 CRUD 훅

**Files:**
- Create: `src/db/database.ts`
- Create: `src/hooks/useWorkoutRecords.ts`
- Create: `src/hooks/useSettings.ts`
- Create: `src/test/hooks/useWorkoutRecords.test.ts`
- Create: `src/test/hooks/useSettings.test.ts`

- [ ] **Step 1: Dexie DB 정의 작성**

```ts
// src/db/database.ts
import Dexie, { type Table } from 'dexie'
import type { WorkoutRecord, UserSettings } from '../types'

class GymDatabase extends Dexie {
  workoutRecords!: Table<WorkoutRecord>
  userSettings!: Table<UserSettings & { id: number }>

  constructor() {
    super('my-gym-db')
    this.version(1).stores({
      // recordedDate에 unique 인덱스 → 하루 1회 정책 DB 레벨 보장
      workoutRecords: 'id, recordedDate, recordedAt',
      // settings는 id=1 단일 레코드
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

- [ ] **Step 2: useWorkoutRecords 훅 테스트 작성**

```ts
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
        where: (field: string) => ({
          equals: (val: string) => ({
            first: async () => records.find((r: any) => r[field] === val),
          }),
        }),
      },
    },
    getOrCreateSettings: async () => ({ weeklyGoal: 3, timezone: 'Asia/Seoul' }),
  }
})

describe('useWorkoutRecords', () => {
  it('초기 상태에서 isTodayRecorded는 false이다', async () => {
    const { result } = renderHook(() => useWorkoutRecords(3))
    // 로딩 완료 대기
    await act(async () => {})
    expect(result.current.stats.isTodayRecorded).toBe(false)
  })

  it('recordToday 호출 시 isTodayRecorded가 true가 된다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))

    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})

    await act(async () => {
      await result.current.recordToday()
    })

    expect(result.current.stats.isTodayRecorded).toBe(true)
    vi.useRealTimers()
  })

  it('같은 날 중복 recordToday 호출 시 기록이 1건만 생성된다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))

    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})

    await act(async () => { await result.current.recordToday() })
    await act(async () => { await result.current.recordToday() })

    expect(result.current.stats.weeklyCount).toBe(1)
    vi.useRealTimers()
  })

  it('deleteRecord 호출 시 해당 기록이 삭제된다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))

    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})
    await act(async () => { await result.current.recordToday() })
    expect(result.current.stats.isTodayRecorded).toBe(true)

    const record = result.current.records[0]
    await act(async () => { await result.current.deleteRecord(record.id) })
    expect(result.current.stats.isTodayRecorded).toBe(false)
    vi.useRealTimers()
  })
})
```

- [ ] **Step 3: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/test/hooks/useWorkoutRecords.test.ts
```

Expected: FAIL (훅 없음)

- [ ] **Step 4: useWorkoutRecords 훅 구현**

```ts
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

function calcStats(records: WorkoutRecord[], weeklyGoal: number): WorkoutStats {
  const today = getTodayKST()
  const recent7 = getRecent7DayDates()
  const dateSet = new Set(records.map(r => r.recordedDate))

  const weeklyCount = records.filter(r => isThisWeekKST(r.recordedDate)).length
  const monthlyCount = records.filter(r => isThisMonthKST(r.recordedDate)).length

  return {
    weeklyCount,
    monthlyCount,
    totalCount: records.length,
    recent7Days: recent7.map(d => dateSet.has(d)),
    weeklyGoalProgress: weeklyGoal > 0 ? weeklyCount / weeklyGoal : 0,
    isTodayRecorded: dateSet.has(today),
  }
}

export function useWorkoutRecords(weeklyGoal: number) {
  const [records, setRecords] = useState<WorkoutRecord[]>([])
  const [stats, setStats] = useState<WorkoutStats>({
    weeklyCount: 0,
    monthlyCount: 0,
    totalCount: 0,
    recent7Days: Array(7).fill(false),
    weeklyGoalProgress: 0,
    isTodayRecorded: false,
  })

  const refresh = useCallback(async () => {
    const all = await db.workoutRecords.toArray()
    // 최신순 정렬
    all.sort((a, b) => b.recordedDate.localeCompare(a.recordedDate))
    setRecords(all)
    setStats(calcStats(all, weeklyGoal))
  }, [weeklyGoal])

  useEffect(() => { refresh() }, [refresh])

  const recordToday = useCallback(async (): Promise<'recorded' | 'duplicate'> => {
    const today = getTodayKST()
    const existing = await db.workoutRecords.where('recordedDate').equals(today).first()
    if (existing) return 'duplicate'

    const record: WorkoutRecord = {
      id: crypto.randomUUID(),
      recordedAt: new Date().toISOString(),
      recordedDate: today,
      createdAt: new Date().toISOString(),
      source: 'today_button',
    }
    await db.workoutRecords.add(record)
    await refresh()
    return 'recorded'
  }, [refresh])

  const addManual = useCallback(async (date: string): Promise<'recorded' | 'duplicate' | 'future'> => {
    const today = getTodayKST()
    if (date > today) return 'future'

    const existing = await db.workoutRecords.where('recordedDate').equals(date).first()
    if (existing) return 'duplicate'

    const record: WorkoutRecord = {
      id: crypto.randomUUID(),
      recordedAt: new Date().toISOString(),
      recordedDate: date,
      createdAt: new Date().toISOString(),
      source: 'manual',
    }
    await db.workoutRecords.add(record)
    await refresh()
    return 'recorded'
  }, [refresh])

  const deleteRecord = useCallback(async (id: string) => {
    await db.workoutRecords.delete(id)
    await refresh()
  }, [refresh])

  const deleteAllRecords = useCallback(async () => {
    await db.workoutRecords.clear()
    await refresh()
  }, [refresh])

  return { records, stats, recordToday, addManual, deleteRecord, deleteAllRecords }
}
```

- [ ] **Step 5: useSettings 훅 테스트 작성**

```ts
// src/test/hooks/useSettings.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSettings } from '../../hooks/useSettings'

vi.mock('../../db/database', () => {
  let settings = { weeklyGoal: 3, timezone: 'Asia/Seoul' }
  return {
    db: {
      userSettings: {
        put: async (s: any) => { settings = s },
      },
    },
    getOrCreateSettings: async () => ({ ...settings }),
  }
})

describe('useSettings', () => {
  it('기본 weeklyGoal은 3이다', async () => {
    const { result } = renderHook(() => useSettings())
    await act(async () => {})
    expect(result.current.settings.weeklyGoal).toBe(3)
  })

  it('updateWeeklyGoal 호출 시 값이 변경된다', async () => {
    const { result } = renderHook(() => useSettings())
    await act(async () => {})
    await act(async () => { await result.current.updateWeeklyGoal(5) })
    expect(result.current.settings.weeklyGoal).toBe(5)
  })
})
```

- [ ] **Step 6: useSettings 훅 구현**

```ts
// src/hooks/useSettings.ts
import { useState, useEffect, useCallback } from 'react'
import { db, getOrCreateSettings } from '../db/database'
import type { UserSettings } from '../types'

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>({
    weeklyGoal: 3,
    timezone: 'Asia/Seoul',
  })

  useEffect(() => {
    getOrCreateSettings().then(setSettings)
  }, [])

  const updateWeeklyGoal = useCallback(async (goal: number) => {
    const clamped = Math.max(1, Math.min(7, goal))
    const updated = { ...settings, weeklyGoal: clamped }
    await db.userSettings.put({ id: 1, ...updated })
    setSettings(updated)
  }, [settings])

  return { settings, updateWeeklyGoal }
}
```

- [ ] **Step 7: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/test/hooks/
```

Expected: 모든 테스트 PASS

- [ ] **Step 8: 커밋**

```bash
git add src/db/ src/hooks/ src/test/hooks/
git commit -m "feat: IndexedDB 스키마 및 CRUD 훅 구현"
```

---

## Task 4: AppContext 및 App 레이아웃

**Files:**
- Create: `src/context/AppContext.tsx`
- Modify: `src/App.tsx`
- Create: `src/components/TabBar.tsx`

- [ ] **Step 1: AppContext 작성**

```tsx
// src/context/AppContext.tsx
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { ActiveTab } from '../types'
import { useWorkoutRecords } from '../hooks/useWorkoutRecords'
import { useSettings } from '../hooks/useSettings'

type AppContextValue = {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
} & ReturnType<typeof useWorkoutRecords> & ReturnType<typeof useSettings>

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home')
  const { settings, updateWeeklyGoal } = useSettings()
  const workoutData = useWorkoutRecords(settings.weeklyGoal)

  return (
    <AppContext.Provider value={{
      activeTab, setActiveTab,
      settings, updateWeeklyGoal,
      ...workoutData,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}
```

- [ ] **Step 2: TabBar 컴포넌트 작성**

```tsx
// src/components/TabBar.tsx
import { useAppContext } from '../context/AppContext'
import type { ActiveTab } from '../types'

const TABS: { id: ActiveTab; label: string; icon: string }[] = [
  { id: 'home',     label: '홈',   icon: '🏠' },
  { id: 'records',  label: '기록', icon: '📋' },
  { id: 'settings', label: '설정', icon: '⚙️' },
]

export function TabBar() {
  const { activeTab, setActiveTab } = useAppContext()

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-around',
      padding: '10px 0 max(12px, env(safe-area-inset-bottom))',
      background: 'var(--surface-deep)',
      borderTop: '1px solid var(--border-subtle)',
      position: 'sticky',
      bottom: 0,
    }}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            padding: '4px 16px',
          }}
        >
          <span style={{ fontSize: '18px' }}>{tab.icon}</span>
          <span style={{
            fontSize: '10px',
            color: activeTab === tab.id ? 'var(--blue)' : 'var(--text-muted)',
            fontWeight: activeTab === tab.id ? 600 : 400,
          }}>
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  )
}
```

- [ ] **Step 3: App.tsx 레이아웃 작성**

```tsx
// src/App.tsx
import { AppProvider, useAppContext } from './context/AppContext'
import { TabBar } from './components/TabBar'
import { HomePage } from './components/home/HomePage'
import { RecordsPage } from './components/records/RecordsPage'
import { SettingsPage } from './components/settings/SettingsPage'

function AppContent() {
  const { activeTab } = useAppContext()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <main style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 0' }}>
        {activeTab === 'home'     && <HomePage />}
        {activeTab === 'records'  && <RecordsPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
      <TabBar />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
```

- [ ] **Step 4: 빈 페이지 컴포넌트 임시 생성 (빌드 오류 방지)**

```bash
mkdir -p src/components/home src/components/records src/components/settings
```

`src/components/home/HomePage.tsx`:
```tsx
export function HomePage() { return <div>홈</div> }
```

`src/components/records/RecordsPage.tsx`:
```tsx
export function RecordsPage() { return <div>기록</div> }
```

`src/components/settings/SettingsPage.tsx`:
```tsx
export function SettingsPage() { return <div>설정</div> }
```

- [ ] **Step 5: 앱 실행 확인**

```bash
npm run dev
```

Expected: 탭바 3개 노출, 탭 전환 시 텍스트 변경.

- [ ] **Step 6: 커밋**

```bash
git add src/context/ src/components/TabBar.tsx src/App.tsx src/components/home/HomePage.tsx src/components/records/RecordsPage.tsx src/components/settings/SettingsPage.tsx
git commit -m "feat: AppContext 및 탭 레이아웃 구현"
```

---

## Task 5: 홈 화면 컴포넌트

**Files:**
- Create: `src/components/shared/Toast.tsx`
- Modify: `src/components/home/HomePage.tsx`
- Create: `src/components/home/TodayHeader.tsx`
- Create: `src/components/home/RecordButton.tsx`
- Create: `src/components/home/WeekDots.tsx`
- Create: `src/components/home/StatsCards.tsx`
- Create: `src/components/home/WeeklyGoalBar.tsx`
- Create: `src/components/home/MiniCalendar.tsx`
- Create: `src/test/components/RecordButton.test.tsx`
- Create: `src/test/components/WeekDots.test.tsx`
- Create: `src/test/components/StatsCards.test.tsx`
- Create: `src/test/components/WeeklyGoalBar.test.tsx`

- [ ] **Step 1: Toast 컴포넌트 작성**

```tsx
// src/components/shared/Toast.tsx
import { useEffect } from 'react'

type ToastProps = {
  message: string
  onClose: () => void
}

export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '20px',
      padding: '10px 20px',
      fontSize: '13px',
      color: 'var(--text-secondary)',
      zIndex: 1000,
      whiteSpace: 'nowrap',
    }}>
      {message}
    </div>
  )
}
```

- [ ] **Step 2: TodayHeader 작성**

```tsx
// src/components/home/TodayHeader.tsx
import { formatDisplayDate, getTodayKST } from '../../utils/date'

type TodayHeaderProps = {
  isTodayRecorded: boolean
}

export function TodayHeader({ isTodayRecorded }: TodayHeaderProps) {
  const today = getTodayKST()

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
        {formatDisplayDate(today)}
      </p>
      <span style={{
        display: 'inline-block',
        padding: '4px 14px',
        borderRadius: '20px',
        fontSize: '11px',
        background: isTodayRecorded ? 'var(--blue-tint)' : 'var(--surface)',
        border: `1px solid ${isTodayRecorded ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
        color: isTodayRecorded ? 'var(--blue)' : 'var(--text-secondary)',
      }}>
        {isTodayRecorded ? '✓ 오늘 운동 완료!' : '아직 기록 안 했어요'}
      </span>
    </div>
  )
}
```

- [ ] **Step 3: RecordButton 테스트 작성**

```tsx
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

  it('버튼 클릭 시 onRecord 콜백이 호출된다', () => {
    const onRecord = vi.fn()
    render(<RecordButton isTodayRecorded={false} onRecord={onRecord} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onRecord).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 4: RecordButton 구현**

```tsx
// src/components/home/RecordButton.tsx
type RecordButtonProps = {
  isTodayRecorded: boolean
  onRecord: () => void
}

export function RecordButton({ isTodayRecorded, onRecord }: RecordButtonProps) {
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
          boxShadow: isTodayRecorded
            ? '0 0 50px rgba(59,130,246,0.7), 0 8px 20px rgba(0,0,0,0.4)'
            : '0 0 30px rgba(59,130,246,0.4), 0 8px 20px rgba(0,0,0,0.4)',
          transition: 'box-shadow 0.3s ease',
        }}
      >
        {isTodayRecorded ? '✓ 오늘 운동 완료' : '오늘 운동 기록'}
      </button>
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

- [ ] **Step 5: WeekDots 테스트 작성**

```tsx
// src/test/components/WeekDots.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeekDots } from '../../components/home/WeekDots'

describe('WeekDots', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T10:00:00+09:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('7개의 도트를 렌더링한다', () => {
    const days = Array(7).fill(false)
    const { container } = render(<WeekDots recent7Days={days} />)
    // 각 도트는 data-testid="dot" 사용
    expect(container.querySelectorAll('[data-testid="dot"]')).toHaveLength(7)
  })

  it('"오늘" 레이블이 표시된다', () => {
    render(<WeekDots recent7Days={Array(7).fill(false)} />)
    expect(screen.getByText('오늘')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: WeekDots 구현**

```tsx
// src/components/home/WeekDots.tsx
import { getRecent7DayDates, getTodayKST, getDayLabel } from '../../utils/date'

type WeekDotsProps = {
  recent7Days: boolean[] // index 0 = 6일 전, index 6 = 오늘
}

export function WeekDots({ recent7Days }: WeekDotsProps) {
  const dates = getRecent7DayDates()
  const today = getTodayKST()

  return (
    <div>
      <p style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '8px' }}>
        최근 7일
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {dates.map((date, i) => {
          const isToday = date === today
          const isRecorded = recent7Days[i]
          return (
            <div key={date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div
                data-testid="dot"
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: isRecorded ? 'var(--blue)' : '#222',
                  border: isToday && !isRecorded ? '2px solid var(--blue)' : isRecorded ? 'none' : '1px solid #333',
                  boxShadow: isRecorded
                    ? isToday
                      ? '0 0 14px rgba(59,130,246,1)'
                      : '0 0 8px rgba(59,130,246,0.6)'
                    : isToday
                      ? '0 0 8px rgba(59,130,246,0.4)'
                      : 'none',
                }}
              />
              <span style={{
                fontSize: '8px',
                color: isToday ? 'var(--blue)' : 'var(--text-muted)',
              }}>
                {isToday ? '오늘' : getDayLabel(date)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: StatsCards 테스트 및 구현**

테스트:
```tsx
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
```

구현:
```tsx
// src/components/home/StatsCards.tsx
type StatsCardsProps = {
  weeklyCount: number
  monthlyCount: number
}

export function StatsCards({ weeklyCount, monthlyCount }: StatsCardsProps) {
  const cardStyle = {
    flex: 1,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '14px 8px',
    textAlign: 'center' as const,
  }
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <div style={cardStyle}>
        <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>{weeklyCount}</p>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>이번 주</p>
      </div>
      <div style={cardStyle}>
        <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>{monthlyCount}</p>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>이번 달</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: WeeklyGoalBar 테스트 및 구현**

테스트:
```tsx
// src/test/components/WeeklyGoalBar.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeeklyGoalBar } from '../../components/home/WeeklyGoalBar'

describe('WeeklyGoalBar', () => {
  it('weeklyCount / weeklyGoal 텍스트를 표시한다', () => {
    render(<WeeklyGoalBar weeklyCount={2} weeklyGoal={3} />)
    expect(screen.getByText('2 / 3회')).toBeInTheDocument()
  })
})
```

구현:
```tsx
// src/components/home/WeeklyGoalBar.tsx
type WeeklyGoalBarProps = {
  weeklyCount: number
  weeklyGoal: number
}

export function WeeklyGoalBar({ weeklyCount, weeklyGoal }: WeeklyGoalBarProps) {
  const progress = Math.min(weeklyCount / weeklyGoal, 1)
  const isDone = weeklyCount >= weeklyGoal

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${isDone ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
      borderRadius: '14px',
      padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', color: isDone ? 'var(--blue)' : 'var(--text-secondary)' }}>
          {isDone ? '주간 목표 달성! 🎉' : '주간 목표'}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--blue)', fontWeight: 600 }}>
          {weeklyCount} / {weeklyGoal}회
        </span>
      </div>
      <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px' }}>
        <div style={{
          height: '100%',
          width: `${progress * 100}%`,
          background: 'linear-gradient(90deg, var(--blue-dark), var(--blue))',
          borderRadius: '2px',
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 9: MiniCalendar 구현**

```tsx
// src/components/home/MiniCalendar.tsx
import { getMonthDates, getFirstDayOfWeek, getTodayKST } from '../../utils/date'

type MiniCalendarProps = {
  yearMonth: string       // 'YYYY-MM'
  recordedDates: Set<string>
  onDateSelect: (date: string) => void
}

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

export function MiniCalendar({ yearMonth, recordedDates, onDateSelect }: MiniCalendarProps) {
  const today = getTodayKST()
  const dates = getMonthDates(yearMonth)
  // 첫 날 요일 (0=일 → 6번째 열, 1=월 → 0번째 열)
  const firstDay = getFirstDayOfWeek(yearMonth)
  // 월요일 기준으로 변환: 일=6, 월=0, ..., 토=5
  const startOffset = firstDay === 0 ? 6 : firstDay - 1
  const [year, month] = yearMonth.split('-')

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '14px',
      padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{month}월</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{ fontSize: '8px', color: 'var(--text-muted)', textAlign: 'center', paddingBottom: '4px' }}>
            {d}
          </div>
        ))}
        {/* 빈 셀 (첫 날 이전) */}
        {Array.from({ length: startOffset }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {dates.map(date => {
          const day = date.split('-')[2].replace(/^0/, '')
          const isToday = date === today
          const isRecorded = recordedDates.has(date)
          const isFuture = date > today
          return (
            <button
              key={date}
              onClick={() => !isFuture && onDateSelect(date)}
              style={{
                aspectRatio: '1',
                borderRadius: '5px',
                border: isToday ? '1px solid var(--blue)' : 'none',
                background: isRecorded ? 'rgba(59,130,246,0.2)' : 'transparent',
                color: isRecorded ? 'var(--blue)' : isToday ? 'var(--blue)' : isFuture ? '#333' : 'var(--text-muted)',
                fontSize: '9px',
                fontWeight: isToday || isRecorded ? 600 : 400,
                cursor: isFuture ? 'default' : 'pointer',
              }}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 10: HomePage 조합**

```tsx
// src/components/home/HomePage.tsx
import { useState, useCallback } from 'react'
import { useAppContext } from '../../context/AppContext'
import { getTodayKST } from '../../utils/date'
import { TodayHeader } from './TodayHeader'
import { RecordButton } from './RecordButton'
import { WeekDots } from './WeekDots'
import { StatsCards } from './StatsCards'
import { WeeklyGoalBar } from './WeeklyGoalBar'
import { MiniCalendar } from './MiniCalendar'
import { Toast } from '../shared/Toast'

export function HomePage() {
  const { stats, settings, records, recordToday, addManual, deleteRecord } = useAppContext()
  const [toast, setToast] = useState<string | null>(null)

  const handleRecord = useCallback(async () => {
    const result = await recordToday()
    if (result === 'duplicate') {
      setToast('오늘은 이미 기록했어요')
    }
  }, [recordToday])

  const handleDateSelect = useCallback(async (date: string) => {
    const today = getTodayKST()
    const existing = records.find(r => r.recordedDate === date)
    if (existing) {
      // 이미 기록된 날 → 삭제 확인은 기록 탭에서 처리 (홈 캘린더는 단순 표시)
      return
    }
    if (date < today) {
      const result = await addManual(date)
      if (result === 'recorded') setToast(`${date} 기록을 추가했어요`)
    }
  }, [records, addManual])

  const recordedDateSet = new Set(records.map(r => r.recordedDate))
  const currentYearMonth = getTodayKST().slice(0, 7)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px' }}>
      <TodayHeader isTodayRecorded={stats.isTodayRecorded} />
      <RecordButton isTodayRecorded={stats.isTodayRecorded} onRecord={handleRecord} />
      <WeekDots recent7Days={stats.recent7Days} />
      <StatsCards weeklyCount={stats.weeklyCount} monthlyCount={stats.monthlyCount} />
      <WeeklyGoalBar weeklyCount={stats.weeklyCount} weeklyGoal={settings.weeklyGoal} />
      <MiniCalendar
        yearMonth={currentYearMonth}
        recordedDates={recordedDateSet}
        onDateSelect={handleDateSelect}
      />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
```

- [ ] **Step 11: 테스트 실행**

```bash
npx vitest run src/test/components/
```

Expected: 모든 컴포넌트 테스트 PASS

- [ ] **Step 12: 브라우저 확인**

```bash
npm run dev
```

Expected: 홈 화면에 모든 컴포넌트 노출. 기록 버튼 클릭 시 완료 상태로 전환.

- [ ] **Step 13: 커밋**

```bash
git add src/components/home/ src/components/shared/Toast.tsx src/test/components/
git commit -m "feat: 홈 화면 컴포넌트 구현"
```

---

## Task 6: 기록 화면

**Files:**
- Create: `src/components/shared/ConfirmModal.tsx`
- Create: `src/components/records/FilterChips.tsx`
- Create: `src/components/records/RecordItem.tsx`
- Create: `src/components/records/RecordList.tsx`
- Create: `src/components/records/DatePickerModal.tsx`
- Create: `src/components/records/ManualAddButton.tsx`
- Modify: `src/components/records/RecordsPage.tsx`
- Create: `src/test/components/RecordList.test.tsx`

- [ ] **Step 1: ConfirmModal 구현**

```tsx
// src/components/shared/ConfirmModal.tsx
type ConfirmModalProps = {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '20px', padding: '24px 20px', width: '80%', maxWidth: '300px',
      }}>
        <p style={{ fontSize: '14px', color: 'var(--text)', textAlign: 'center', marginBottom: '20px', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px',
          }}>
            취소
          </button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
            background: 'var(--danger)', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
          }}>
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: FilterChips 구현**

```tsx
// src/components/records/FilterChips.tsx
export type FilterType = 'all' | 'month' | 'week'

type FilterChipsProps = {
  active: FilterType
  onChange: (f: FilterType) => void
}

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all',   label: '전체' },
  { id: 'month', label: '이번 달' },
  { id: 'week',  label: '이번 주' },
]

export function FilterChips({ active, onChange }: FilterChipsProps) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {FILTERS.map(f => (
        <button
          key={f.id}
          onClick={() => onChange(f.id)}
          style={{
            padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
            cursor: 'pointer',
            background: active === f.id ? 'var(--blue-tint)' : 'var(--surface)',
            border: `1px solid ${active === f.id ? 'var(--blue)' : 'var(--border)'}`,
            color: active === f.id ? 'var(--blue)' : 'var(--text-muted)',
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: RecordItem 구현**

```tsx
// src/components/records/RecordItem.tsx
import { useState } from 'react'
import type { WorkoutRecord } from '../../types'
import { getTodayKST, formatDisplayDate } from '../../utils/date'
import { ConfirmModal } from '../shared/ConfirmModal'

type RecordItemProps = {
  record: WorkoutRecord
  onDelete: (id: string) => void
}

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
              {formatDisplayDate(record.recordedDate).replace(' 오늘', '')}
              {isToday && <span style={{ color: 'var(--blue)', marginLeft: '4px' }}>· 오늘</span>}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '9px', padding: '2px 8px', borderRadius: '10px',
            background: 'var(--surface-deep)', border: '1px solid var(--border-subtle)',
            color: record.source === 'manual' ? 'var(--text-muted)' : 'rgba(59,130,246,0.7)',
            borderColor: record.source === 'manual' ? 'var(--border)' : 'rgba(59,130,246,0.2)',
          }}>
            {record.source === 'manual' ? '수동' : '버튼'}
          </span>
          <button
            onClick={() => setShowConfirm(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)', padding: '4px' }}
          >
            삭제
          </button>
        </div>
      </div>
      {showConfirm && (
        <ConfirmModal
          message={`${formatDisplayDate(record.recordedDate)} 기록을 삭제할까요?`}
          onConfirm={() => { onDelete(record.id); setShowConfirm(false) }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 4: RecordList 테스트 및 구현**

테스트:
```tsx
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

  it('기록 목록을 렌더링한다', () => {
    render(<RecordList records={mockRecords} onDelete={vi.fn()} />)
    // 2개의 기록 아이템 존재 확인
    expect(screen.getAllByText('삭제')).toHaveLength(2)
  })
})
```

구현:
```tsx
// src/components/records/RecordList.tsx
import type { WorkoutRecord } from '../../types'
import { RecordItem } from './RecordItem'

type RecordListProps = {
  records: WorkoutRecord[]
  onDelete: (id: string) => void
}

export function RecordList({ records, onDelete }: RecordListProps) {
  if (records.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>기록이 없어요</p>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {records.map(record => (
        <RecordItem key={record.id} record={record} onDelete={onDelete} />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: DatePickerModal 구현**

```tsx
// src/components/records/DatePickerModal.tsx
import { useState } from 'react'
import { getTodayKST } from '../../utils/date'

type DatePickerModalProps = {
  onConfirm: (date: string) => void
  onCancel: () => void
}

export function DatePickerModal({ onConfirm, onCancel }: DatePickerModalProps) {
  const today = getTodayKST()
  const [selected, setSelected] = useState(today)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '20px', padding: '24px 20px', width: '80%', maxWidth: '300px',
      }}>
        <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '16px', fontWeight: 600 }}>
          날짜 선택
        </p>
        <input
          type="date"
          value={selected}
          max={today}
          onChange={e => setSelected(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: '10px',
            background: 'var(--surface-deep)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: '14px', marginBottom: '16px',
            colorScheme: 'dark',
          }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px',
          }}>
            취소
          </button>
          <button onClick={() => onConfirm(selected)} style={{
            flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
            background: 'var(--blue)', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
          }}>
            추가
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: ManualAddButton 구현**

```tsx
// src/components/records/ManualAddButton.tsx
type ManualAddButtonProps = {
  onClick: () => void
}

export function ManualAddButton({ onClick }: ManualAddButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '12px',
        borderRadius: '12px', border: '1.5px dashed var(--border)',
        background: 'transparent', color: 'var(--text-muted)',
        cursor: 'pointer', fontSize: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
      }}
    >
      + 과거 날짜 기록 추가
    </button>
  )
}
```

- [ ] **Step 7: RecordsPage 조합**

```tsx
// src/components/records/RecordsPage.tsx
import { useState, useMemo } from 'react'
import { useAppContext } from '../../context/AppContext'
import { isThisWeekKST, isThisMonthKST } from '../../utils/date'
import { FilterChips, type FilterType } from './FilterChips'
import { RecordList } from './RecordList'
import { ManualAddButton } from './ManualAddButton'
import { DatePickerModal } from './DatePickerModal'
import { Toast } from '../shared/Toast'

export function RecordsPage() {
  const { records, stats, deleteRecord, addManual } = useAppContext()
  const [filter, setFilter] = useState<FilterType>('all')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (filter === 'week')  return records.filter(r => isThisWeekKST(r.recordedDate))
    if (filter === 'month') return records.filter(r => isThisMonthKST(r.recordedDate))
    return records
  }, [records, filter])

  const handleManualAdd = async (date: string) => {
    setShowDatePicker(false)
    const result = await addManual(date)
    if (result === 'duplicate') setToast('이미 기록된 날짜예요')
    else if (result === 'future') setToast('미래 날짜는 기록할 수 없어요')
    else setToast('기록을 추가했어요')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>기록</h1>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
          총 {stats.totalCount}회 기록됨
        </p>
      </div>
      <FilterChips active={filter} onChange={setFilter} />
      <RecordList records={filtered} onDelete={deleteRecord} />
      <ManualAddButton onClick={() => setShowDatePicker(true)} />
      {showDatePicker && (
        <DatePickerModal onConfirm={handleManualAdd} onCancel={() => setShowDatePicker(false)} />
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
```

- [ ] **Step 8: 테스트 실행**

```bash
npx vitest run src/test/components/RecordList.test.tsx
```

Expected: PASS

- [ ] **Step 9: 브라우저 확인**

```bash
npm run dev
```

Expected: 기록 탭에서 리스트 표시, 삭제 버튼 → 확인 모달, 과거 날짜 추가 동작.

- [ ] **Step 10: 커밋**

```bash
git add src/components/records/ src/components/shared/ConfirmModal.tsx src/test/components/RecordList.test.tsx
git commit -m "feat: 기록 화면 구현 (리스트, 삭제, 수동 추가)"
```

---

## Task 7: 설정 화면

**Files:**
- Create: `src/components/settings/GoalStepper.tsx`
- Create: `src/components/settings/ResetDataButton.tsx`
- Modify: `src/components/settings/SettingsPage.tsx`
- Create: `src/test/components/GoalStepper.test.tsx`

- [ ] **Step 1: GoalStepper 테스트 작성**

```tsx
// src/test/components/GoalStepper.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GoalStepper } from '../../components/settings/GoalStepper'

describe('GoalStepper', () => {
  it('현재 값을 표시한다', () => {
    render(<GoalStepper value={3} onChange={vi.fn()} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('+버튼 클릭 시 onChange(4)가 호출된다', () => {
    const onChange = vi.fn()
    render(<GoalStepper value={3} onChange={onChange} />)
    fireEvent.click(screen.getByText('+'))
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('-버튼 클릭 시 onChange(2)가 호출된다', () => {
    const onChange = vi.fn()
    render(<GoalStepper value={3} onChange={onChange} />)
    fireEvent.click(screen.getByText('−'))
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('최솟값(1)에서 - 버튼이 비활성화된다', () => {
    const onChange = vi.fn()
    render(<GoalStepper value={1} onChange={onChange} />)
    fireEvent.click(screen.getByText('−'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('최댓값(7)에서 + 버튼이 비활성화된다', () => {
    const onChange = vi.fn()
    render(<GoalStepper value={7} onChange={onChange} />)
    fireEvent.click(screen.getByText('+'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/test/components/GoalStepper.test.tsx
```

Expected: FAIL

- [ ] **Step 3: GoalStepper 구현**

```tsx
// src/components/settings/GoalStepper.tsx
type GoalStepperProps = {
  value: number
  onChange: (v: number) => void
}

export function GoalStepper({ value, onChange }: GoalStepperProps) {
  const btnStyle = (disabled: boolean) => ({
    width: '28px', height: '28px', borderRadius: '50%',
    background: 'var(--border)', border: 'none',
    color: disabled ? 'var(--text-muted)' : 'var(--blue)',
    fontSize: '16px', cursor: disabled ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <button
        style={btnStyle(value <= 1)}
        onClick={() => value > 1 && onChange(value - 1)}
      >
        −
      </button>
      <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--blue)', minWidth: '20px', textAlign: 'center' }}>
        {value}
      </span>
      <button
        style={btnStyle(value >= 7)}
        onClick={() => value < 7 && onChange(value + 1)}
      >
        +
      </button>
    </div>
  )
}
```

- [ ] **Step 4: ResetDataButton 구현**

```tsx
// src/components/settings/ResetDataButton.tsx
import { useState } from 'react'
import { ConfirmModal } from '../shared/ConfirmModal'

type ResetDataButtonProps = {
  onReset: () => void
}

export function ResetDataButton({ onReset }: ResetDataButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        style={{
          width: '100%', padding: '13px',
          borderRadius: '12px', border: '1px solid rgba(239,68,68,0.3)',
          background: 'rgba(239,68,68,0.05)', color: 'var(--danger)',
          cursor: 'pointer', fontSize: '13px', fontWeight: 600,
        }}
      >
        모든 기록 초기화
      </button>
      {showConfirm && (
        <ConfirmModal
          message="모든 운동 기록이 삭제됩니다. 되돌릴 수 없어요."
          onConfirm={() => { onReset(); setShowConfirm(false) }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 5: SettingsPage 조합**

```tsx
// src/components/settings/SettingsPage.tsx
import { useAppContext } from '../../context/AppContext'
import { GoalStepper } from './GoalStepper'
import { ResetDataButton } from './ResetDataButton'

const groupStyle = {
  background: 'var(--surface)',
  border: '1px solid #222',
  borderRadius: '14px',
  overflow: 'hidden' as const,
}

const groupLabelStyle = {
  fontSize: '10px', color: 'var(--text-muted)',
  padding: '10px 14px 4px', textTransform: 'uppercase' as const, letterSpacing: '0.8px',
}

const rowStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '12px 14px', borderTop: '1px solid var(--border-subtle)',
}

export function SettingsPage() {
  const { settings, updateWeeklyGoal, stats, deleteAllRecords } = useAppContext()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>설정</h1>

      {/* 목표 */}
      <div style={groupStyle}>
        <div style={groupLabelStyle}>목표</div>
        <div style={rowStyle}>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text)' }}>주간 운동 목표</p>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>이번 주 달성 현황에 반영됩니다</p>
          </div>
          <GoalStepper value={settings.weeklyGoal} onChange={updateWeeklyGoal} />
        </div>
      </div>

      {/* 데이터 */}
      <div style={groupStyle}>
        <div style={groupLabelStyle}>데이터</div>
        <div style={rowStyle}>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text)' }}>저장 방식</p>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>이 기기 로컬에만 저장됩니다</p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>로컬</span>
        </div>
        <div style={rowStyle}>
          <p style={{ fontSize: '13px', color: 'var(--text)' }}>총 기록 수</p>
          <span style={{ fontSize: '13px', color: 'var(--blue)', fontWeight: 600 }}>{stats.totalCount}회</span>
        </div>
      </div>

      {/* 로컬 저장 안내 */}
      <div style={{
        background: 'var(--surface-deep)', border: '1px solid var(--border-subtle)',
        borderRadius: '12px', padding: '12px 14px',
      }}>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          기록은 이 기기의 브라우저에만 저장됩니다. 브라우저 데이터를 삭제하거나 기기를 변경하면 기록이 사라질 수 있습니다.
        </p>
      </div>

      {/* 앱 정보 */}
      <div style={groupStyle}>
        <div style={groupLabelStyle}>앱 정보</div>
        <div style={rowStyle}>
          <p style={{ fontSize: '13px', color: 'var(--text)' }}>버전</p>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>1.0.0</span>
        </div>
      </div>

      <ResetDataButton onReset={deleteAllRecords} />

      <p style={{ textAlign: 'center', fontSize: '10px', color: '#2a2a2a', paddingBottom: '4px' }}>
        my-gym · 로컬 저장
      </p>
    </div>
  )
}
```

- [ ] **Step 6: 테스트 실행**

```bash
npx vitest run src/test/components/GoalStepper.test.tsx
```

Expected: 모든 테스트 PASS

- [ ] **Step 7: 브라우저 확인**

```bash
npm run dev
```

Expected: 설정 탭에서 주간 목표 스테퍼 동작, 데이터 초기화 확인 모달 동작.

- [ ] **Step 8: 커밋**

```bash
git add src/components/settings/ src/test/components/GoalStepper.test.tsx
git commit -m "feat: 설정 화면 구현 (주간 목표, 데이터 초기화)"
```

---

## Task 8: PWA 아이콘 및 최종 정리

**Files:**
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Modify: `index.html`

- [ ] **Step 1: PWA 아이콘 생성**

192×192, 512×512 PNG 파일을 준비한다. 단색 배경(`#0f0f0f`)에 파란 덤벨 아이콘 또는 텍스트 "MG"를 배치한 이미지.

임시 아이콘이 필요하다면 아래 스크립트로 플레이스홀더 생성:

```bash
# Node.js로 간단한 SVG → PNG 변환 (sharp 패키지 없을 경우 Canva 등 외부 도구 사용)
# 또는 public/icons/ 에 적절한 PNG 파일을 직접 배치
mkdir -p public/icons
```

- [ ] **Step 2: index.html 메타태그 추가**

```html
<!-- index.html의 <head> 안에 추가 -->
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="my-gym">
<meta name="theme-color" content="#0f0f0f">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
```

- [ ] **Step 3: 전체 테스트 실행**

```bash
npx vitest run
```

Expected: 모든 테스트 PASS

- [ ] **Step 4: 빌드 확인**

```bash
npm run build
```

Expected: `dist/` 생성, 오류 없음.

- [ ] **Step 5: 최종 커밋**

```bash
git add public/ index.html
git commit -m "feat: PWA 아이콘 및 메타태그 추가"
```

---

## 스펙 커버리지 검토

| PRD 기능 | 구현 태스크 |
|---------|-----------|
| A. 오늘 운동 기록 버튼 | Task 5 (RecordButton, HomePage) |
| B. 오늘 기록 상태 표시 | Task 5 (TodayHeader) |
| C. 주간 목표 설정 | Task 7 (GoalStepper, SettingsPage) |
| D. 최근 7일 운동 상태 | Task 5 (WeekDots) |
| E. 이번 주/달 통계 | Task 5 (StatsCards, WeeklyGoalBar) |
| F. 수동 기록 추가 | Task 6 (ManualAddButton, DatePickerModal) |
| G. 기록 삭제 | Task 6 (RecordItem, ConfirmModal) |
| H. 기록 히스토리 | Task 6 (RecordsPage, RecordList) |
| I. 미니 캘린더 | Task 5 (MiniCalendar) |
| 로컬 저장 (IndexedDB) | Task 3 (database.ts) |
| PWA 지원 | Task 1 (vite.config.ts), Task 8 |
| 중복 기록 방지 | Task 3 (useWorkoutRecords) |
| 데이터 초기화 | Task 7 (ResetDataButton) |
| 오프라인 동작 | Task 1 (PWA service worker) |
| Asia/Seoul 타임존 | Task 2 (date.ts) |
