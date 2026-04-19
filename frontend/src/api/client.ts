// frontend/src/api/client.ts
// 모든 API 호출의 기반이 되는 fetch 래퍼.
// 액세스 토큰 자동 첨부 + 401 응답 시 토큰 갱신 후 1회 재시도를 처리한다.

// 프로덕션(Vercel)에서는 vercel.json rewrites로 /api/* → EC2 프록시
// 로컬 개발 시에는 VITE_API_BASE_URL 환경변수로 백엔드 주소 지정
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

// 현재 액세스 토큰을 앱 전역에서 공유 (AuthContext에서 설정)
let _accessToken: string | null = null

export function setAccessToken(token: string | null) {
  _accessToken = token
}

export function getAccessToken(): string | null {
  return _accessToken
}

// 리프레시 토큰으로 새 액세스 토큰을 가져오는 함수 (auth.ts에서도 재사용)
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',  // httpOnly 쿠키 자동 첨부
    })
    if (!res.ok) return null
    const data = await res.json() as { accessToken: string }
    setAccessToken(data.accessToken)
    return data.accessToken
  } catch {
    return null
  }
}

// API 요청의 공통 에러 타입
export type ApiError = {
  error: string
  message: string
}

// fetch 래퍼 — 토큰 자동 첨부, 401 시 갱신 후 재시도
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`

  // 헤더 조립: 토큰이 있으면 Authorization 헤더 추가
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }
  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`
  }

  let res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',  // 쿠키 전송 (리프레시 토큰용)
  })

  // 401이면 토큰 갱신 후 1회 재시도
  // auth 엔드포인트(로그인/회원가입)는 갱신 없이 바로 에러 처리
  const isAuthEndpoint = path.startsWith('/api/auth/login') || path.startsWith('/api/auth/register')
  if (res.status === 401 && !isAuthEndpoint) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(url, { ...options, headers, credentials: 'include' })
    }
  }

  if (!res.ok) {
    // body를 text로 먼저 읽어 JSON 파싱 실패를 방지
    const text = await res.text()
    let errBody: ApiError
    try {
      // JSON 파싱 실패만 catch — 파싱 성공 시 서버 에러 코드 그대로 throw
      errBody = JSON.parse(text) as ApiError
    } catch {
      throw { error: 'SERVER_ERROR', message: text || '서버 오류가 발생했습니다.' } as ApiError
    }
    throw errBody
  }

  // 204 No Content 응답은 빈 객체 반환
  if (res.status === 204) return {} as T
  return res.json() as Promise<T>
}
