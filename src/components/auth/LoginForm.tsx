'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error) setError(null)
    setPassword(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push('/dashboard')
        return
      }

      const data = await res.json()
      setError(data.message || '로그인에 실패했습니다')
      setPassword('')
    } catch {
      setError('연결에 실패했습니다. 다시 시도해주세요')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* 비밀번호 필드 */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="font-mono text-xs text-ink/60 tracking-widest uppercase"
        >
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={handleChange}
          disabled={isLoading}
          className="
            w-full px-0 py-2
            bg-transparent
            border-0 border-b
            font-mono text-base text-ink
            focus:outline-none
            transition-colors
            disabled:opacity-50
          "
          style={{
            borderBottomColor: error ? '#8b3a3a' : '#0a0a08',
            letterSpacing: '8px',
          }}
        />

        {/* 에러 메시지 — 항상 DOM에 존재, visibility로 토글 */}
        <p
          role="alert"
          aria-live="polite"
          className="font-mono text-xs text-red mt-1"
          style={{ visibility: error ? 'visible' : 'hidden' }}
        >
          ✕ {error || '비밀번호가 올바르지 않습니다'}
        </p>
      </div>

      {/* 제출 버튼 + 힌트 텍스트 (AC-07, Design Section 5.1) */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="
            px-6 py-3
            bg-ink text-paper
            font-mono text-sm tracking-widest
            hover:bg-ink/80
            active:scale-[0.99]
            transition-all
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {isLoading ? '접근 중...' : '접근하기 →'}
        </button>
        <span className="font-mono text-xs text-ink/40">
          환경변수로 설정된 비밀번호를 입력하세요
        </span>
      </div>
    </form>
  )
}
