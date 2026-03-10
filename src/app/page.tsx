/**
 * Home (Login) Page — Server Component
 * Design Section 5.1, 5.2
 *
 * - 기인증 사용자: token 쿠키 → verifyJwt → /dashboard 리다이렉트
 * - 2분할 레이아웃: 좌(ink) / 우(paper)
 * - 반응형: <768px 단일 컬럼 / 768–1023px 40:60 / ≥1024px 50:50
 * - 하단 고정: StockTicker
 */

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth'
import LoginForm from '@/components/auth/LoginForm'
import StockTicker from '@/components/ui/StockTicker'

const tickerItems = [
  { symbol: 'AAPL', change: 1.24, changePercent: '+1.2%' },
  { symbol: 'TSLA', change: -0.8, changePercent: '-0.8%' },
  { symbol: 'MSFT', change: 0.3, changePercent: '+0.3%' },
  { symbol: '005930.KS', change: -1.5, changePercent: '-1.5%' },
  { symbol: 'NVDA', change: 3.2, changePercent: '+3.2%' },
]

export default async function Home() {
  // 기인증 사용자 리다이렉트
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (token) {
    const payload = await verifyJwt(token)
    if (payload) {
      redirect('/dashboard')
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 메인 콘텐츠 영역 */}
      <main className="flex flex-col md:flex-row flex-1">
        {/* ── 좌측 패널 ── */}
        <section
          className="
            /* mobile: 압축 헤더 (120px) */
            h-[120px] bg-accent flex items-center px-8
            /* tablet: 좌 40%, 전체 높이, ink 배경 */
            md:h-auto md:w-[40%] md:bg-ink md:flex-col md:justify-between md:px-10 md:py-12
            /* desktop: 50% */
            lg:w-1/2
          "
          aria-label="브랜드 패널"
        >
          {/* mobile: 인라인 브랜드 텍스트 */}
          <div className="md:hidden">
            <p className="font-serif text-ink text-sm tracking-wide">Investment Log</p>
            <p className="font-display text-ink text-2xl leading-none">INVESTLOG</p>
          </div>

          {/* tablet/desktop 전용 콘텐츠 */}
          <div className="hidden md:flex md:flex-col md:gap-6 md:flex-1 md:justify-between md:w-full">
            {/* 브랜드 */}
            <div>
              <p className="font-serif text-warm-mid text-sm tracking-widest uppercase mb-4">
                Investment Log
              </p>
              <h1 className="font-display text-paper leading-none" aria-label="Your Invest Logged">
                <span className="block text-[clamp(3rem,6vw,5rem)]">YOUR</span>
                <span className="block text-[clamp(3rem,6vw,5rem)]">INVEST</span>
                <span className="block text-[clamp(3rem,6vw,5rem)] text-accent">LOGGED.</span>
              </h1>
            </div>

            {/* 슬로건 */}
            <p className="font-serif italic text-warm-mid text-base leading-relaxed max-w-xs">
              모든 투자의 기록, 하나의 로그.
              <br />
              숫자 너머의 판단을 남긴다.
            </p>

            {/* SVG 장식 — 라인 차트 */}
            <div aria-hidden="true" className="w-full max-w-sm opacity-60">
              <svg
                viewBox="0 0 320 120"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full"
                role="img"
                aria-label="장식용 차트"
              >
                {/* 그리드 라인 */}
                <line x1="0" y1="30" x2="320" y2="30" stroke="#c8c0b0" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />
                <line x1="0" y1="60" x2="320" y2="60" stroke="#c8c0b0" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />
                <line x1="0" y1="90" x2="320" y2="90" stroke="#c8c0b0" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />

                {/* 영역 채우기 */}
                <path
                  d="M0,90 L40,75 L80,80 L120,50 L160,55 L200,35 L240,40 L280,20 L320,25 L320,120 L0,120 Z"
                  fill="#c8a96e"
                  opacity="0.08"
                />

                {/* 메인 라인 */}
                <polyline
                  points="0,90 40,75 80,80 120,50 160,55 200,35 240,40 280,20 320,25"
                  fill="none"
                  stroke="#c8a96e"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* 보조 라인 */}
                <polyline
                  points="0,100 40,95 80,100 120,85 160,90 200,75 240,80 280,65 320,70"
                  fill="none"
                  stroke="#c8c0b0"
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity="0.5"
                />

                {/* 끝점 강조 */}
                <circle cx="320" cy="25" r="3" fill="#c8a96e" />
              </svg>
            </div>
          </div>
        </section>

        {/* ── 우측 패널 ── */}
        <section
          className="
            flex-1 bg-paper flex flex-col justify-center px-8 py-12
            md:w-[60%] md:px-12
            lg:w-1/2 lg:px-16
          "
          aria-label="로그인 패널"
        >
          <div className="w-full max-w-sm mx-auto lg:mx-0">
            {/* 섹션 제목 */}
            <h2
              className="font-display text-ink text-[clamp(2rem,4vw,3.5rem)] leading-none tracking-wider mb-8"
              aria-label="Private Access"
            >
              PRIVATE
              <br />
              ACCESS
            </h2>

            {/* 로그인 폼 */}
            <LoginForm />
          </div>
        </section>
      </main>

      {/* ── 하단 고정 티커 ── */}
      <footer aria-label="주가 티커">
        <StockTicker items={tickerItems} />
      </footer>
    </div>
  )
}
