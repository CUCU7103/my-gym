// backend/src/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../errors/AppError'

// Express 전역 에러 핸들러 — 반드시 매개변수가 4개여야 Express가 에러 핸들러로 인식한다
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    // 비즈니스 에러: 정해진 상태 코드와 에러 코드로 응답
    res.status(err.status).json({ error: err.error, message: err.message })
  } else {
    // 예상치 못한 에러: 서버 로그에 기록 후 500 반환
    console.error('예상치 못한 서버 에러:', err)
    res.status(500).json({ error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' })
  }
}
