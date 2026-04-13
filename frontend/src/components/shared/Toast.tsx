// src/components/shared/Toast.tsx
import { useEffect } from 'react'

type ToastProps = {
  message: string
  onClose: () => void
}

/** 2.5초 후 자동으로 사라지는 토스트 알림 컴포넌트 */
export function Toast({ message, onClose }: ToastProps) {
  // 마운트 시 2500ms 후 onClose 호출, 언마운트 시 타이머 정리
  useEffect(() => {
    const timer = setTimeout(onClose, 2500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '20px',
      padding: '10px 20px',
      fontSize: '13px',
      color: 'var(--text-secondary)',
      zIndex: 1000,
      whiteSpace: 'nowrap',
    }}>
      {message}
    </div>
  )
}
