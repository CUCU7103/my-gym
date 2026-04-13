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
