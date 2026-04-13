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
  'http://localhost:5174',
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
