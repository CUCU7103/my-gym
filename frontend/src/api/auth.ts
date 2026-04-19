// frontend/src/api/auth.ts
// login·register·logout은 apiFetch 사용 — 일반 API 호출과 동일하게 에러 처리
// refreshToken은 refreshAccessToken 내부 구현 재사용 — 앱 초기화 시 조용한 재인증
import { apiFetch, refreshAccessToken } from './client'

export type AuthUser = {
  userId: string
  email: string
}

export type LoginResponse = {
  accessToken: string
}

// 회원가입: 이메일 + 비밀번호 + 초대 코드 → { userId, email }
export async function register(email: string, password: string, inviteCode: string): Promise<AuthUser> {
  return apiFetch<AuthUser>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, inviteCode }),
  })
}

// 로그인: 이메일 + 비밀번호 → { accessToken }
// 리프레시 토큰은 서버가 httpOnly 쿠키로 자동 설정
export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

// 토큰 갱신: 쿠키의 리프레시 토큰 → 새 액세스 토큰
// 앱 초기화 시 자동 로그인에 사용 — 네트워크 오류 포함 모든 실패에서 null 반환
export async function refreshToken(): Promise<LoginResponse | null> {
  const newToken = await refreshAccessToken()
  if (!newToken) return null
  return { accessToken: newToken }
}

// 로그아웃: 리프레시 토큰 쿠키 삭제
export async function logout(): Promise<void> {
  await apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
}
