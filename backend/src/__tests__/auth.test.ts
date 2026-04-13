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
