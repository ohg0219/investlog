'use client'

/**
 * LogoutButton — Client Component
 * Design Section 8.1: AC-14
 *
 * - POST /api/auth/logout 호출 후 router.push('/')
 */

import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (err) {
      console.error('로그아웃 요청 실패:', err)
    }
    router.push('/')
  }

  return (
    <button
      onClick={handleLogout}
      className="font-mono text-sm text-warm-mid hover:text-red-400 transition-colors"
      aria-label="로그아웃"
    >
      로그아웃
    </button>
  )
}
