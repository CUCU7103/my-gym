// backend/src/db/client.ts
import { Pool, types } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

// pg 기본 파서는 DATE(OID 1082)를 UTC 자정 Date 객체로 반환해 KST와 하루 오차가 생긴다.
// 타입 파서를 문자열 반환으로 재정의하여 DB에 저장된 "YYYY-MM-DD" 그대로 수신한다.
types.setTypeParser(1082, (val: string) => val)

// 환경변수 DATABASE_URL로 PostgreSQL 연결 풀 생성
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// 연결 오류 로깅 (프로세스 종료 방지)
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err)
})
