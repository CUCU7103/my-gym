// frontend/src/api/auth.ts
// 프로덕션(Vercel)에서는 vercel.json rewrites로 /api/* → EC2 프록시
// 로컬 개발 시에는 VITE_API_BASE_URL 환경변수로 백엔드 주소 지정
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export type AuthUser = {
  userId: string
  email: string
}

export type LoginResponse = {
  accessToken: string
}

// 회원가입: 이메일 + 비밀번호 → { userId, email }
export async function register(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  })
  const data = await res.json()
  if (!res.ok) throw data
  return data as AuthUser
}

// 로그인: 이메일 + 비밀번호 → { accessToken }
// 리프레시 토큰은 서버가 httpOnly 쿠키로 자동 설정
export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  })
  const data = await res.json()
  if (!res.ok) throw data
  return data as LoginResponse
}

// 토큰 갱신: 쿠키의 리프레시 토큰 → 새 액세스 토큰
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
  await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}
