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
