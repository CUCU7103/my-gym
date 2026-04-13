# 백엔드 API + EC2 인프라 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Node.js Express 백엔드(JWT 인증 + CRUD API)와 PostgreSQL을 Docker Compose로 패키징하고, Terraform으로 AWS EC2에 배포한다.

**Architecture:** 모노레포 루트에서 `backend/`(Express + pg)와 `terraform/`(EC2 인프라)을 분리 관리. Docker Compose로 app + db 컨테이너를 묶어 EC2 단일 인스턴스에서 실행. 프론트엔드(`frontend/`)는 기존 파일을 이동만 하고 이 계획에서는 수정하지 않는다.

**Tech Stack:** Node.js 20, Express 4, TypeScript 5, pg (node-postgres), jsonwebtoken, bcrypt, zod, Docker Compose, Terraform (AWS provider ~5.0), PostgreSQL 16

---

## 파일 구조

```
my-gym/
├── frontend/                        ← 기존 파일 이동 (내용 변경 없음)
├── backend/
│   ├── src/
│   │   ├── index.ts                 ← Express 앱 진입점, 미들웨어 조립
│   │   ├── types.ts                 ← 공유 타입 (WorkoutRecord, UserSettings)
│   │   ├── db/
│   │   │   ├── client.ts            ← pg Pool 설정
│   │   │   └── migrations/
│   │   │       └── 001_init.sql     ← 초기 스키마 (4개 테이블)
│   │   ├── middleware/
│   │   │   └── authMiddleware.ts    ← JWT 검증, req.userId 주입
│   │   └── routes/
│   │       ├── auth.ts              ← register/login/refresh/logout
│   │       ├── records.ts           ← CRUD /api/records
│   │       └── settings.ts          ← GET/PUT /api/settings
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── terraform/
│   ├── main.tf                      ← provider, SG, EC2, EIP
│   ├── variables.tf
│   └── outputs.tf
├── docker-compose.yml               ← app + db, healthcheck
└── .env.example                     ← 환경변수 샘플 (비밀 제외)
```

---

## Task 1: 모노레포 구조 설정 + 기존 파일 이동

**Files:**
- Create: `frontend/` (기존 src/, public/, index.html 등을 이동)
- Create: `backend/` (빈 디렉토리)
- Create: `terraform/` (빈 디렉토리)

- [ ] **Step 1: 기존 프론트엔드 파일을 `frontend/`로 이동**

```bash
cd /Users/joongyu/toy-project/my-gym
mkdir -p frontend backend terraform
# 프론트엔드 관련 파일/디렉토리를 frontend/로 이동
mv src public index.html vite.config.ts vitest.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json eslint.config.js package.json package-lock.json node_modules frontend/
```

- [ ] **Step 2: 이동 후 구조 확인**

```bash
ls frontend/
# 예상 출력: src  public  index.html  vite.config.ts  vitest.config.ts  tsconfig.json  tsconfig.app.json  tsconfig.node.json  eslint.config.js  package.json  package-lock.json  node_modules
ls -la
# 예상: frontend/  backend/  terraform/  docs/  PRD.md  CLAUDE.md
```

- [ ] **Step 3: 프론트엔드 개발 서버 정상 동작 확인**

```bash
cd frontend
npm run dev
# 브라우저에서 http://localhost:5173 확인 후 Ctrl+C 종료
```

- [ ] **Step 4: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add -A
git commit -m "refactor: 모노레포 구조로 frontend/ 디렉토리 분리"
```

---

## Task 2: 백엔드 package.json + TypeScript 설정

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`

- [ ] **Step 1: `backend/package.json` 작성**

```bash
cat > /Users/joongyu/toy-project/my-gym/backend/package.json << 'EOF'
{
  "name": "my-gym-backend",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": {
    "dev": "ts-node --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest --runInBand",
    "migrate": "ts-node --transpile-only src/db/migrate.ts"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.5",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.12.7",
    "@types/pg": "^8.11.5",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.1.4",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.5"
  }
}
EOF
```

- [ ] **Step 2: `backend/tsconfig.json` 작성**

```bash
cat > /Users/joongyu/toy-project/my-gym/backend/tsconfig.json << 'EOF'
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
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

- [ ] **Step 3: 패키지 설치**

```bash
cd /Users/joongyu/toy-project/my-gym/backend
npm install
```

- [ ] **Step 4: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add backend/package.json backend/tsconfig.json backend/package-lock.json
git commit -m "chore: 백엔드 패키지 및 TypeScript 설정 추가"
```

---

## Task 3: 공유 타입 + DB 클라이언트 + 마이그레이션

**Files:**
- Create: `backend/src/types.ts`
- Create: `backend/src/db/client.ts`
- Create: `backend/src/db/migrate.ts`
- Create: `backend/src/db/migrations/001_init.sql`

- [ ] **Step 1: `backend/src/types.ts` 작성**

```typescript
// backend/src/types.ts
// 프론트엔드 types/index.ts와 동일한 구조를 유지한다

export type WorkoutRecord = {
  id: string
  recordedAt: string    // ISO datetime
  recordedDate: string  // YYYY-MM-DD (Asia/Seoul 기준)
  createdAt: string     // ISO datetime
  source: 'today_button' | 'manual'
  label?: string
}

export type UserSettings = {
  weeklyGoal: number    // 1~7
  timezone: 'Asia/Seoul'
}
```

파일 저장: `backend/src/types.ts`

- [ ] **Step 2: `backend/src/db/migrations/001_init.sql` 작성**

```sql
-- backend/src/db/migrations/001_init.sql

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 리프레시 토큰 (로그아웃 시 무효화)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 운동 기록 (user_id + recorded_date 조합 유니크)
CREATE TABLE IF NOT EXISTS workout_records (
  id             UUID PRIMARY KEY,
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  recorded_at    TIMESTAMPTZ NOT NULL,
  recorded_date  DATE NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL,
  source         VARCHAR(20) NOT NULL CHECK (source IN ('today_button', 'manual')),
  label          VARCHAR(100),
  UNIQUE (user_id, recorded_date)
);

-- 사용자 설정 (사용자당 1개 행)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  weekly_goal  INTEGER NOT NULL DEFAULT 3 CHECK (weekly_goal BETWEEN 1 AND 7),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
```

파일 저장: `backend/src/db/migrations/001_init.sql`

- [ ] **Step 3: `backend/src/db/client.ts` 작성**

```typescript
// backend/src/db/client.ts
import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

// 환경변수 DATABASE_URL로 PostgreSQL 연결 풀 생성
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// 연결 오류 로깅 (프로세스 종료 방지)
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err)
})
```

파일 저장: `backend/src/db/client.ts`

- [ ] **Step 4: `backend/src/db/migrate.ts` 작성**

```typescript
// backend/src/db/migrate.ts
// npm run migrate 로 실행하는 마이그레이션 스크립트
import { readFileSync } from 'fs'
import { join } from 'path'
import { pool } from './client'

async function migrate() {
  const sql = readFileSync(
    join(__dirname, 'migrations', '001_init.sql'),
    'utf8'
  )
  await pool.query(sql)
  console.log('✅ 마이그레이션 완료')
  await pool.end()
}

migrate().catch((err) => {
  console.error('마이그레이션 실패:', err)
  process.exit(1)
})
```

파일 저장: `backend/src/db/migrate.ts`

- [ ] **Step 5: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add backend/src/
git commit -m "feat: 백엔드 공유 타입, DB 클라이언트, 마이그레이션 SQL 추가"
```

---

## Task 4: Express 앱 진입점 + authMiddleware

**Files:**
- Create: `backend/src/index.ts`
- Create: `backend/src/middleware/authMiddleware.ts`

- [ ] **Step 1: `backend/src/middleware/authMiddleware.ts` 작성**

```typescript
// backend/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// Express Request에 userId 필드를 추가하는 타입 확장
declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

// JWT 검증 후 req.userId에 사용자 ID를 주입한다
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: '인증 토큰이 없습니다.' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'UNAUTHORIZED', message: '토큰이 유효하지 않습니다.' })
  }
}
```

파일 저장: `backend/src/middleware/authMiddleware.ts`

- [ ] **Step 2: `backend/src/index.ts` 작성**

```typescript
// backend/src/index.ts
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { authRoutes } from './routes/auth'
import { recordsRoutes } from './routes/records'
import { settingsRoutes } from './routes/settings'

dotenv.config()

const app = express()
const PORT = process.env.PORT ?? 3000

// 프론트엔드 개발 서버(5173)와 프로덕션 오리진을 허용
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_ORIGIN ?? '',
].filter(Boolean)

app.use(cors({
  origin: allowedOrigins,
  credentials: true,   // httpOnly 쿠키 전송 허용
}))
app.use(express.json())
app.use(cookieParser())

// 헬스체크 (Docker Compose healthcheck 및 Terraform 확인용)
app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRoutes)
app.use('/api/records', recordsRoutes)
app.use('/api/settings', settingsRoutes)

app.listen(PORT, () => {
  console.log(`🚀 서버 시작: http://localhost:${PORT}`)
})

export { app }
```

파일 저장: `backend/src/index.ts`

- [ ] **Step 3: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add backend/src/index.ts backend/src/middleware/
git commit -m "feat: Express 앱 진입점 및 JWT 인증 미들웨어 추가"
```

---

## Task 5: 인증 라우트 (register / login / refresh / logout)

**Files:**
- Create: `backend/src/routes/auth.ts`

- [ ] **Step 1: `backend/src/routes/auth.ts` 작성**

```typescript
// backend/src/routes/auth.ts
import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { pool } from '../db/client'

export const authRoutes = Router()

const BCRYPT_ROUNDS = 12
const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL = '7d'
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

// 입력 유효성 검사 스키마
const credentialsSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
})

function generateAccessToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: ACCESS_TOKEN_TTL })
}

function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: REFRESH_TOKEN_TTL })
}

// POST /api/auth/register
authRoutes.post('/register', async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message })
    return
  }
  const { email, password } = parsed.data

  try {
    // 이메일 중복 확인
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      res.status(400).json({ error: 'EMAIL_TAKEN', message: '이미 사용 중인 이메일입니다.' })
      return
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    )
    res.status(201).json({ userId: result.rows[0].id, email: result.rows[0].email })
  } catch (err) {
    console.error('register error:', err)
    res.status(500).json({ error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' })
  }
})

// POST /api/auth/login
authRoutes.post('/login', async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message })
    return
  }
  const { email, password } = parsed.data

  try {
    const result = await pool.query('SELECT id, password FROM users WHERE email = $1', [email])
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다.' })
      return
    }

    const user = result.rows[0]
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다.' })
      return
    }

    const accessToken = generateAccessToken(user.id)
    const refreshToken = generateRefreshToken(user.id)
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)

    // 리프레시 토큰을 DB에 저장
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    )

    // 리프레시 토큰은 httpOnly 쿠키로 전달 (JS 접근 불가)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_TTL_MS,
    })

    res.json({ accessToken })
  } catch (err) {
    console.error('login error:', err)
    res.status(500).json({ error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' })
  }
})

// POST /api/auth/refresh
authRoutes.post('/refresh', async (req, res) => {
  const token = req.cookies.refreshToken
  if (!token) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: '리프레시 토큰이 없습니다.' })
    return
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string }

    // DB에서 토큰 유효성 확인 (로그아웃으로 삭제된 토큰 방지)
    const result = await pool.query(
      'SELECT id FROM refresh_tokens WHERE token = $1 AND expires_at > now()',
      [token]
    )
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: '만료되거나 무효화된 토큰입니다.' })
      return
    }

    const accessToken = generateAccessToken(payload.userId)
    res.json({ accessToken })
  } catch {
    res.status(401).json({ error: 'UNAUTHORIZED', message: '리프레시 토큰이 유효하지 않습니다.' })
  }
})

// POST /api/auth/logout
authRoutes.post('/logout', async (req, res) => {
  const token = req.cookies.refreshToken
  if (token) {
    // DB에서 리프레시 토큰 삭제 (무효화)
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token])
  }
  res.clearCookie('refreshToken')
  res.json({ ok: true })
})
```

파일 저장: `backend/src/routes/auth.ts`

- [ ] **Step 2: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add backend/src/routes/auth.ts
git commit -m "feat: JWT 회원가입/로그인/토큰갱신/로그아웃 API 추가"
```

---

## Task 6: 운동 기록 라우트 (CRUD)

**Files:**
- Create: `backend/src/routes/records.ts`

- [ ] **Step 1: `backend/src/routes/records.ts` 작성**

```typescript
// backend/src/routes/records.ts
import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/client'
import { authMiddleware } from '../middleware/authMiddleware'
import type { WorkoutRecord } from '../types'

export const recordsRoutes = Router()

// 모든 /api/records 요청에 JWT 인증 적용
recordsRoutes.use(authMiddleware)

// DB 행을 WorkoutRecord 타입으로 변환하는 헬퍼
function rowToRecord(row: Record<string, unknown>): WorkoutRecord {
  return {
    id: row.id as string,
    recordedAt: (row.recorded_at as Date).toISOString(),
    recordedDate: (row.recorded_date as string).slice(0, 10), // DATE → YYYY-MM-DD
    createdAt: (row.created_at as Date).toISOString(),
    source: row.source as 'today_button' | 'manual',
    label: (row.label as string | null) ?? undefined,
  }
}

// GET /api/records?filter=week|month
recordsRoutes.get('/', async (req, res) => {
  const { filter } = req.query
  let whereClause = 'WHERE user_id = $1'

  if (filter === 'week') {
    // 이번 주 월요일부터 오늘까지 (Asia/Seoul 기준 DATE_TRUNC 적용)
    whereClause += ` AND recorded_date >= DATE_TRUNC('week', CURRENT_DATE AT TIME ZONE 'Asia/Seoul')::DATE`
  } else if (filter === 'month') {
    whereClause += ` AND recorded_date >= DATE_TRUNC('month', CURRENT_DATE AT TIME ZONE 'Asia/Seoul')::DATE`
  }

  try {
    const result = await pool.query(
      `SELECT * FROM workout_records ${whereClause} ORDER BY recorded_at DESC`,
      [req.userId]
    )
    res.json(result.rows.map(rowToRecord))
  } catch (err) {
    console.error('GET /records error:', err)
    res.status(500).json({ error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' })
  }
})

const addRecordSchema = z.object({
  recordedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다.'),
  source: z.enum(['today_button', 'manual']),
  label: z.string().max(100).optional(),
})

// POST /api/records
recordsRoutes.post('/', async (req, res) => {
  const parsed = addRecordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message })
    return
  }
  const { recordedDate, source, label } = parsed.data
  const now = new Date()
  const id = crypto.randomUUID()

  try {
    const result = await pool.query(
      `INSERT INTO workout_records (id, user_id, recorded_at, recorded_date, created_at, source, label)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, req.userId, now, recordedDate, now, source, label ?? null]
    )
    res.status(201).json(rowToRecord(result.rows[0]))
  } catch (err: unknown) {
    // unique 제약 위반 (user_id + recorded_date 중복)
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
      res.status(409).json({ error: 'DUPLICATE_DATE', message: '해당 날짜에 이미 기록이 있습니다.' })
      return
    }
    console.error('POST /records error:', err)
    res.status(500).json({ error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' })
  }
})

// DELETE /api/records/:id (특정 기록 삭제)
recordsRoutes.delete('/:id', async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query(
      'DELETE FROM workout_records WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    )
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: '기록을 찾을 수 없습니다.' })
      return
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /records/:id error:', err)
    res.status(500).json({ error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' })
  }
})

// DELETE /api/records (전체 삭제)
recordsRoutes.delete('/', async (req, res) => {
  try {
    await pool.query('DELETE FROM workout_records WHERE user_id = $1', [req.userId])
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /records error:', err)
    res.status(500).json({ error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' })
  }
})
```

파일 저장: `backend/src/routes/records.ts`

- [ ] **Step 2: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add backend/src/routes/records.ts
git commit -m "feat: 운동 기록 CRUD API 추가 (GET/POST/DELETE)"
```

---

## Task 7: 설정 라우트 (GET / PUT)

**Files:**
- Create: `backend/src/routes/settings.ts`

- [ ] **Step 1: `backend/src/routes/settings.ts` 작성**

```typescript
// backend/src/routes/settings.ts
import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/client'
import { authMiddleware } from '../middleware/authMiddleware'
import type { UserSettings } from '../types'

export const settingsRoutes = Router()

settingsRoutes.use(authMiddleware)

// DB 행을 UserSettings 타입으로 변환
function rowToSettings(row: Record<string, unknown>): UserSettings {
  return {
    weeklyGoal: row.weekly_goal as number,
    timezone: 'Asia/Seoul',
  }
}

// GET /api/settings
settingsRoutes.get('/', async (req, res) => {
  try {
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
  } catch (err) {
    console.error('GET /settings error:', err)
    res.status(500).json({ error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' })
  }
})

const updateSettingsSchema = z.object({
  weeklyGoal: z.number().int().min(1).max(7),
})

// PUT /api/settings
settingsRoutes.put('/', async (req, res) => {
  const parsed = updateSettingsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: '주간 목표는 1~7 사이여야 합니다.' })
    return
  }
  const { weeklyGoal } = parsed.data

  try {
    const result = await pool.query(
      `INSERT INTO user_settings (user_id, weekly_goal, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE SET weekly_goal = $2, updated_at = now()
       RETURNING *`,
      [req.userId, weeklyGoal]
    )
    res.json(rowToSettings(result.rows[0]))
  } catch (err) {
    console.error('PUT /settings error:', err)
    res.status(500).json({ error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' })
  }
})
```

파일 저장: `backend/src/routes/settings.ts`

- [ ] **Step 2: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add backend/src/routes/settings.ts
git commit -m "feat: 사용자 설정 GET/PUT API 추가"
```

---

## Task 8: 백엔드 로컬 통합 테스트 (supertest)

**Files:**
- Create: `backend/jest.config.js`
- Create: `backend/src/__tests__/auth.test.ts`
- Create: `backend/src/__tests__/records.test.ts`

> **주의:** 이 테스트는 실제 PostgreSQL이 필요하다. 로컬에서 Docker로 테스트용 DB를 실행한 뒤 진행한다.

- [ ] **Step 1: `backend/jest.config.js` 작성**

```js
// backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFilesAfterFramework: [],
}
```

파일 저장: `backend/jest.config.js`

- [ ] **Step 2: 테스트용 PostgreSQL 실행**

```bash
docker run -d \
  --name my-gym-test-db \
  -e POSTGRES_USER=gym_user \
  -e POSTGRES_PASSWORD=gym_pass \
  -e POSTGRES_DB=gym_db \
  -p 5433:5432 \
  postgres:16-alpine

# 5초 대기 후 마이그레이션 실행
sleep 5
DATABASE_URL=postgres://gym_user:gym_pass@localhost:5433/gym_db \
  cd backend && npm run migrate
```

- [ ] **Step 3: `backend/src/__tests__/auth.test.ts` 작성**

```typescript
// backend/src/__tests__/auth.test.ts
import request from 'supertest'
import { app } from '../index'
import { pool } from '../db/client'

// 테스트 전 users/refresh_tokens 테이블 초기화
beforeEach(async () => {
  await pool.query('DELETE FROM refresh_tokens')
  await pool.query('DELETE FROM users')
})

afterAll(async () => {
  await pool.end()
})

describe('POST /api/auth/register', () => {
  it('유효한 이메일/비밀번호로 회원가입 성공', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123' })

    expect(res.status).toBe(201)
    expect(res.body.email).toBe('test@example.com')
    expect(res.body.userId).toBeDefined()
  })

  it('중복 이메일로 회원가입 시 400 반환', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'password123' })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'password123' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('EMAIL_TAKEN')
  })

  it('비밀번호 8자 미만이면 400 반환', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'short@example.com', password: '1234567' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })
})

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'login@example.com', password: 'password123' })
  })

  it('올바른 자격증명으로 로그인 성공 → accessToken 반환', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()
    // httpOnly 쿠키에 refreshToken 포함 확인
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('잘못된 비밀번호로 로그인 시 401 반환', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'wrongpass' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('INVALID_CREDENTIALS')
  })
})
```

파일 저장: `backend/src/__tests__/auth.test.ts`

- [ ] **Step 4: `backend/src/__tests__/records.test.ts` 작성**

```typescript
// backend/src/__tests__/records.test.ts
import request from 'supertest'
import { app } from '../index'
import { pool } from '../db/client'

let accessToken: string

beforeAll(async () => {
  await pool.query('DELETE FROM workout_records')
  await pool.query('DELETE FROM refresh_tokens')
  await pool.query('DELETE FROM users')

  await request(app)
    .post('/api/auth/register')
    .send({ email: 'records@example.com', password: 'password123' })

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'records@example.com', password: 'password123' })

  accessToken = loginRes.body.accessToken
})

afterAll(async () => {
  await pool.end()
})

describe('GET /api/records', () => {
  it('JWT 없이 요청하면 401 반환', async () => {
    const res = await request(app).get('/api/records')
    expect(res.status).toBe(401)
  })

  it('JWT 포함 요청 시 빈 배열 반환', async () => {
    const res = await request(app)
      .get('/api/records')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

describe('POST /api/records', () => {
  it('오늘 날짜로 기록 추가 성공', async () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ recordedDate: today, source: 'today_button' })

    expect(res.status).toBe(201)
    expect(res.body.recordedDate).toBe(today)
    expect(res.body.source).toBe('today_button')
  })

  it('같은 날짜 중복 추가 시 409 반환', async () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
    // 첫 번째 추가
    await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ recordedDate: today, source: 'today_button' })

    // 두 번째 추가 (중복)
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ recordedDate: today, source: 'today_button' })

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('DUPLICATE_DATE')
  })
})
```

파일 저장: `backend/src/__tests__/records.test.ts`

- [ ] **Step 5: 테스트 실행**

```bash
cd /Users/joongyu/toy-project/my-gym/backend
DATABASE_URL=postgres://gym_user:gym_pass@localhost:5433/gym_db \
JWT_SECRET=test-secret-32chars-xxxxxxxxxxxxxxxxx \
JWT_REFRESH_SECRET=test-refresh-secret-32chars-xxxxx \
npm test

# 예상 출력:
# PASS src/__tests__/auth.test.ts
# PASS src/__tests__/records.test.ts
# Tests: 7 passed, 7 total
```

- [ ] **Step 6: 테스트용 컨테이너 정리**

```bash
docker stop my-gym-test-db && docker rm my-gym-test-db
```

- [ ] **Step 7: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add backend/jest.config.js backend/src/__tests__/
git commit -m "test: 백엔드 인증 및 기록 API 통합 테스트 추가"
```

---

## Task 9: Docker Compose + Dockerfile

**Files:**
- Create: `backend/Dockerfile`
- Create: `docker-compose.yml`
- Create: `.env.example`

- [ ] **Step 1: `backend/Dockerfile` 작성**

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# 프로덕션 이미지
FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

파일 저장: `backend/Dockerfile`

- [ ] **Step 2: `docker-compose.yml` 작성 (루트)**

```yaml
# docker-compose.yml
services:
  app:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://gym_user:gym_pass@db:5432/gym_db
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      FRONTEND_ORIGIN: ${FRONTEND_ORIGIN:-}
      NODE_ENV: production
      PORT: 3000
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: gym_user
      POSTGRES_PASSWORD: gym_pass
      POSTGRES_DB: gym_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/src/db/migrations/001_init.sql:/docker-entrypoint-initdb.d/001_init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gym_user -d gym_db"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
```

파일 저장: `docker-compose.yml`

- [ ] **Step 3: `.env.example` 작성 (루트)**

```bash
# .env.example
# 이 파일을 .env로 복사하고 값을 채워 사용한다
# .env는 절대 git에 커밋하지 않는다

JWT_SECRET=여기에_32자_이상의_랜덤_문자열을_입력
JWT_REFRESH_SECRET=여기에_32자_이상의_다른_랜덤_문자열을_입력
FRONTEND_ORIGIN=http://EC2_IP:5173
```

파일 저장: `.env.example`

- [ ] **Step 4: `.gitignore`에 `.env` 추가 확인**

```bash
grep -q "^\.env$" /Users/joongyu/toy-project/my-gym/.gitignore || echo ".env" >> /Users/joongyu/toy-project/my-gym/.gitignore
```

- [ ] **Step 5: 로컬 Docker Compose 실행 테스트**

```bash
cd /Users/joongyu/toy-project/my-gym
cp .env.example .env
# .env 파일에서 JWT_SECRET, JWT_REFRESH_SECRET을 실제 값으로 수정한 후:
docker compose up --build -d

# 헬스체크 확인 (약 10초 소요)
sleep 10
curl http://localhost:3000/health
# 예상 출력: {"ok":true}
```

- [ ] **Step 6: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add backend/Dockerfile docker-compose.yml .env.example .gitignore
git commit -m "feat: Docker Compose + Dockerfile 구성 추가"
```

---

## Task 10: Terraform EC2 인프라

**Files:**
- Create: `terraform/variables.tf`
- Create: `terraform/main.tf`
- Create: `terraform/outputs.tf`

- [ ] **Step 1: `terraform/variables.tf` 작성**

```hcl
# terraform/variables.tf
variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2"
}

variable "key_pair_name" {
  description = "EC2 SSH 접속에 사용할 키 페어 이름 (AWS 콘솔에서 미리 생성)"
  type        = string
}

variable "repo_url" {
  description = "Git 레포지토리 URL (EC2 user_data에서 git clone 시 사용)"
  type        = string
}

variable "instance_type" {
  description = "EC2 인스턴스 타입"
  type        = string
  default     = "t3.micro"
}
```

파일 저장: `terraform/variables.tf`

- [ ] **Step 2: Terraform MCP로 최신 AWS 프로바이더 버전 확인**

```bash
# Terraform MCP의 get_latest_provider_version 툴로 확인 후 아래 버전을 업데이트한다
# 또는 registry.terraform.io에서 직접 확인: hashicorp/aws
```

- [ ] **Step 3: `terraform/main.tf` 작성**

```hcl
# terraform/main.tf
terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Ubuntu 24.04 LTS AMI (ap-northeast-2 서울 리전)
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# 보안 그룹: SSH(22), HTTP(80), HTTPS(443), API(3000) 허용
resource "aws_security_group" "my_gym" {
  name        = "my-gym-sg"
  description = "my-gym EC2 보안 그룹"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "SSH"
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Node.js API"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "my-gym-sg"
    Project = "my-gym"
  }
}

# EC2 인스턴스
resource "aws_instance" "my_gym" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [aws_security_group.my_gym.id]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  # EC2 최초 실행 시 Docker + Docker Compose 설치 및 앱 실행
  user_data = <<-EOF
    #!/bin/bash
    set -e
    apt-get update
    apt-get install -y docker.io docker-compose-v2 git

    systemctl enable docker
    systemctl start docker

    git clone ${var.repo_url} /app
    cd /app

    # .env 파일은 SSH로 수동 배치 필요 (JWT 시크릿 포함)
    # 배포 후 아래 명령 실행:
    # scp .env ubuntu@<EC2_IP>:/app/.env
    # ssh ubuntu@<EC2_IP> "cd /app && docker compose up -d"
    EOF

  tags = {
    Name    = "my-gym-server"
    Project = "my-gym"
  }
}

# Elastic IP (인스턴스 재시작 후에도 IP 유지)
resource "aws_eip" "my_gym" {
  instance = aws_instance.my_gym.id
  domain   = "vpc"

  tags = {
    Name    = "my-gym-eip"
    Project = "my-gym"
  }
}
```

파일 저장: `terraform/main.tf`

- [ ] **Step 4: `terraform/outputs.tf` 작성**

```hcl
# terraform/outputs.tf
output "ec2_public_ip" {
  description = "EC2 인스턴스의 Elastic IP (프론트엔드 VITE_API_BASE_URL에 사용)"
  value       = aws_eip.my_gym.public_ip
}

output "ec2_instance_id" {
  description = "EC2 인스턴스 ID"
  value       = aws_instance.my_gym.id
}

output "ssh_command" {
  description = "SSH 접속 명령어"
  value       = "ssh -i ~/.ssh/${var.key_pair_name}.pem ubuntu@${aws_eip.my_gym.public_ip}"
}

output "api_base_url" {
  description = "백엔드 API 기본 URL"
  value       = "http://${aws_eip.my_gym.public_ip}:3000"
}
```

파일 저장: `terraform/outputs.tf`

- [ ] **Step 5: Terraform 초기화 및 검증**

```bash
cd /Users/joongyu/toy-project/my-gym/terraform
terraform init
# 예상 출력: Terraform has been successfully initialized!

terraform validate
# 예상 출력: Success! The configuration is valid.

terraform plan \
  -var="key_pair_name=내-키페어-이름" \
  -var="repo_url=https://github.com/내계정/my-gym"
# 예상 출력: Plan: 3 to add, 0 to change, 0 to destroy.
# (aws_security_group, aws_instance, aws_eip 3개 리소스)
```

- [ ] **Step 6: Terraform 적용 (실제 EC2 생성)**

```bash
cd /Users/joongyu/toy-project/my-gym/terraform
terraform apply \
  -var="key_pair_name=내-키페어-이름" \
  -var="repo_url=https://github.com/내계정/my-gym"
# "yes" 입력 후 대기 (약 1~2분)
# 완료 후 출력 예시:
# ec2_public_ip = "13.xxx.xxx.xxx"
# ssh_command = "ssh -i ~/.ssh/내-키페어-이름.pem ubuntu@13.xxx.xxx.xxx"
# api_base_url = "http://13.xxx.xxx.xxx:3000"
```

- [ ] **Step 7: EC2에 .env 배치 및 Docker Compose 실행**

```bash
# Terraform 출력에서 EC2 IP 확인 후 아래 실행
EC2_IP=$(cd terraform && terraform output -raw ec2_public_ip)

# .env 파일을 EC2에 복사
scp -i ~/.ssh/내-키페어-이름.pem \
  /Users/joongyu/toy-project/my-gym/.env \
  ubuntu@$EC2_IP:/app/.env

# EC2에 SSH 접속하여 Docker Compose 실행
ssh -i ~/.ssh/내-키페어-이름.pem ubuntu@$EC2_IP \
  "cd /app && docker compose up -d"

# 헬스체크 확인
sleep 15
curl http://$EC2_IP:3000/health
# 예상 출력: {"ok":true}
```

- [ ] **Step 8: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add terraform/
git commit -m "feat: Terraform EC2 + Security Group + Elastic IP 인프라 추가"
```

---

## Task 11: 최종 E2E 검증

- [ ] **Step 1: 회원가입 → 로그인 → 기록 추가 → 조회 흐름 테스트**

```bash
EC2_IP=$(cd terraform && terraform output -raw ec2_public_ip)
BASE="http://$EC2_IP:3000"

# 1. 회원가입
curl -s -X POST $BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@example.com","password":"password123"}' | jq .
# 예상: { "userId": "...", "email": "smoke@example.com" }

# 2. 로그인 (쿠키 저장)
curl -s -c /tmp/cookies.txt -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@example.com","password":"password123"}' | jq .
# 예상: { "accessToken": "eyJ..." }

# accessToken 변수로 저장
TOKEN=$(curl -s -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke2@example.com","password":"password123"}' 2>/dev/null | \
  grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || \
  curl -s -c /tmp/cookies2.txt -X POST $BASE/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"smoke@example.com","password":"password123"}' | \
    python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# 3. 오늘 기록 추가
TODAY=$(date +%Y-%m-%d)
curl -s -X POST $BASE/api/records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"recordedDate\":\"$TODAY\",\"source\":\"today_button\"}" | jq .
# 예상: { "id": "...", "recordedDate": "2026-04-13", "source": "today_button", ... }

# 4. 기록 조회
curl -s $BASE/api/records \
  -H "Authorization: Bearer $TOKEN" | jq .
# 예상: [{ "id": "...", "recordedDate": "2026-04-13", ... }]

# 5. 설정 조회
curl -s $BASE/api/settings \
  -H "Authorization: Bearer $TOKEN" | jq .
# 예상: { "weeklyGoal": 3, "timezone": "Asia/Seoul" }
```

- [ ] **Step 2: 최종 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add -A
git commit -m "chore: 백엔드 + EC2 인프라 구현 완료"
```
