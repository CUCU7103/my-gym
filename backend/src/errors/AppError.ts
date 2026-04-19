// backend/src/errors/AppError.ts
// HTTP 상태 코드와 에러 코드를 묶어 throw할 수 있는 비즈니스 에러 클래스
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly error: string,
    public readonly message: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}
