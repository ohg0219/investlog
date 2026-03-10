'use client'

/**
 * CustomCursor — Client Component
 * Design Section 5.4
 *
 * - cursor-dot: 8px, bg-accent, fixed, pointer-events-none, z-[9999]
 * - cursor-ring: 32px, border border-accent, fixed, pointer-events-none, z-[9999]
 * - document.body.cursor = 'none' on mount, restored on unmount
 * - prefers-reduced-motion: reduce 시 null 반환 (FE-33)
 *
 * FE-30: 마운트 시 mousemove addEventListener 호출
 * FE-31: 언마운트 시 mousemove removeEventListener 호출
 * FE-32: cursor-dot, cursor-ring 요소 렌더링
 * FE-33: prefers-reduced-motion: reduce 시 null 반환
 */

import { useEffect, useState } from 'react'

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isReducedMotion, setIsReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setIsReducedMotion(mediaQuery.matches)

    const handleMouse = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })
    }

    document.addEventListener('mousemove', handleMouse)
    document.body.style.cursor = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouse)
      document.body.style.cursor = ''
    }
  }, [])

  if (isReducedMotion) return null

  return (
    <>
      <div
        data-testid="cursor-dot"
        style={{ left: position.x - 4, top: position.y - 4 }}
        className="fixed pointer-events-none z-[9999] w-2 h-2 rounded-full bg-accent"
      />
      <div
        data-testid="cursor-ring"
        style={{
          left: position.x - 16,
          top: position.y - 16,
          transition: 'left 80ms ease-out, top 80ms ease-out',
        }}
        className="fixed pointer-events-none z-[9999] w-8 h-8 rounded-full border border-accent"
      />
    </>
  )
}
