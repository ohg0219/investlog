# PDCA Iteration Report: 04-transactions

## Overview

| Item | Value |
|------|-------|
| Feature | 04-transactions |
| Date | 2026-03-11 |
| Total Iterations | 1 |
| Final Status | ✅ SUCCESS (92% >= 90% threshold) |

## Iteration Configuration

```
Evaluators: gap-detector, code-analyzer (parallel)
Thresholds:
  combined_match_rate: 90% (Complexity: medium)
Limits:
  max_iterations: 5
TDD: enabled (Vitest + @testing-library/react + msw)
```

## Score Progression

| Iteration | Base Match Rate | Code Quality | Combined |
|-----------|----------------|--------------|---------|
| Initial (Check) | 88% | 76% | 86% |
| **1 (iterate)** | **96%** | **82%** | **92%** |

## Issues Fixed

### By Severity

| Severity | Initial | Fixed | Remaining |
|----------|---------|-------|-----------|
| High | 2 | 2 | 0 |
| Medium | 4 | 4 | 0 |
| Low | 2 | 2 | 0 |
| Warning (보안) | 5 | 3 | 2 |
| Info | 7 | 1 | 6 |

### By Category

| Category | Initial | Fixed | Remaining |
|----------|---------|-------|-----------|
| API Gap | 3 | 3 | 0 |
| UI/UX Gap | 4 | 4 | 0 |
| Security | 5 | 3 | 2 |
| Structural Gap | 2 | 2 | 0 |

## Iteration Details

### Iteration 1

**Scores:** Base Match 88% → 96% | Combined 86% → 92%

**Backend 수정 (pdca-iterator):**

- [High] GAP-01: INVALID_AMOUNT / MISSING_QUANTITY_PRICE 에러 코드 분리
  - 파일: `src/app/api/transactions/route.ts`, `src/app/api/transactions/[id]/route.ts`
  - 수정: `VALIDATION_ERROR` 통합 → `INVALID_AMOUNT`, `MISSING_QUANTITY_PRICE` 별도 반환
  - amount/quantity/price <= 0 → `INVALID_AMOUNT`, BUY/SELL에서 quantity/price 누락 → `MISSING_QUANTITY_PRICE`

- [High] GAP-02: PUT stock_id STOCK_NOT_FOUND 검증 추가
  - 파일: `src/app/api/transactions/[id]/route.ts`
  - 수정: PUT 핸들러에 bcrypt 통과 후 stocks 테이블 존재 확인 쿼리 추가, 없으면 404 `STOCK_NOT_FOUND`

- [Medium] GAP-03: 403 에러 코드 FORBIDDEN으로 변경
  - 파일: `route.ts` POST, `[id]/route.ts` PUT/DELETE
  - 수정: `WRONG_PASSWORD` → `FORBIDDEN`

- [Warning] UUID 형식 검증 추가
  - `route.ts` GET: `stock_id` 쿼리 파라미터 UUID_REGEX 검증
  - `[id]/route.ts` PUT/DELETE: `params.id` UUID_REGEX 검증

**Frontend 수정 (pdca-iterator):**

- [Medium] GAP-04: TransactionFormModal overlay 클릭 닫힘
  - 파일: `src/components/transactions/TransactionFormModal.tsx`
  - 수정: 외부 overlay div에 `onClick={onClose}`, 내부 div에 `onClick={e.stopPropagation()}`

- [Medium] GAP-05: autoFocus 추가
  - 파일: `src/components/transactions/TransactionForm.tsx`
  - 수정: 주식 선택 `<select>` 요소에 `autoFocus` prop 추가

- [Medium] GAP-06: 401 → router.push('/') 처리
  - 파일: `src/components/transactions/TransactionForm.tsx`, `src/components/transactions/PasswordConfirmModal.tsx`
  - 수정: `useRouter` import 추가, 401 응답 시 `router.push('/')` 실행

- [Low] GAP-07: 금액 필드 (직접 입력) 레이블
  - 파일: `src/components/transactions/TransactionForm.tsx`
  - 수정: `isAmountManual ? '(직접 입력)' : showQuantityPrice ? '(자동)' : '*'`

- [Low] GAP-08: 모달 열림 애니메이션
  - 파일: `src/components/transactions/TransactionFormModal.tsx`
  - 수정: `animate-in fade-in duration-200`, `animate-in zoom-in-95 duration-200` 클래스 추가

- [Structural] TransactionTypeBadge 배경색
  - 파일: `src/components/transactions/TransactionTypeBadge.tsx`
  - 수정: BUY: `bg-green-bright/20`, SELL: `bg-red-bright/20`, DIVIDEND: `bg-blue-bright/20` 추가

**테스트 업데이트:**
- `WRONG_PASSWORD` → `FORBIDDEN` 에러 코드 변경에 맞춰 MSW 핸들러 및 테스트 파일 업데이트

**Files Modified:**
- `src/app/api/transactions/route.ts`
- `src/app/api/transactions/[id]/route.ts`
- `src/components/transactions/TransactionFormModal.tsx`
- `src/components/transactions/TransactionForm.tsx`
- `src/components/transactions/PasswordConfirmModal.tsx`
- `src/components/transactions/TransactionTypeBadge.tsx`
- `src/__tests__/mocks/handlers/transactions.ts`
- `src/__tests__/components/transactions/TransactionForm.test.tsx`
- `src/__tests__/components/transactions/PasswordConfirmModal.test.tsx`
- `src/__tests__/components/transactions/TransactionsClientShell.test.tsx`

---

## Quality Metrics

### Before/After Comparison

| Metric | Before (Check) | After (Iterate 1) | Change |
|--------|----------------|-------------------|--------|
| Combined Match Rate | 86% | 92% | +6%p |
| Base Design Match | 88% | 96% | +8%p |
| Code Quality Score | 76/100 | 82/100 | +6 |
| High Severity Gaps | 2 | 0 | -2 |
| Medium Severity Gaps | 4 | 0 | -4 |
| Test Pass Rate | 161/161 (100%) | 161/161 (100%) | 유지 |
| Line Coverage | 88.73% | 88.73% | 유지 |

## Remaining Issues (Minor)

- `PasswordConfirmModal.tsx`:L60 — `console.log` 디버그 출력 프로덕션 잔존 (Info)
- `route.ts`, `[id]/route.ts` — 대규모 코드 중복 (DRY) — 리팩토링 권장 (Info)
- `TransactionForm.tsx` 560줄 Large File — `useTransactionForm` 커스텀 훅 분리 권장 (Info)
- `src/lib/transactions.ts` — 환경변수 fail-fast 검증 (Info)

## Next Steps

✅ 92% >= 90% threshold 달성 — iterate 성공

1. 완료 보고서 생성: `/pdca report 04-transactions`
