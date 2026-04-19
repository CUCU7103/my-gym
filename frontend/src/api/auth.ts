// frontend/src/api/auth.ts
// refreshToken만 raw fetch — 앱 시작 시 조용한 재인증, 실패 시 null 반환
// login·register·logout은 apiFetch 사용 — 일반 API 호출과 동일하게 에러 처리
import { apiFetch } from './client'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

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
// 앱 초기화 시 자동 로그인에 사용 — 실패해도 에러를 던지지 않고 null 반환
export async function refreshToken(): Promise<LoginResponse | null> {
  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) return null
  return res.json() as Promise<LoginResponse>
}

// 로그아웃: 리프레시 토큰 쿠키 삭제
export async function logout(): Promise<void> {
  await apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
}
