// frontend/src/components/auth/AuthPage.tsx
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import type { ApiError } from '../../api/client'

// 로그인/회원가입 화면 — 미로그인 시 표시
export function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 브라우저 기본 유효성 메시지 대신 한국어로 직접 검증
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password, inviteCode)
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError
      setError(apiErr?.message ?? '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'var(--bg)',
    }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
        my-gym
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 32 }}>
        운동 출석 기록 앱
      </p>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ marginBottom: 12 }}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ marginBottom: mode === 'register' ? 12 : 16, position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="비밀번호 (8자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px 44px 12px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
          {/* 비밀번호 표시/숨김 토글 버튼 */}
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              minWidth: 44,
              minHeight: 44,
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showPassword ? (
              // 눈 감김 아이콘 (비밀번호 표시 중) — 스크린 리더는 부모 aria-label로 처리
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              // 눈 열림 아이콘 (비밀번호 숨김 중) — 스크린 리더는 부모 aria-label로 처리
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {/* 회원가입 시에만 초대 코드 입력 필드 표시 */}
        {mode === 'register' && (
          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              placeholder="초대 코드"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 14,
            border: 'none',
            background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </form>

      <button
        onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); setShowPassword(false) }}
        style={{
          marginTop: 20,
          background: 'none',
          border: 'none',
          color: 'var(--blue)',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
      </button>
    </div>
  )
}
