// backend/src/middleware/asyncHandler.ts
import type { Request, Response, NextFunction, RequestHandler } from 'express'

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>

// async 라우트 핸들러에서 발생한 에러를 next()로 전달한다
// 이를 통해 각 라우트에서 try-catch를 제거하고 전역 에러 핸들러에 위임한다
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
