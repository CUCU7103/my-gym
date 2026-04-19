// backend/src/index.ts
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { authRoutes } from './routes/auth'
import { recordsRoutes } from './routes/records'
import { settingsRoutes } from './routes/settings'
import { errorHandler } from './middleware/errorHandler'

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

// 헬스체크 — IP 제한 없이 항상 응답
app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

// 디버그 엔드포인트 — Vercel이 전달하는 실제 클라이언트 IP 확인용 (IP 제한 제외)
app.get('/api/debug-ip', (req, res) => {
  res.json({
    remoteAddress: req.socket.remoteAddress,
    xForwardedFor: req.headers['x-forwarded-for'],
    xRealIp: req.headers['x-real-ip'],
  })
})

// 개발 단계 IP 화이트리스트 — ALLOWED_IPS 환경변수가 설정된 경우에만 적용
// Vercel 리버스 프록시를 거치므로 x-forwarded-for 헤더에서 클라이언트 IP 추출
const allowedIPs = process.env.ALLOWED_IPS
  ? new Set(process.env.ALLOWED_IPS.split(',').map((ip) => ip.trim()))
  : null

if (allowedIPs) {
  app.use((req, res, next) => {
    const forwarded = (req.headers['x-forwarded-for'] as string) ?? ''
    const clientIP = forwarded.split(',')[0].trim() || req.socket.remoteAddress || ''
    if (!allowedIPs.has(clientIP)) {
      res.status(403).json({ error: 'FORBIDDEN', message: '접근이 제한되어 있습니다.' })
      return
    }
    next()
  })
}

app.use('/api/auth', authRoutes)
app.use('/api/records', recordsRoutes)
app.use('/api/settings', settingsRoutes)

// 전역 에러 핸들러 — 반드시 모든 라우트 등록 후 마지막에 위치해야 한다
app.use(errorHandler)

// 테스트에서 import 시 서버를 자동 시작하지 않음
// 직접 실행할 때만 listen (ts-node src/index.ts or node dist/index.js)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 서버 시작: http://localhost:${PORT}`)
  })
}

export { app }
