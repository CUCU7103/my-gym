# 프론트엔드 백엔드 연동 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 IndexedDB 기반 React 앱을 Express API 서버와 연동한다. Dexie를 제거하고 API 클라이언트 레이어와 JWT 인증 흐름(AuthContext + 로그인 화면)을 추가한다.

**Architecture:** `frontend/src/api/`에 서버 통신 함수를 모아두고, `AuthContext`가 액세스 토큰(메모리)과 로그인 상태를 관리한다. `useWorkoutRecords`와 `useSettings`는 IndexedDB 호출을 API 호출로 교체한다. UI 컴포넌트는 변경하지 않는다.

**Tech Stack:** React 19, TypeScript, Vite, 기존 UI 컴포넌트 그대로 재사용. 외부 HTTP 라이브러리 불사용 (native fetch).

**사전 조건:** `2026-04-13-backend-infra.md` 계획이 완료되어 백엔드가 실행 중이어야 한다.

---

## 파일 구조 (frontend/ 내부)

```
frontend/src/
├── api/
│   ├── client.ts          ← fetch 래퍼 (토큰 자동 첨부 + 401 시 갱신)
│   ├── auth.ts            ← register, login, refresh, logout API 함수
│   ├── records.ts         ← getRecords, addRecord, deleteRecord, deleteAllRecords
│   └── settings.ts        ← getSettings, updateSettings
├── context/
│   ├── AppContext.tsx      ← 수정: useSettings/useWorkoutRecords를 API 버전으로 교체
│   └── AuthContext.tsx     ← 신규: 로그인 상태 + 토큰 관리
├── hooks/
│   ├── useWorkoutRecords.ts  ← 수정: IndexedDB → API 호출
│   └── useSettings.ts        ← 수정: IndexedDB → API 호출
├── components/
│   └── auth/
│       └── AuthPage.tsx    ← 신규: 로그인/회원가입 화면
└── db/
    └── database.ts         ← 삭제
```

---

## Task 1: 환경변수 설정 + Dexie 의존성 제거

**Files:**
- Create: `frontend/.env.local`
- Modify: `frontend/package.json` (dexie 제거)

- [ ] **Step 1: `frontend/.env.local` 작성**

```bash
cat > /Users/joongyu/toy-project/my-gym/frontend/.env.local << 'EOF'
# 로컬 개발 시 백엔드 주소 (docker compose up 후)
VITE_API_BASE_URL=http://localhost:3000
EOF
```

- [ ] **Step 2: dexie 패키지 제거**

```bash
cd /Users/joongyu/toy-project/my-gym/frontend
npm uninstall dexie
```

- [ ] **Step 3: `.env.local`을 `.gitignore`에 추가 확인**

```bash
grep -q "\.env\.local" /Users/joongyu/toy-project/my-gym/frontend/.gitignore || \
  echo ".env.local" >> /Users/joongyu/toy-project/my-gym/frontend/.gitignore
```

- [ ] **Step 4: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add frontend/package.json frontend/package-lock.json frontend/.gitignore
git commit -m "chore: 프론트엔드에서 Dexie 의존성 제거"
```

---

## Task 2: API 클라이언트 — `client.ts`

**Files:**
- Create: `frontend/src/api/client.ts`

- [ ] **Step 1: `frontend/src/api/client.ts` 작성**

```typescript
// frontend/src/api/client.ts
// 모든 API 호출의 기반이 되는 fetch 래퍼.
// 액세스 토큰 자동 첨부 + 401 응답 시 토큰 갱신 후 1회 재시도를 처리한다.

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string

// 현재 액세스 토큰을 앱 전역에서 공유 (AuthContext에서 설정)
let _accessToken: string | null = null

export function setAccessToken(token: string | null) {
  _accessToken = token
}

export function getAccessToken(): string | null {
  return _accessToken
}

// 리프레시 토큰으로 새 액세스 토큰을 가져오는 함수
async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',  // httpOnly 쿠키 자동 첨부
    })
    if (!res.ok) return null
    const data = await res.json() as { accessToken: string }
    setAccessToken(data.accessToken)
    return data.accessToken
  } catch {
    return null
  }
}

// API 요청의 공통 에러 타입
export type ApiError = {
  error: string
  message: string
}

// fetch 래퍼 — 토큰 자동 첨부, 401 시 갱신 후 재시도
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`

  // 헤더 조립: 토큰이 있으면 Authorization 헤더 추가
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }
  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`
  }

  let res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',  // 쿠키 전송 (리프레시 토큰용)
  })

  // 401이면 토큰 갱신 후 1회 재시도
  if (res.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(url, { ...options, headers, credentials: 'include' })
    }
  }

  if (!res.ok) {
    const err = await res.json() as ApiError
    throw err
  }

  // 204 No Content 응답은 빈 객체 반환
  if (res.status === 204) return {} as T
  return res.json() as Promise<T>
}
```

파일 저장: `frontend/src/api/client.ts`

- [ ] **Step 2: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add frontend/src/api/client.ts
git commit -m "feat: API fetch 래퍼 추가 (토큰 자동 첨부 + 갱신)"
```

---

## Task 3: 인증 API 함수 (`auth.ts`)

**Files:**
- Create: `frontend/src/api/auth.ts`

- [ ] **Step 1: `frontend/src/api/auth.ts` 작성**

```typescript
// frontend/src/api/auth.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL as string

export type AuthUser = {
  userId: string
  email: string
}

export type LoginResponse = {
  accessToken: string
}

// 회원가입: 이메일 + 비밀번호 → { userId, email }
export async function register(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  })
  const data = await res.json()
  if (!res.ok) throw data
  return data as AuthUser
}

// 로그인: 이메일 + 비밀번호 → { accessToken }
// 리프레시 토큰은 서버가 httpOnly 쿠키로 자동 설정
export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  })
  const data = await res.json()
  if (!res.ok) throw data
  return data as LoginResponse
}

// 토큰 갱신: 쿠키의 리프레시 토큰 → 새 액세스 토큰
export async function refreshToken(): Promise<LoginResponse | null> {
  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) return null
  return res.json() as Promise<LoginResponse>
}

// 로그아웃: 리프레시 토큰 쿠키 삭제
export async function logout(): Promise<void> {
  await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}
```

파일 저장: `frontend/src/api/auth.ts`

- [ ] **Step 2: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add frontend/src/api/auth.ts
git commit -m "feat: 인증 API 함수 추가 (register/login/refresh/logout)"
```

---

## Task 4: 기록 + 설정 API 함수

**Files:**
- Create: `frontend/src/api/records.ts`
- Create: `frontend/src/api/settings.ts`

- [ ] **Step 1: `frontend/src/api/records.ts` 작성**

```typescript
// frontend/src/api/records.ts
import { apiFetch } from './client'
import type { WorkoutRecord } from '../types'

export type RecordFilter = 'all' | 'week' | 'month'

// 운동 기록 전체 조회 (필터 선택)
export async function getRecords(filter: RecordFilter = 'all'): Promise<WorkoutRecord[]> {
  const query = filter !== 'all' ? `?filter=${filter}` : ''
  return apiFetch<WorkoutRecord[]>(`/api/records${query}`)
}

// 운동 기록 추가
export async function addRecord(
  recordedDate: string,
  source: 'today_button' | 'manual',
  label?: string
): Promise<WorkoutRecord> {
  return apiFetch<WorkoutRecord>('/api/records', {
    method: 'POST',
    body: JSON.stringify({ recordedDate, source, label }),
  })
}

// 특정 기록 삭제
export async function deleteRecord(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/records/${id}`, { method: 'DELETE' })
}

// 전체 기록 삭제
export async function deleteAllRecords(): Promise<void> {
  await apiFetch<{ ok: boolean }>('/api/records', { method: 'DELETE' })
}
```

파일 저장: `frontend/src/api/records.ts`

- [ ] **Step 2: `frontend/src/api/settings.ts` 작성**

```typescript
// frontend/src/api/settings.ts
import { apiFetch } from './client'
import type { UserSettings } from '../types'

// 사용자 설정 조회
export async function getSettings(): Promise<UserSettings> {
  return apiFetch<UserSettings>('/api/settings')
}

// 주간 목표 업데이트
export async function updateSettings(weeklyGoal: number): Promise<UserSettings> {
  return apiFetch<UserSettings>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify({ weeklyGoal }),
  })
}
```

파일 저장: `frontend/src/api/settings.ts`

- [ ] **Step 3: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add frontend/src/api/records.ts frontend/src/api/settings.ts
git commit -m "feat: 기록 및 설정 API 함수 추가"
```

---

## Task 5: AuthContext + 로그인/회원가입 화면

**Files:**
- Create: `frontend/src/context/AuthContext.tsx`
- Create: `frontend/src/components/auth/AuthPage.tsx`

- [ ] **Step 1: `frontend/src/context/AuthContext.tsx` 작성**

```typescript
// frontend/src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { login as apiLogin, register as apiRegister, logout as apiLogout, refreshToken } from '../api/auth'
import { setAccessToken } from '../api/client'

type AuthUser = {
  id: string
  email: string
}

type AuthContextValue = {
  isLoggedIn: boolean
  user: AuthUser | null
  // 로그인: 성공 시 resolve, 실패 시 에러 throw
  login: (email: string, password: string) => Promise<void>
  // 회원가입 후 자동 로그인
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  // 앱 시작 시 리프레시 토큰으로 자동 로그인 시도
  useEffect(() => {
    refreshToken()
      .then((res) => {
        if (res) {
          setAccessToken(res.accessToken)
          // JWT 페이로드에서 userId 추출 (디코딩, 검증 불필요)
          const payload = JSON.parse(atob(res.accessToken.split('.')[1])) as { userId: string }
          setUser({ id: payload.userId, email: '' })
        }
      })
      .finally(() => setIsInitializing(false))
  }, [])

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password)
    setAccessToken(res.accessToken)
    const payload = JSON.parse(atob(res.accessToken.split('.')[1])) as { userId: string }
    setUser({ id: payload.userId, email })
  }

  const register = async (email: string, password: string) => {
    await apiRegister(email, password)
    // 회원가입 후 자동 로그인
    await login(email, password)
  }

  const logout = async () => {
    await apiLogout()
    setAccessToken(null)
    setUser(null)
  }

  // 초기화 중에는 아무것도 렌더링하지 않음 (깜빡임 방지)
  if (isInitializing) return null

  return (
    <AuthContext.Provider value={{ isLoggedIn: user !== null, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

파일 저장: `frontend/src/context/AuthContext.tsx`

- [ ] **Step 2: `frontend/src/components/auth/AuthPage.tsx` 작성**

```typescript
// frontend/src/components/auth/AuthPage.tsx
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import type { ApiError } from '../../api/client'

// 로그인/회원가입 화면 — 미로그인 시 표시
export function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password)
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError
      setError(apiErr?.message ?? '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'var(--bg)',
    }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
        my-gym
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 32 }}>
        운동 출석 기록 앱
      </p>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ marginBottom: 12 }}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <input
            type="password"
            placeholder="비밀번호 (8자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 14,
            border: 'none',
            background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </form>

      <button
        onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }}
        style={{
          marginTop: 20,
          background: 'none',
          border: 'none',
          color: 'var(--blue)',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
      </button>
    </div>
  )
}
```

파일 저장: `frontend/src/components/auth/AuthPage.tsx`

- [ ] **Step 3: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add frontend/src/context/AuthContext.tsx frontend/src/components/auth/
git commit -m "feat: JWT 인증 컨텍스트 및 로그인/회원가입 화면 추가"
```

---

## Task 6: `useSettings` — IndexedDB → API 교체

**Files:**
- Modify: `frontend/src/hooks/useSettings.ts`

- [ ] **Step 1: `frontend/src/hooks/useSettings.ts` 전체 교체**

```typescript
// frontend/src/hooks/useSettings.ts
import { useState, useEffect, useCallback } from 'react'
import { getSettings, updateSettings } from '../api/settings'
import type { UserSettings } from '../types'

// 사용자 설정 관리 훅 — 서버 API에서 설정을 읽고 업데이트한다
export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>({
    weeklyGoal: 3,
    timezone: 'Asia/Seoul',
  })

  // 마운트 시 서버에서 설정 로드
  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch((err) => console.error('설정 로드 실패:', err))
  }, [])

  /**
   * 주간 운동 목표 업데이트
   * @param goal 1~7 범위로 자동 클램핑
   */
  const updateWeeklyGoal = useCallback(async (goal: number) => {
    const clamped = Math.max(1, Math.min(7, goal))
    try {
      const updated = await updateSettings(clamped)
      setSettings(updated)
    } catch (err) {
      console.error('설정 업데이트 실패:', err)
    }
  }, [])

  return { settings, updateWeeklyGoal }
}
```

파일 저장: `frontend/src/hooks/useSettings.ts`

- [ ] **Step 2: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add frontend/src/hooks/useSettings.ts
git commit -m "feat: useSettings IndexedDB → API 호출로 교체"
```

---

## Task 7: `useWorkoutRecords` — IndexedDB → API 교체

**Files:**
- Modify: `frontend/src/hooks/useWorkoutRecords.ts`

- [ ] **Step 1: `frontend/src/hooks/useWorkoutRecords.ts` 전체 교체**

```typescript
// frontend/src/hooks/useWorkoutRecords.ts
import { useState, useEffect, useCallback } from 'react'
import { getRecords, addRecord, deleteRecord as apiDeleteRecord, deleteAllRecords as apiDeleteAllRecords } from '../api/records'
import type { WorkoutRecord, WorkoutStats } from '../types'
import {
  getTodayKST,
  isThisWeekKST,
  isThisMonthKST,
  getRecent7DayDates,
} from '../utils/date'

/** 기록 배열과 주간 목표를 받아 파생 통계를 계산 (변경 없음) */
function calcStats(records: WorkoutRecord[], weeklyGoal: number): WorkoutStats {
  const today = getTodayKST()
  const recent7 = getRecent7DayDates()
  const dateSet = new Set(records.map(r => r.recordedDate))

  const weeklyCount = records.filter(r => isThisWeekKST(r.recordedDate)).length
  const monthlyCount = records.filter(r => isThisMonthKST(r.recordedDate)).length
  const todaySessionCount = records.filter(r => r.recordedDate === today).length

  return {
    weeklyCount,
    monthlyCount,
    totalCount: records.length,
    recent7Days: recent7.map(d => dateSet.has(d)),
    weeklyGoalProgress: weeklyGoal > 0 ? weeklyCount / weeklyGoal : 0,
    isTodayRecorded: todaySessionCount > 0,
    todaySessionCount,
  }
}

/** 운동 기록 CRUD 훅 — 서버 API를 통해 데이터를 읽고 씀 */
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

  /** 서버에서 전체 기록을 불러와 상태 갱신 */
  const refresh = useCallback(async () => {
    try {
      const all = await getRecords()
      // 최신 시각 순으로 내림차순 정렬 (서버에서 이미 정렬되지만 보장)
      all.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
      setRecords(all)
      setStats(calcStats(all, weeklyGoal))
    } catch (err) {
      console.error('기록 로드 실패:', err)
    }
  }, [weeklyGoal])

  useEffect(() => { refresh() }, [refresh])

  /**
   * 오늘 날짜로 운동 세션 추가
   * @returns 'recorded' — 성공, 'duplicate' — 중복 날짜
   */
  const recordToday = useCallback(async (label?: string): Promise<'recorded' | 'duplicate'> => {
    const today = getTodayKST()
    try {
      await addRecord(today, 'today_button', label)
      await refresh()
      return 'recorded'
    } catch (err: unknown) {
      const apiErr = err as { error?: string }
      if (apiErr?.error === 'DUPLICATE_DATE') return 'duplicate'
      throw err
    }
  }, [refresh])

  /**
   * 오늘 날짜 운동 기록 전체 취소
   * @returns 'cancelled' — 성공, 'not_found' — 오늘 기록 없음
   */
  const cancelToday = useCallback(async (): Promise<'cancelled' | 'not_found'> => {
    const today = getTodayKST()
    const todayRecords = records.filter(r => r.recordedDate === today)
    if (todayRecords.length === 0) return 'not_found'

    await Promise.all(todayRecords.map(r => apiDeleteRecord(r.id)))
    await refresh()
    return 'cancelled'
  }, [records, refresh])

  /**
   * 특정 날짜로 운동 세션 수동 추가
   * @returns 'recorded' — 성공, 'future' — 미래 날짜, 'duplicate' — 중복
   */
  const addManual = useCallback(async (date: string, label?: string): Promise<'recorded' | 'future' | 'duplicate'> => {
    const today = getTodayKST()
    if (date > today) return 'future'

    try {
      await addRecord(date, 'manual', label)
      await refresh()
      return 'recorded'
    } catch (err: unknown) {
      const apiErr = err as { error?: string }
      if (apiErr?.error === 'DUPLICATE_DATE') return 'duplicate'
      throw err
    }
  }, [refresh])

  /** ID로 특정 운동 기록 삭제 */
  const deleteRecord = useCallback(async (id: string) => {
    await apiDeleteRecord(id)
    await refresh()
  }, [refresh])

  /** 모든 운동 기록 삭제 */
  const deleteAllRecords = useCallback(async () => {
    await apiDeleteAllRecords()
    await refresh()
  }, [refresh])

  return { records, stats, recordToday, cancelToday, addManual, deleteRecord, deleteAllRecords }
}
```

파일 저장: `frontend/src/hooks/useWorkoutRecords.ts`

- [ ] **Step 2: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add frontend/src/hooks/useWorkoutRecords.ts
git commit -m "feat: useWorkoutRecords IndexedDB → API 호출로 교체"
```

---

## Task 8: `database.ts` 삭제 + `App.tsx` 수정

**Files:**
- Delete: `frontend/src/db/database.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: `database.ts` 삭제**

```bash
rm /Users/joongyu/toy-project/my-gym/frontend/src/db/database.ts
```

- [ ] **Step 2: `frontend/src/App.tsx` 수정 — AuthProvider 및 AuthPage 추가**

기존 `frontend/src/App.tsx`:
```typescript
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

교체 후 `frontend/src/App.tsx`:
```typescript
// frontend/src/App.tsx
import { AppProvider, useAppContext } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthPage } from './components/auth/AuthPage'
import { TabBar } from './components/TabBar'
import { HomePage } from './components/home/HomePage'
import { RecordsPage } from './components/records/RecordsPage'
import { SettingsPage } from './components/settings/SettingsPage'

/** 앱 실제 컨텐츠 — 로그인 상태일 때만 표시 */
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

/** 인증 상태에 따라 로그인 화면 또는 앱 화면을 표시 */
function AuthGate() {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn) return <AuthPage />
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

/** 앱 루트 */
export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
```

파일 저장: `frontend/src/App.tsx`

- [ ] **Step 3: TypeScript 빌드 확인**

```bash
cd /Users/joongyu/toy-project/my-gym/frontend
npm run build 2>&1 | tail -20
# 예상: 빌드 성공, 에러 없음
```

- [ ] **Step 4: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add frontend/src/App.tsx
git rm frontend/src/db/database.ts
git commit -m "feat: AuthProvider/AuthGate 추가, IndexedDB 모듈 삭제"
```

---

## Task 9: 기존 테스트 수정 (IndexedDB 모킹 제거)

**Files:**
- Modify: `frontend/src/test/setup.ts`
- Modify: `frontend/src/test/hooks/useWorkoutRecords.test.ts`
- Modify: `frontend/src/test/hooks/useSettings.test.ts`

- [ ] **Step 1: `frontend/src/test/setup.ts` 수정**

기존 파일에 Dexie 모킹이 있다면 제거한다. 현재 내용 확인:

```bash
cat /Users/joongyu/toy-project/my-gym/frontend/src/test/setup.ts
```

기존 내용에서 Dexie 관련 mock을 제거하고 API mock으로 교체:

```typescript
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
```

파일 저장: `frontend/src/test/setup.ts`

- [ ] **Step 2: `frontend/src/test/hooks/useWorkoutRecords.test.ts` 수정**

기존 테스트에서 Dexie 직접 참조를 제거하고 API mock 활용:

```typescript
// frontend/src/test/hooks/useWorkoutRecords.test.ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWorkoutRecords } from '../../hooks/useWorkoutRecords'
import * as recordsApi from '../../api/records'

describe('useWorkoutRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(recordsApi.getRecords).mockResolvedValue([])
  })

  it('초기 stats는 모두 0이다', async () => {
    const { result } = renderHook(() => useWorkoutRecords(3))
    // refresh() 비동기 완료 대기
    await act(async () => {})
    expect(result.current.stats.weeklyCount).toBe(0)
    expect(result.current.stats.isTodayRecorded).toBe(false)
  })

  it('recordToday 호출 시 addRecord API를 호출한다', async () => {
    const mockRecord = {
      id: 'uuid-1',
      recordedAt: '2026-04-13T10:00:00.000Z',
      recordedDate: '2026-04-13',
      createdAt: '2026-04-13T10:00:00.000Z',
      source: 'today_button' as const,
    }
    vi.mocked(recordsApi.addRecord).mockResolvedValueOnce(mockRecord)
    vi.mocked(recordsApi.getRecords).mockResolvedValueOnce([]).mockResolvedValueOnce([mockRecord])

    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})

    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.recordToday()
    })

    expect(outcome).toBe('recorded')
    expect(recordsApi.addRecord).toHaveBeenCalledWith('2026-04-13', 'today_button', undefined)
  })

  it('recordToday 시 DUPLICATE_DATE 에러면 "duplicate" 반환', async () => {
    vi.mocked(recordsApi.addRecord).mockRejectedValueOnce({ error: 'DUPLICATE_DATE', message: '중복' })

    const { result } = renderHook(() => useWorkoutRecords(3))
    await act(async () => {})

    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.recordToday()
    })

    expect(outcome).toBe('duplicate')
  })
})
```

파일 저장: `frontend/src/test/hooks/useWorkoutRecords.test.ts`

- [ ] **Step 3: `frontend/src/test/hooks/useSettings.test.ts` 수정**

```typescript
// frontend/src/test/hooks/useSettings.test.ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSettings } from '../../hooks/useSettings'
import * as settingsApi from '../../api/settings'

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(settingsApi.getSettings).mockResolvedValue({ weeklyGoal: 3, timezone: 'Asia/Seoul' })
  })

  it('초기값으로 weeklyGoal=3을 갖는다', async () => {
    const { result } = renderHook(() => useSettings())
    await act(async () => {})
    expect(result.current.settings.weeklyGoal).toBe(3)
  })

  it('updateWeeklyGoal 호출 시 updateSettings API를 호출한다', async () => {
    vi.mocked(settingsApi.updateSettings).mockResolvedValueOnce({ weeklyGoal: 5, timezone: 'Asia/Seoul' })

    const { result } = renderHook(() => useSettings())
    await act(async () => {})

    await act(async () => {
      await result.current.updateWeeklyGoal(5)
    })

    expect(settingsApi.updateSettings).toHaveBeenCalledWith(5)
    expect(result.current.settings.weeklyGoal).toBe(5)
  })

  it('weeklyGoal은 1~7로 클램핑된다', async () => {
    vi.mocked(settingsApi.updateSettings).mockResolvedValueOnce({ weeklyGoal: 7, timezone: 'Asia/Seoul' })

    const { result } = renderHook(() => useSettings())
    await act(async () => {})

    await act(async () => {
      await result.current.updateWeeklyGoal(99) // 7로 클램핑
    })

    expect(settingsApi.updateSettings).toHaveBeenCalledWith(7)
  })
})
```

파일 저장: `frontend/src/test/hooks/useSettings.test.ts`

- [ ] **Step 4: 테스트 실행**

```bash
cd /Users/joongyu/toy-project/my-gym/frontend
npm test -- --run
# 예상: 모든 테스트 PASS
```

- [ ] **Step 5: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add frontend/src/test/
git commit -m "test: Dexie 모킹 제거, API 모킹으로 테스트 수정"
```

---

## Task 10: 통합 확인 (로컬 E2E)

- [ ] **Step 1: 백엔드 Docker Compose 실행 확인**

```bash
cd /Users/joongyu/toy-project/my-gym
docker compose up -d
sleep 5
curl http://localhost:3000/health
# 예상: {"ok":true}
```

- [ ] **Step 2: 프론트엔드 개발 서버 실행**

```bash
cd /Users/joongyu/toy-project/my-gym/frontend
npm run dev
# http://localhost:5173 열기
```

- [ ] **Step 3: 로그인 화면 → 회원가입 → 운동 기록 전체 흐름 수동 확인**

다음 흐름을 브라우저에서 순서대로 확인한다:
1. `http://localhost:5173` 접속 → 로그인 화면 표시
2. "계정이 없으신가요? 회원가입" 클릭
3. 이메일 + 비밀번호(8자↑) 입력 후 회원가입
4. 자동 로그인 → 홈 화면 표시
5. "오늘 운동 기록" 버튼 클릭 → 통계 업데이트 확인
6. 기록 탭 이동 → 기록 목록 확인
7. 설정 탭 이동 → 주간 목표 변경 확인
8. 페이지 새로고침 → 로그인 유지 (자동 토큰 갱신) 확인

- [ ] **Step 4: 최종 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add -A
git commit -m "feat: 프론트엔드 백엔드 연동 완료 (JWT 인증 + API 통신)"
```
