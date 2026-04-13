// backend/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// Express Request에 userId 필드를 추가하는 타입 확장
declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

// JWT 검증 후 req.userId에 사용자 ID를 주입한다
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: '인증 토큰이 없습니다.' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'UNAUTHORIZED', message: '토큰이 유효하지 않습니다.' })
  }
}
