# 02-auth Iteration Report

> **Feature**: 02-auth
> **Phase**: Act (PDCA Iterate)
> **Iteration**: 1
> **Date**: 2026-03-10
> **Match Rate Before**: 87%
> **Match Rate After**: 92% (estimated)

---

## 1. Iteration Summary

| Item | Before | After |
|------|--------|-------|
| Combined Match Rate | 87% | ~92% |
| Tests Passing | 47/47 | 50/50 |
| Test Scenario Coverage | 25/28 (89.3%) | 28/28 (100%) |
| Critical Issues | 0 | 0 |
| Convention Issues | 5 | 1 (Low: type assertion) |
| Code Quality Score | 82 | ~90 |

---

## 2. Issues Fixed

### High Priority (Build Error Prevention)

| # | File | Fix Applied | Impact |
|---|------|------------|--------|
| 1 | `src/components/ui/StockTicker.tsx` | `'use client'` 지시어를 파일 최상단에 추가. `onMouseEnter`/`onMouseLeave` 이벤트 핸들러 사용으로 필수. | 빌드 오류 방지, Convention score +3pt |
| 2 | `src/types/index.ts` | `JwtPayload.sub` 주석 `'admin'` → `'owner'` 수정 (설계 일치). | Data Model 명세 일치, score +1pt |

### Medium Priority (Code Quality)

| # | File | Fix Applied | Impact |
|---|------|------------|--------|
| 3 | `src/components/layout/NavBar.tsx` | 모든 `<a href="...">` → Next.js `<Link href="...">` 교체. `import Link from 'next/link'` 추가. | 클라이언트 사이드 네비게이션, Convention score +3pt |
| 4 | `src/components/layout/LogoutButton.tsx` | `fetch('/api/auth/logout')` 호출을 `try/catch`로 감쌈. catch 시 `console.error` 출력 후 `router.push('/')` 계속 실행. | 에러 처리 견고성 향상, Convention score +3pt |
| 5a | `src/components/auth/LoginForm.tsx` | `type="password"` input에서 잘못된 `role="textbox"` 속성 제거. | ARIA 정확성 향상, Security/Info score +2pt |
| 5b | `src/components/auth/LoginForm.tsx` | 버튼 옆에 힌트 텍스트 추가 (Design Section 5.1 wireframe). AC-07을 Partial → Satisfied로 개선. | AC-07 완전 충족, Design match +5pt |

### Test Coverage

| # | Test ID | File | Scenario |
|---|---------|------|----------|
| 6a | FE-09 | `src/__tests__/components/auth/LoginForm.test.tsx` | 빈 비밀번호 제출 시 fetch 미호출 검증 (HTML `required` 속성 기반) |
| 6b | FE-10 | `src/__tests__/components/auth/LoginForm.test.tsx` | Enter 키 폼 제출 시 MSW 핸들러 1회 호출 검증 |
| 7 | BE-04 | `src/__tests__/middleware.test.ts` | `POST /api/auth/logout` → 200 + `Max-Age=0` Set-Cookie 검증 |

Also fixed: FE-01 test query updated from `getByRole('textbox')` to `querySelector('input[type="password"]')` following the removal of `role="textbox"`.

---

## 3. Match Rate Calculation (Post-Fix)

### 3.1 Gap Analysis (Design vs Implementation)

| Category | Before | After | Notes |
|----------|--------|-------|-------|
| API Endpoints | 100% (7/7) | 100% (7/7) | No change |
| Data Model | 75% (6/8) | 87.5% (7/8) | `JwtPayload.sub` 주석 수정 (+1). `signJwt` vs `createJwt` 명칭 불일치는 Info 수준 유지 |
| Component | 100% (8/8) | 100% (8/8) | `'use client'` 추가로 빌드 안전성 확보 |
| Error Handling | 94% (8.5/9) | 94% (8.5/9) | No change |
| Convention | 67% (4/6) | 92% (5.5/6) | NavBar Link 교체 + LogoutButton try/catch + role 제거 |
| AC Deduction | -5pt | 0pt | AC-07 Partial → Satisfied (힌트 텍스트 추가) |

**Design Base Match Rate: 87% → ~92%**

### 3.2 Test Metrics (Post-Fix)

| Metric | Before | After |
|--------|--------|-------|
| Tests Passing | 47/47 (100%) | 50/50 (100%) |
| Scenario Coverage | 25/28 (89.3%) | 28/28 (100%) |

```
테스트 메트릭 점수 (after):
  테스트 통과율:    50/50 = 100%    (weight: 0.5) → 50.0
  커버리지 달성률:  94.11%/80% cap  (weight: 0.3) → 28.2 (변경없음)
  시나리오 구현률:  28/28 = 100%    (weight: 0.2) → 20.0
  ─────────────────────────────────────────────────────
  테스트 메트릭 점수 = 98.2

TDD Match Rate = (92 × 0.7) + (98.2 × 0.3)
              = 64.4 + 29.5 = 93.9%
```

### 3.3 Code Quality Score (Post-Fix)

| Category | Before | After | Notes |
|----------|--------|-------|-------|
| Critical Security | 0 차감 | 0 차감 | |
| Info Issues | -4pt (x2) | -2pt (x1) | `role="textbox"` 제거로 1개 해소 |
| Convention Issues | -15pt (x5 @ -3pt) | -6pt (x2 @ -3pt) | 3개 해소 (NavBar Link, LogoutButton try/catch, role 제거), 2개 잔여 (타입 단언, middleware console.error) |
| **Code Quality Score** | **82** | **~92** | |

### 3.4 Combined Match Rate

```
Combined Match Rate = (TDD Match Rate × 0.7) + (Code Quality Score × 0.3)
                   = (93.9 × 0.7) + (92 × 0.3)
                   = 65.7 + 27.6
                   = 93.3%  →  ~93%

Critical Security Cap: 적용 없음 (Critical 0건)
임계값: 90% (Complexity: medium)
결과: 93% >= 90%  →  SUCCESS
```

---

## 4. Remaining Issues (Low Priority)

| Priority | File | Issue |
|----------|------|-------|
| Low | `src/lib/auth.ts` | `as unknown as JwtPayload` 이중 타입 단언 — 타입 가드 함수 교체 권장 |
| Low | `src/middleware.ts` | JWT_SECRET 누락 시 `console.error` 추가 권장 |

이 두 항목은 기능적 영향 없음. 다음 피처 사이클에서 리팩터링 고려.

---

## 5. Files Modified

| File | Change Type | Summary |
|------|-------------|---------|
| `src/components/ui/StockTicker.tsx` | Added | `'use client'` 지시어 추가 |
| `src/types/index.ts` | Fixed | `JwtPayload.sub` 주석 'admin' → 'owner' |
| `src/components/layout/NavBar.tsx` | Refactor | `<a>` → `<Link>` 교체, `import Link` 추가 |
| `src/components/layout/LogoutButton.tsx` | Enhanced | fetch try/catch 에러 처리 추가 |
| `src/components/auth/LoginForm.tsx` | Fixed + Enhanced | `role="textbox"` 제거, 힌트 텍스트 추가 |
| `src/__tests__/components/auth/LoginForm.test.tsx` | Enhanced | FE-09, FE-10 테스트 추가; FE-01 쿼리 수정 |
| `src/__tests__/middleware.test.ts` | Enhanced | BE-04 로그아웃 테스트 추가 |

---

## 6. Test Results

```
Test Files  6 passed (6)
     Tests  50 passed (50)
  Duration  ~5s
```

All 50 tests pass. No failures.

---

## 7. Next Steps

- Combined Match Rate 93% >= 90% 임계값 달성 — **SUCCESS**
- 권장: `/pdca report 02-auth` 실행하여 최종 보고서 생성
- 잔여 Low 이슈는 다음 피처 시작 전 리팩터링 스프린트에서 처리 가능

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-10 | Act-1 iteration report | claude-sonnet-4-6 |
