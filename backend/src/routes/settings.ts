// backend/src/routes/settings.ts
import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/client'
import { authMiddleware } from '../middleware/authMiddleware'
import { asyncHandler } from '../middleware/asyncHandler'
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
