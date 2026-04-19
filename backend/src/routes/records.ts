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
// client.ts에서 types.setTypeParser(1082)로 DATE를 문자열로 수신하므로
// recorded_date는 항상 "YYYY-MM-DD" 문자열이다.
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
    // 이번 주 월요일부터 오늘까지 (Asia/Seoul 기준 DATE_TRUNC 적용)
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
