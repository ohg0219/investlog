'use client'

interface PaginationProps {
  total: number
  currentPage: number
  limit: number
  onPageChange: (page: number) => void
}

export default function Pagination({ total, currentPage, limit, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="flex items-center justify-between px-8 py-4">
      {/* 총 건수 */}
      <span className="font-mono text-xs text-warm-mid">
        전체 {total}건
      </span>

      {/* 페이지 버튼 */}
      <div className="flex items-center gap-1">
        {/* 이전 버튼 */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="
            px-3 py-1.5
            font-mono text-xs text-warm-mid
            border border-warm-mid/20
            hover:text-paper hover:border-warm-mid/60
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors
            focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
          "
        >
          &lt; 이전
        </button>

        {/* 페이지 번호 버튼 */}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            type="button"
            data-testid={`page-btn-${page}`}
            onClick={() => onPageChange(page)}
            className={`
              px-3 py-1.5
              font-mono text-xs
              border border-warm-mid/20
              transition-colors
              focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
              ${page === currentPage
                ? 'bg-accent text-ink border-accent'
                : 'text-warm-mid hover:text-paper hover:border-warm-mid/60'
              }
            `}
          >
            {page}
          </button>
        ))}

        {/* 다음 버튼 */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="
            px-3 py-1.5
            font-mono text-xs text-warm-mid
            border border-warm-mid/20
            hover:text-paper hover:border-warm-mid/60
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors
            focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
          "
        >
          다음 &gt;
        </button>
      </div>
    </div>
  )
}
