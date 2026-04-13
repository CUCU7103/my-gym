// frontend/src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { login as apiLogin, register as apiRegister, logout as apiLogout, refreshToken } from '../api/auth'
import { setAccessToken } from '../api/client'

type AuthUser = {
  id: string
  email: string
}

type AuthContextValue = {
  isLoggedIn: boolean
  user: AuthUser | null
  // 로그인: 성공 시 resolve, 실패 시 에러 throw
  login: (email: string, password: string) => Promise<void>
  // 회원가입 후 자동 로그인
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  // 앱 시작 시 리프레시 토큰으로 자동 로그인 시도
  useEffect(() => {
    refreshToken()
      .then((res) => {
        if (res) {
          setAccessToken(res.accessToken)
          // JWT 페이로드에서 userId 추출 (디코딩, 검증 불필요)
          const payload = JSON.parse(atob(res.accessToken.split('.')[1])) as { userId: string }
          setUser({ id: payload.userId, email: '' })
        }
      })
      .finally(() => setIsInitializing(false))
  }, [])

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password)
    setAccessToken(res.accessToken)
    const payload = JSON.parse(atob(res.accessToken.split('.')[1])) as { userId: string }
    setUser({ id: payload.userId, email })
  }

  const register = async (email: string, password: string) => {
    await apiRegister(email, password)
    // 회원가입 후 자동 로그인
    await login(email, password)
  }

  const logout = async () => {
    await apiLogout()
    setAccessToken(null)
    setUser(null)
  }

  // 초기화 중에는 아무것도 렌더링하지 않음 (깜빡임 방지)
  if (isInitializing) return null

  return (
    <AuthContext.Provider value={{ isLoggedIn: user !== null, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
