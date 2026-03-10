/**
 * NavBar — Server Component
 * Design Section 5.1, 8.1: AC-13, AC-14
 *
 * - dashboard/layout.tsx 에서만 렌더링 (인증 후 표시, AC-13)
 * - 대시보드 / 주식상품 / 거래내역 / 로그아웃 메뉴 (AC-14)
 */

import Link from 'next/link'
import LogoutButton from './LogoutButton'

export default function NavBar() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-ink border-b border-warm-mid/20">
      {/* 브랜드 로고 */}
      <Link
        href="/dashboard"
        className="font-display text-accent text-xl tracking-wider"
      >
        investLOG
      </Link>

      {/* 메뉴 */}
      <ul className="flex items-center gap-6 font-mono text-sm text-warm-mid">
        <li>
          <Link href="/dashboard" className="hover:text-paper transition-colors">
            대시보드
          </Link>
        </li>
        <li>
          <Link
            href="/dashboard/stocks"
            className="hover:text-paper transition-colors"
          >
            주식상품
          </Link>
        </li>
        <li>
          <Link
            href="/dashboard/transactions"
            className="hover:text-paper transition-colors"
          >
            거래내역
          </Link>
        </li>
        <li>
          <LogoutButton />
        </li>
      </ul>
    </nav>
  )
}
