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
