# 코드 구조 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AppContext 분리, API 클라이언트 통합, 공유 타입 분리, 백엔드 전역 에러 핸들러를 순차적으로 개선해 코드 결합도를 낮추고 중복을 제거한다.

**Architecture:**
- 프론트엔드: 단일 AppContext → SettingsContext + WorkoutContext 두 개로 분리. activeTab은 App 로컬 상태로 이동해 prop 드릴링(App→TabBar 1단계)으로 처리.
- 공유 타입: 루트 `shared/types.ts`에 WorkoutRecord·UserSettings 정의 후 tsconfig path alias(`@shared/types`)로 양쪽에서 참조.
- 백엔드: `asyncHandler` 래퍼 + 전역 `errorHandler` 미들웨어로 모든 라우트의 try-catch 제거.

**Tech Stack:** React 19, TypeScript 5.x, Vite 6, Vitest 3, Express 4, Jest 29, Zod 3

---

## 파일 변경 목록

### 신규 생성
| 파일 | 역할 |
|------|------|
| `shared/types.ts` | WorkoutRecord, UserSettings 공통 타입 |
| `frontend/src/context/SettingsContext.tsx` | 설정 Context + Provider + useSettingsContext 훅 |
| `frontend/src/context/WorkoutContext.tsx` | 운동 기록 Context + Provider + useWorkoutContext 훅 |
| `backend/src/errors/AppError.ts` | HTTP 상태 코드를 포함한 비즈니스 에러 클래스 |
| `backend/src/middleware/asyncHandler.ts` | async 라우트 핸들러 에러를 next()로 전달하는 래퍼 |
| `backend/src/middleware/errorHandler.ts` | 전역 에러 응답 미들웨어 |

### 수정
| 파일 | 변경 내용 |
|------|---------|
| `frontend/tsconfig.app.json` | paths에 `@shared/*` alias 추가 |
| `frontend/vite.config.ts` | resolve.alias에 `@shared` 경로 추가 |
| `backend/tsconfig.json` | paths에 `@shared/*` alias 추가 |
| `frontend/src/types/index.ts` | WorkoutRecord·UserSettings 제거, @shared/types re-export |
| `backend/src/types.ts` | WorkoutRecord·UserSettings 제거, @shared/types re-export |
| `frontend/src/context/AppContext.tsx` | 삭제 (SettingsContext·WorkoutContext로 대체) |
| `frontend/src/App.tsx` | activeTab 로컬 상태로 이동, Provider 구조 변경, TabBar에 props 전달 |
| `frontend/src/components/TabBar.tsx` | useAppContext 제거 → props(activeTab, onTabChange) 수신 |
| `frontend/src/components/home/HomePage.tsx` | useWorkoutContext + useSettingsContext 사용 |
| `frontend/src/components/records/RecordsPage.tsx` | useWorkoutContext 사용 |
| `frontend/src/components/settings/SettingsPage.tsx` | useSettingsContext + useWorkoutContext 사용 |
| `frontend/src/api/auth.ts` | login·register·logout을 apiFetch 기반으로 변경, BASE_URL 제거 |
| `backend/src/index.ts` | errorHandler 전역 미들웨어 등록 |
| `backend/src/routes/auth.ts` | asyncHandler 적용, try-catch 제거 |
| `backend/src/routes/records.ts` | asyncHandler 적용, try-catch 제거 |
| `backend/src/routes/settings.ts` | asyncHandler 적용, try-catch 제거 |

---

## Task 1: 공유 타입 분리 (shared/types.ts)

**Files:**
- Create: `shared/types.ts`
- Modify: `frontend/tsconfig.app.json`
- Modify: `frontend/vite.config.ts`
- Modify: `backend/tsconfig.json`
- Modify: `frontend/src/types/index.ts`
- Modify: `backend/src/types.ts`

### 왜 먼저 하는가
타입이 먼저 정착해야 이후 Context·라우트 변경 시 import 경로를 처음부터 올바르게 쓸 수 있다.

- [ ] **Step 1-1: shared/types.ts 생성**

프로젝트 루트(`my-gym/`)에 파일 생성:

```typescript
// shared/types.ts
// 프론트엔드와 백엔드가 공유하는 핵심 도메인 타입
// ActiveTab, WorkoutStats 등 프론트엔드 전용 타입은 각자 정의한다

export type WorkoutRecord = {
  id: string
  recordedAt: string    // ISO datetime (기록 생성 시각)
  recordedDate: string  // YYYY-MM-DD (Asia/Seoul 기준, 통계 계산 기준)
  createdAt: string     // ISO datetime
  source: 'today_button' | 'manual'
  label?: string        // 운동 종류 (선택 입력)
}

export type UserSettings = {
  weeklyGoal: number    // 1~7, 기본값 3
  timezone: 'Asia/Seoul'
}
```

- [ ] **Step 1-2: frontend tsconfig에 path alias 추가**

`frontend/tsconfig.app.json`의 `compilerOptions`에 아래 두 항목 추가:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 1-3: frontend vite.config.ts에 alias 추가**

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      selfDestroying: true,
    }),
  ],
  resolve: {
    alias: {
      // @shared/types → 루트의 shared/types.ts
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
})
```

- [ ] **Step 1-4: backend tsconfig에 path alias 추가**

`backend/tsconfig.json` 전체를 아래로 교체:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["../../shared/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 1-5: frontend types/index.ts 수정 — WorkoutRecord·UserSettings를 @shared에서 re-export**

```typescript
// src/types/index.ts
// WorkoutRecord·UserSettings는 shared/types.ts에서 관리된다
export type { WorkoutRecord, UserSettings } from '@shared/types'

export type ActiveTab = 'home' | 'records' | 'settings'

// 파생 통계 타입 — 프론트엔드 전용
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

- [ ] **Step 1-6: backend types.ts 수정 — @shared에서 re-export**

```typescript
// backend/src/types.ts
// 공통 타입은 shared/types.ts에서 관리한다
export type { WorkoutRecord, UserSettings } from '@shared/types'
```

- [ ] **Step 1-7: backend tsconfig path alias를 ts-node가 인식하게 tsconfig-paths 설치**

```bash
cd backend
npm install --save-dev tsconfig-paths
```

`backend/package.json`의 `"dev"` 스크립트를 확인하고, ts-node 실행 시 path alias가 동작하도록 수정:

```json
"scripts": {
  "dev": "ts-node -r tsconfig-paths/register src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "test": "jest",
  "migrate": "ts-node -r tsconfig-paths/register src/db/migrate.ts"
}
```

- [ ] **Step 1-8: 프론트엔드 타입 컴파일 확인**

```bash
cd frontend
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 1-9: 백엔드 타입 컴파일 확인**

```bash
cd backend
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 1-10: 커밋**

```bash
git add shared/types.ts frontend/tsconfig.app.json frontend/vite.config.ts backend/tsconfig.json frontend/src/types/index.ts backend/src/types.ts backend/package.json
git commit -m "refactor: WorkoutRecord·UserSettings 공유 타입을 shared/types.ts로 분리"
```

---

## Task 2: 백엔드 에러 핸들러 (AppError + asyncHandler + errorHandler)

**Files:**
- Create: `backend/src/errors/AppError.ts`
- Create: `backend/src/middleware/asyncHandler.ts`
- Create: `backend/src/middleware/errorHandler.ts`
- Modify: `backend/src/routes/auth.ts`
- Modify: `backend/src/routes/records.ts`
- Modify: `backend/src/routes/settings.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 2-1: AppError 클래스 생성**

```typescript
// backend/src/errors/AppError.ts
// HTTP 상태 코드와 에러 코드를 묶어 throw할 수 있는 비즈니스 에러 클래스
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly error: string,
    public readonly message: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}
```

- [ ] **Step 2-2: asyncHandler 미들웨어 생성**

```typescript
// backend/src/middleware/asyncHandler.ts
import type { Request, Response, NextFunction, RequestHandler } from 'express'

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>

// async 라우트 핸들러에서 발생한 에러를 next()로 전달한다
// 이를 통해 각 라우트에서 try-catch를 제거하고 전역 에러 핸들러에 위임한다
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
```

- [ ] **Step 2-3: errorHandler 전역 미들웨어 생성**

```typescript
// backend/src/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../errors/AppError'

// Express 전역 에러 핸들러 — 반드시 매개변수가 4개여야 Express가 에러 핸들러로 인식한다
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    // 비즈니스 에러: 정해진 상태 코드와 에러 코드로 응답
    res.status(err.status).json({ error: err.error, message: err.message })
  } else {
    // 예상치 못한 에러: 서버 로그에 기록 후 500 반환
    console.error('예상치 못한 서버 에러:', err)
    res.status(500).json({ error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' })
  }
}
```

- [ ] **Step 2-4: records.ts에 asyncHandler 적용 — try-catch 전부 제거**

```typescript
// backend/src/routes/records.ts
import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/client'
import { authMiddleware } from '../middleware/authMiddleware'
import { asyncHandler } from '../middleware/asyncHandler'
import { AppError } from '../errors/AppError'
import type { WorkoutRecord } from '../types'

export const recordsRoutes = Router()

recordsRoutes.use(authMiddleware)

// DB 행을 WorkoutRecord 타입으로 변환하는 헬퍼
function rowToRecord(row: Record<string, unknown>): WorkoutRecord {
  return {
    id: row.id as string,
    recordedAt: (row.recorded_at as Date).toISOString(),
    recordedDate: row.recorded_date as string,
    createdAt: (row.created_at as Date).toISOString(),
    source: row.source as 'today_button' | 'manual',
    label: (row.label as string | null) ?? undefined,
  }
}

// GET /api/records?filter=week|month
recordsRoutes.get('/', asyncHandler(async (req, res) => {
  const { filter } = req.query
  let whereClause = 'WHERE user_id = $1'

  if (filter === 'week') {
    whereClause += ` AND recorded_date >= DATE_TRUNC('week', CURRENT_DATE AT TIME ZONE 'Asia/Seoul')::DATE`
  } else if (filter === 'month') {
    whereClause += ` AND recorded_date >= DATE_TRUNC('month', CURRENT_DATE AT TIME ZONE 'Asia/Seoul')::DATE`
  }

  const result = await pool.query(
    `SELECT * FROM workout_records ${whereClause} ORDER BY recorded_at DESC`,
    [req.userId]
  )
  res.json(result.rows.map(rowToRecord))
}))

const addRecordSchema = z.object({
  recordedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다.'),
  source: z.enum(['today_button', 'manual']),
  label: z.string().max(100).optional(),
})

// POST /api/records
recordsRoutes.post('/', asyncHandler(async (req, res) => {
  const parsed = addRecordSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', parsed.error.errors[0].message)
  }
  const { recordedDate, source, label } = parsed.data
  const now = new Date()
  const id = crypto.randomUUID()

  const result = await pool.query(
    `INSERT INTO workout_records (id, user_id, recorded_at, recorded_date, created_at, source, label)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, req.userId, now, recordedDate, now, source, label ?? null]
  )
  res.status(201).json(rowToRecord(result.rows[0]))
}))

// DELETE /api/records/:id (특정 기록 삭제)
recordsRoutes.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const result = await pool.query(
    'DELETE FROM workout_records WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, req.userId]
  )
  if (result.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', '기록을 찾을 수 없습니다.')
  }
  res.json({ ok: true })
}))

// DELETE /api/records (전체 삭제)
recordsRoutes.delete('/', asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM workout_records WHERE user_id = $1', [req.userId])
  res.json({ ok: true })
}))
```

- [ ] **Step 2-5: settings.ts에 asyncHandler 적용**

```typescript
// backend/src/routes/settings.ts
import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/client'
import { authMiddleware } from '../middleware/authMiddleware'
import { asyncHandler } from '../middleware/asyncHandler'
import type { UserSettings } from '../types'

export const settingsRoutes = Router()

settingsRoutes.use(authMiddleware)

function rowToSettings(row: Record<string, unknown>): UserSettings {
  return {
    weeklyGoal: row.weekly_goal as number,
    timezone: 'Asia/Seoul',
  }
}

// GET /api/settings
settingsRoutes.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM user_settings WHERE user_id = $1',
    [req.userId]
  )
  if (result.rows.length === 0) {
    // 설정이 없으면 기본값으로 생성 후 반환
    const inserted = await pool.query(
      'INSERT INTO user_settings (user_id, weekly_goal) VALUES ($1, 3) RETURNING *',
      [req.userId]
    )
    res.json(rowToSettings(inserted.rows[0]))
    return
  }
  res.json(rowToSettings(result.rows[0]))
}))

const updateSettingsSchema = z.object({
  weeklyGoal: z.number().int().min(1).max(7),
})

// PUT /api/settings
settingsRoutes.put('/', asyncHandler(async (req, res) => {
  const parsed = updateSettingsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: '주간 목표는 1~7 사이여야 합니다.' })
    return
  }
  const { weeklyGoal } = parsed.data

  const result = await pool.query(
    `INSERT INTO user_settings (user_id, weekly_goal, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE SET weekly_goal = $2, updated_at = now()
     RETURNING *`,
    [req.userId, weeklyGoal]
  )
  res.json(rowToSettings(result.rows[0]))
}))
```

- [ ] **Step 2-6: auth.ts에 asyncHandler 적용**

```typescript
// backend/src/routes/auth.ts
import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { pool } from '../db/client'
import { asyncHandler } from '../middleware/asyncHandler'
import { AppError } from '../errors/AppError'

export const authRoutes = Router()

const BCRYPT_ROUNDS = 12
const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL = '7d'
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

const credentialsSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
})

const registerSchema = credentialsSchema.extend({
  inviteCode: z.string().min(1, '초대 코드를 입력하세요.'),
})

function generateAccessToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: ACCESS_TOKEN_TTL })
}

function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: REFRESH_TOKEN_TTL })
}

// POST /api/auth/register
authRoutes.post('/register', asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', parsed.error.errors[0].message)
  }
  const { email, password, inviteCode } = parsed.data

  const validCode = process.env.INVITE_CODE
  if (validCode && inviteCode !== validCode) {
    throw new AppError(403, 'INVALID_INVITE_CODE', '초대 코드가 올바르지 않습니다.')
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    throw new AppError(400, 'EMAIL_TAKEN', '이미 사용 중인 이메일입니다.')
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const result = await pool.query(
    'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
    [email, hashedPassword]
  )
  res.status(201).json({ userId: result.rows[0].id, email: result.rows[0].email })
}))

// POST /api/auth/login
authRoutes.post('/login', asyncHandler(async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', parsed.error.errors[0].message)
  }
  const { email, password } = parsed.data

  const result = await pool.query('SELECT id, password FROM users WHERE email = $1', [email])
  if (result.rows.length === 0) {
    throw new AppError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.')
  }

  const user = result.rows[0]
  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) {
    throw new AppError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.')
  }

  const accessToken = generateAccessToken(user.id)
  const refreshToken = generateRefreshToken(user.id)
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)

  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, refreshToken, expiresAt]
  )

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_TTL_MS,
  })

  res.json({ accessToken })
}))

// POST /api/auth/refresh
authRoutes.post('/refresh', asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken
  if (!token) {
    throw new AppError(401, 'UNAUTHORIZED', '리프레시 토큰이 없습니다.')
  }

  let payload: { userId: string }
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string }
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', '리프레시 토큰이 유효하지 않습니다.')
  }

  const result = await pool.query(
    'SELECT id FROM refresh_tokens WHERE token = $1 AND expires_at > now()',
    [token]
  )
  if (result.rows.length === 0) {
    throw new AppError(401, 'UNAUTHORIZED', '만료되거나 무효화된 토큰입니다.')
  }

  const accessToken = generateAccessToken(payload.userId)
  res.json({ accessToken })
}))

// POST /api/auth/logout
authRoutes.post('/logout', asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken
  if (token) {
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token])
  }
  res.clearCookie('refreshToken')
  res.json({ ok: true })
}))
```

- [ ] **Step 2-7: index.ts에 errorHandler 등록 — 반드시 모든 라우트 등록 뒤에 위치해야 함**

기존 `index.ts`의 마지막 부분(app.listen 이전)에 errorHandler import 및 등록 추가:

```typescript
// backend/src/index.ts 전체
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { authRoutes } from './routes/auth'
import { recordsRoutes } from './routes/records'
import { settingsRoutes } from './routes/settings'
import { errorHandler } from './middleware/errorHandler'

dotenv.config()

const app = express()
const PORT = process.env.PORT ?? 3000

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_ORIGIN ?? '',
].filter(Boolean)

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/debug-ip', (req, res) => {
  res.json({
    remoteAddress: req.socket.remoteAddress,
    xForwardedFor: req.headers['x-forwarded-for'],
    xRealIp: req.headers['x-real-ip'],
  })
})

const allowedIPs = process.env.ALLOWED_IPS
  ? new Set(process.env.ALLOWED_IPS.split(',').map((ip) => ip.trim()))
  : null

if (allowedIPs) {
  app.use((req, res, next) => {
    const forwarded = (req.headers['x-forwarded-for'] as string) ?? ''
    const clientIP = forwarded.split(',')[0].trim() || req.socket.remoteAddress || ''
    if (!allowedIPs.has(clientIP)) {
      res.status(403).json({ error: 'FORBIDDEN', message: '접근이 제한되어 있습니다.' })
      return
    }
    next()
  })
}

app.use('/api/auth', authRoutes)
app.use('/api/records', recordsRoutes)
app.use('/api/settings', settingsRoutes)

// 전역 에러 핸들러 — 반드시 모든 라우트 등록 후 마지막에 위치해야 한다
app.use(errorHandler)

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 서버 시작: http://localhost:${PORT}`)
  })
}

export { app }
```

- [ ] **Step 2-8: 백엔드 타입 컴파일 확인**

```bash
cd backend
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 2-9: 기존 백엔드 테스트 실행 — 에러 핸들러 적용 후에도 기존 동작 보장**

```bash
cd backend
npm test
```

Expected: 모든 기존 테스트 PASS

- [ ] **Step 2-10: 커밋**

```bash
git add backend/src/errors/AppError.ts backend/src/middleware/asyncHandler.ts backend/src/middleware/errorHandler.ts backend/src/routes/auth.ts backend/src/routes/records.ts backend/src/routes/settings.ts backend/src/index.ts
git commit -m "refactor: 백엔드 전역 에러 핸들러 도입 — asyncHandler + AppError로 try-catch 중복 제거"
```

---

## Task 3: API 클라이언트 통합 (auth.ts → apiFetch)

**Files:**
- Modify: `frontend/src/api/auth.ts`

- [ ] **Step 3-1: auth.ts를 apiFetch 기반으로 변경**

`refreshToken`은 앱 시작 시 조용한 재인증 용도로 null 반환 의미론이 다르므로 raw fetch 유지. 나머지 3개 함수는 apiFetch로 교체.

```typescript
// frontend/src/api/auth.ts
// refreshToken만 raw fetch — 앱 시작 시 조용한 재인증, 실패 시 null 반환
// login·register·logout은 apiFetch 사용 — 일반 API 호출과 동일하게 에러 처리
import { apiFetch } from './client'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export type AuthUser = {
  userId: string
  email: string
}

export type LoginResponse = {
  accessToken: string
}

// 회원가입: 이메일 + 비밀번호 + 초대 코드 → { userId, email }
export async function register(email: string, password: string, inviteCode: string): Promise<AuthUser> {
  return apiFetch<AuthUser>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, inviteCode }),
  })
}

// 로그인: 이메일 + 비밀번호 → { accessToken }
// 리프레시 토큰은 서버가 httpOnly 쿠키로 자동 설정
export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

// 토큰 갱신: 쿠키의 리프레시 토큰 → 새 액세스 토큰
// 앱 초기화 시 자동 로그인에 사용 — 실패해도 에러를 던지지 않고 null 반환
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
  await apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
}
```

- [ ] **Step 3-2: 프론트엔드 타입 컴파일 확인**

```bash
cd frontend
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3-3: 프론트엔드 테스트 실행**

```bash
cd frontend
npx vitest run
```

Expected: 모든 테스트 PASS

- [ ] **Step 3-4: 커밋**

```bash
git add frontend/src/api/auth.ts
git commit -m "refactor: api/auth.ts를 apiFetch 기반으로 통합 — login·register·logout 토큰 갱신 로직 일원화"
```

---

## Task 4: AppContext 분리 (SettingsContext + WorkoutContext)

**Files:**
- Create: `frontend/src/context/SettingsContext.tsx`
- Create: `frontend/src/context/WorkoutContext.tsx`
- Delete: `frontend/src/context/AppContext.tsx` (모든 소비자 마이그레이션 완료 후)
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/TabBar.tsx`
- Modify: `frontend/src/components/home/HomePage.tsx`
- Modify: `frontend/src/components/records/RecordsPage.tsx`
- Modify: `frontend/src/components/settings/SettingsPage.tsx`

- [ ] **Step 4-1: SettingsContext 생성**

```typescript
// frontend/src/context/SettingsContext.tsx
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { getSettings, updateSettings } from '../api/settings'
import type { UserSettings } from '../types'

type SettingsContextValue = {
  settings: UserSettings
  updateWeeklyGoal: (goal: number) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
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

  return (
    <SettingsContext.Provider value={{ settings, updateWeeklyGoal }}>
      {children}
    </SettingsContext.Provider>
  )
}

/** SettingsContext를 사용하는 커스텀 훅 */
export function useSettingsContext() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettingsContext must be used within SettingsProvider')
  return ctx
}
```

- [ ] **Step 4-2: WorkoutContext 생성**

WorkoutContext는 SettingsContext에서 weeklyGoal을 직접 읽어 의존성을 명시적으로 처리한다.

```typescript
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
```

- [ ] **Step 4-3: App.tsx 수정 — activeTab 로컬 상태, Provider 구조 변경**

```typescript
// frontend/src/App.tsx
import { useState } from 'react'
import { SettingsProvider } from './context/SettingsContext'
import { WorkoutProvider } from './context/WorkoutContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthPage } from './components/auth/AuthPage'
import { TabBar } from './components/TabBar'
import { HomePage } from './components/home/HomePage'
import { RecordsPage } from './components/records/RecordsPage'
import { SettingsPage } from './components/settings/SettingsPage'
import type { ActiveTab } from './types'

/** 앱 실제 컨텐츠 — 로그인 상태일 때만 표시 */
function AppContent() {
  // activeTab은 단순 UI 상태로 App에서 직접 관리 (Context 불필요)
  const [activeTab, setActiveTab] = useState<ActiveTab>('home')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <main style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 0' }}>
        {activeTab === 'home'     && <HomePage />}
        {activeTab === 'records'  && <RecordsPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

/** 인증 상태에 따라 로그인 화면 또는 앱 화면을 표시 */
function AuthGate() {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn) return <AuthPage />
  return (
    <SettingsProvider>
      <WorkoutProvider>
        <AppContent />
      </WorkoutProvider>
    </SettingsProvider>
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

- [ ] **Step 4-4: TabBar.tsx 수정 — props 수신으로 변경**

```typescript
// src/components/TabBar.tsx
import type { ActiveTab } from '../types'

type TabBarProps = {
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
}

const TABS: { id: ActiveTab; label: string; icon: string }[] = [
  { id: 'home',     label: '홈',   icon: '🏠' },
  { id: 'records',  label: '기록', icon: '📋' },
  { id: 'settings', label: '설정', icon: '⚙️' },
]

/** 하단 고정 탭 바 - 화면 전환 네비게이션 담당 */
export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-around',
      padding: '10px 0 max(12px, env(safe-area-inset-bottom))',
      background: 'var(--surface-deep)',
      borderTop: '1px solid var(--border-subtle)',
      flexShrink: 0,
    }}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
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

- [ ] **Step 4-5: HomePage.tsx 수정 — useWorkoutContext + useSettingsContext 사용**

```typescript
// src/components/home/HomePage.tsx
import { useState, useCallback, useMemo } from 'react'
import { useWorkoutContext } from '../../context/WorkoutContext'
import { useSettingsContext } from '../../context/SettingsContext'
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
  const { stats, records, recordToday, cancelToday, addManual } = useWorkoutContext()
  const { settings } = useSettingsContext()
  const [toast, setToast] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showSessionInput, setShowSessionInput] = useState(false)

  const handleRecord = useCallback(() => {
    if (stats.isTodayRecorded) {
      setShowCancelConfirm(true)
    } else {
      setShowSessionInput(true)
    }
  }, [stats.isTodayRecorded])

  const handleAddSession = useCallback(() => {
    setShowSessionInput(true)
  }, [])

  const handleSessionConfirm = useCallback(async (label: string) => {
    setShowSessionInput(false)
    try {
      await recordToday(label || undefined)
    } catch {
      setToast('기록 중 오류가 발생했어요. 다시 시도해주세요')
    }
  }, [recordToday])

  const handleCancelConfirm = useCallback(async () => {
    setShowCancelConfirm(false)
    try {
      const result = await cancelToday()
      if (result === 'cancelled') setToast('오늘 운동 기록을 취소했어요')
    } catch {
      setToast('취소 중 오류가 발생했어요. 다시 시도해주세요')
    }
  }, [cancelToday])

  const handleDateSelect = useCallback(async (date: string) => {
    const today = getTodayKST()
    if (date < today) {
      try {
        const result = await addManual(date)
        if (result === 'recorded') setToast(`${date} 기록을 추가했어요`)
      } catch {
        setToast('기록 중 오류가 발생했어요. 다시 시도해주세요')
      }
    }
  }, [addManual])

  const recordedDateSet = useMemo(
    () => new Set(records.map(r => r.recordedDate)),
    [records]
  )
  const todaySessions = useMemo(
    () => records.filter(r => r.recordedDate === getTodayKST()),
    [records]
  )
  const currentYearMonth = getTodayKST().slice(0, 7)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px' }}>
      <TodayHeader sessionCount={stats.todaySessionCount} />
      <RecordButton sessionCount={stats.todaySessionCount} onRecord={handleRecord} />
      <TodaySessionList sessions={todaySessions} />
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
      <WeekDots recent7Days={stats.recent7Days} />
      <StatsCards weeklyCount={stats.weeklyCount} monthlyCount={stats.monthlyCount} />
      <WeeklyGoalBar weeklyCount={stats.weeklyCount} weeklyGoal={settings.weeklyGoal} />
      <MiniCalendar
        yearMonth={currentYearMonth}
        recordedDates={recordedDateSet}
        onDateSelect={handleDateSelect}
      />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {showCancelConfirm && (
        <ConfirmModal
          message="오늘 운동 기록을 전체 취소할까요?"
          confirmLabel="취소하기"
          onConfirm={handleCancelConfirm}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}
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

- [ ] **Step 4-6: RecordsPage.tsx 수정**

`useAppContext` → `useWorkoutContext`로 교체. JSX 구조는 원본 그대로 유지.

```typescript
// src/components/records/RecordsPage.tsx
import { useState, useMemo, useCallback } from 'react'
import { useWorkoutContext } from '../../context/WorkoutContext'
import { isThisWeekKST, isThisMonthKST } from '../../utils/date'
import { FilterChips, type FilterType } from './FilterChips'
import { RecordList } from './RecordList'
import { ManualAddButton } from './ManualAddButton'
import { DatePickerModal } from './DatePickerModal'
import { Toast } from '../shared/Toast'

/** 기록 화면 — 운동 기록 목록 조회, 필터링, 삭제, 수동 날짜 추가 기능 제공 */
export function RecordsPage() {
  const { records, stats, deleteRecord, addManual } = useWorkoutContext()
  const [filter, setFilter] = useState<FilterType>('all')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const handleToastClose = useCallback(() => setToast(null), [])

  const filtered = useMemo(() => {
    if (filter === 'week')  return records.filter(r => isThisWeekKST(r.recordedDate))
    if (filter === 'month') return records.filter(r => isThisMonthKST(r.recordedDate))
    return records
  }, [records, filter])

  const handleManualAdd = useCallback(async (date: string) => {
    setShowDatePicker(false)
    const result = await addManual(date)
    if (result === 'duplicate') setToast('이미 기록된 날짜예요')
    else if (result === 'future') setToast('미래 날짜는 기록할 수 없어요')
    else setToast('기록을 추가했어요')
  }, [addManual])

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
      {toast && <Toast message={toast} onClose={handleToastClose} />}
    </div>
  )
}
```

- [ ] **Step 4-7: SettingsPage.tsx 수정**

`useAppContext` → `useSettingsContext + useWorkoutContext`로 교체. JSX 구조는 원본 그대로 유지.

```typescript
// src/components/settings/SettingsPage.tsx
import { useSettingsContext } from '../../context/SettingsContext'
import { useWorkoutContext } from '../../context/WorkoutContext'
import { GoalStepper } from './GoalStepper'
import { ResetDataButton } from './ResetDataButton'

// 설정 그룹 카드 공통 스타일
const groupStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid #222',
  borderRadius: '14px',
  overflow: 'hidden',
}

const groupLabelStyle: React.CSSProperties = {
  fontSize: '10px', color: 'var(--text-muted)',
  padding: '10px 14px 4px', textTransform: 'uppercase', letterSpacing: '0.8px',
}

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '12px 14px', borderTop: '1px solid var(--border-subtle)',
}

/** 설정 화면 — 주간 목표 스테퍼, 데이터 정보, 데이터 초기화 기능 제공 */
export function SettingsPage() {
  const { settings, updateWeeklyGoal } = useSettingsContext()
  const { stats, deleteAllRecords } = useWorkoutContext()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>설정</h1>

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

      <div style={{
        background: 'var(--surface-deep)', border: '1px solid var(--border-subtle)',
        borderRadius: '12px', padding: '12px 14px',
      }}>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          기록은 이 기기의 브라우저에만 저장됩니다. 브라우저 데이터를 삭제하거나 기기를 변경하면 기록이 사라질 수 있습니다.
        </p>
      </div>

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

- [ ] **Step 4-8: 기존 테스트에서 useAppContext 모킹 참조를 업데이트**

`frontend/src/test/setup.ts`는 API 모킹만 하므로 변경 불필요. 컴포넌트 테스트가 `useAppContext`를 모킹하는 경우가 있는지 확인:

```bash
cd frontend
grep -r "useAppContext\|AppContext\|AppProvider" src/test/
```

만약 결과가 있으면 `useWorkoutContext` 또는 `useSettingsContext`로 교체한다. 없으면 다음 단계로 이동.

- [ ] **Step 4-9: AppContext.tsx 삭제**

모든 소비자가 마이그레이션됐으므로 삭제:

```bash
rm frontend/src/context/AppContext.tsx
```

- [ ] **Step 4-10: useSettings.ts 훅 삭제 여부 확인**

`useSettings.ts`는 이제 `SettingsContext.tsx` 내부로 로직이 이동됐다. 독립 파일로 남아 있으면 삭제한다:

```bash
# 외부에서 여전히 직접 import하는 곳이 있는지 확인
grep -r "from.*hooks/useSettings" frontend/src/
```

결과가 없으면:
```bash
rm frontend/src/hooks/useSettings.ts
```

- [ ] **Step 4-11: 프론트엔드 전체 타입 컴파일 확인**

```bash
cd frontend
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4-12: 프론트엔드 테스트 전체 실행**

```bash
cd frontend
npx vitest run
```

Expected: 모든 테스트 PASS

- [ ] **Step 4-13: 커밋**

```bash
git add frontend/src/context/SettingsContext.tsx frontend/src/context/WorkoutContext.tsx frontend/src/App.tsx frontend/src/components/TabBar.tsx frontend/src/components/home/HomePage.tsx frontend/src/components/records/RecordsPage.tsx frontend/src/components/settings/SettingsPage.tsx
git rm frontend/src/context/AppContext.tsx
# useSettings.ts를 삭제한 경우
git rm frontend/src/hooks/useSettings.ts
git commit -m "refactor: AppContext를 SettingsContext·WorkoutContext로 분리, activeTab을 App 로컬 상태로 이동"
```

---

## 최종 검증

- [ ] **프론트엔드 빌드 확인**

```bash
cd frontend
npm run build
```

Expected: 빌드 성공, 에러 없음

- [ ] **백엔드 빌드 확인**

```bash
cd backend
npm run build
```

Expected: `dist/` 디렉토리 생성, 에러 없음

- [ ] **전체 테스트 재실행**

```bash
cd frontend && npx vitest run
cd ../backend && npm test
```

Expected: 모든 테스트 PASS
