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

  it('같은 날짜에 여러 기록 추가 가능 (중복 허용)', async () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })

    // 첫 번째 추가
    const res1 = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ recordedDate: today, source: 'today_button' })

    // 두 번째 추가 (같은 날짜 — 허용)
    const res2 = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ recordedDate: today, source: 'manual' })

    expect(res1.status).toBe(201)
    expect(res2.status).toBe(201)
  })

  it('잘못된 날짜 형식이면 400 반환', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ recordedDate: '20260413', source: 'today_button' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })
})
