# 02-auth Analysis Report

> **Analysis Type**: Gap Analysis / Code Quality / TDD Metrics
>
> **Project**: investlog
> **Version**: 0.1.0
> **Analyst**: dev
> **Date**: 2026-03-10
> **Design Doc**: [02-auth.design.md](../02-design/features/02-auth.design.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

02-auth 피처(비밀번호 로그인, JWT 미들웨어, 로그인/로그아웃 UI)의 설계 대비 구현 완성도, 코드 품질, TDD 메트릭을 종합 평가한다.

**적용 임계값: 90% (Complexity: medium)**

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/02-auth.design.md`
- **Implementation Path**: `src/middleware.ts`, `src/app/api/auth/`, `src/components/auth/`, `src/components/ui/`, `src/components/layout/`, `src/lib/auth.ts`
- **Analysis Date**: 2026-03-10

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 API Endpoints

| Design | Implementation | Status | Notes |
|--------|---------------|--------|-------|
| POST /api/auth/login | `src/app/api/auth/login/route.ts` | Match | bcrypt + JWT 쿠키 발급 완전 구현 |
| POST /api/auth/logout | `src/app/api/auth/logout/route.ts` | Match | Max-Age=0 쿠키 삭제 |
| middleware `/dashboard/:path*` | `src/middleware.ts` | Match | JWTExpired 쿠키 정리 포함 |
| 401 INVALID_PASSWORD | `route.ts:43-46` | Match | |
| 400 BAD_REQUEST | `route.ts:17-36` | Match | 파싱 실패 + 빈 문자열 모두 처리 |
| 500 INTERNAL_ERROR | `route.ts:62` | Match | |
| JWT 만료 시 쿠키 Max-Age=0 (middleware) | `middleware.ts:22-32` | Match | |

**API Match: 7/7 = 100%**

### 2.2 Data Model

| Field | Design | Implementation | Status |
|-------|--------|---------------|--------|
| `LoginRequest.password` | `string` | 런타임 타입 가드 | Match |
| `LoginResponse.ok` | `true` | `{ ok: true }` | Match |
| `ErrorResponse` | `{ error, message? }` | 전 응답에 적용 | Match |
| `JWTPayload.sub` | `'owner'` 리터럴 | `src/types/index.ts:71` — `string`, 주석 `'admin'` 오기 | Changed ⚠ |
| `TickerItem` | Section 3.1 정의 | `StockTicker.tsx` 로컬 정의 | Match |
| Fail Fast — `JWT_SECRET` | throw 즉시 | `lib/auth.ts:5-7` — throw | Match |
| Fail Fast — `AUTH_PASSWORD_HASH` | throw 즉시 | `login/route.ts:4-9` — throw | Match |
| 함수명: `createJwt` | Design Section 10.2 | `signJwt`로 구현 | Changed ℹ |

**Data Model Match: 6/8 = 75%**

### 2.3 Component Structure

| Design Component | Implementation File | Status |
|------------------|---------------------|--------|
| `LoginPage` (Server, 리다이렉트) | `src/app/page.tsx` | Match |
| `LoginForm` (Client, fetch+상태) | `src/components/auth/LoginForm.tsx` | Match |
| `StockTicker` (Server, CSS marquee) | `src/components/ui/StockTicker.tsx` | Match* |
| `CustomCursor` (Client, dot+ring) | `src/components/ui/CustomCursor.tsx` | Match |
| `NavBar` (Server) | `src/components/layout/NavBar.tsx` | Match |
| `LogoutButton` (Client) | `src/components/layout/LogoutButton.tsx` | Match |
| `CustomCursor` 전역 배치 (`layout.tsx`) | `src/app/layout.tsx:55` | Match |
| `NavBar` 배치 (`dashboard/layout.tsx`) | `src/app/dashboard/layout.tsx:10` | Match |

> *StockTicker: `onMouseEnter`/`onMouseLeave` 사용으로 `'use client'` 지시어 필요 — 빌드 시 에러 발생 가능

**Component Match: 8/8 = 100% (단, 'use client' 누락 Convention 이슈 존재)**

### 2.4 Match Rate Summary

```
Overall Base Match Rate: 87%
─────────────────────────────────────
  API Endpoints:     7/7   (100%)
  Data Model:        6/8    (75%)
  Component:         8/8   (100%)
  Error Handling:    8/9    (94%)
  Convention:        4/6    (67%)
─────────────────────────────────────
  Match:          33 items (90%)
  Changed/Partial: 6 items (10%)
  Not Implemented: 0 items  (0%)
```

### 2.5 Acceptance Criteria Verification

| ID | Criteria | Status | Evidence | Notes |
|----|----------|--------|----------|-------|
| AC-01 | POST /api/auth/login → 200 + Set-Cookie | Satisfied | `login/route.ts:52-58` | HttpOnly, Secure, SameSite=Lax, Max-Age=604800 모두 일치 |
| AC-02 | 로그인 성공 → /dashboard 이동 | Satisfied | `LoginForm.tsx:32` | router.push('/dashboard') |
| AC-03 | 잘못된 비밀번호 → 401 + INVALID_PASSWORD | Satisfied | `login/route.ts:43-46` | 쿠키 없음 확인 |
| AC-04 | "✕ 비밀번호가 올바르지 않습니다" 표시 | Satisfied | `LoginForm.tsx:87` | visibility 토글 방식 |
| AC-05 | JWT 쿠키 없음 → 302 → / | Satisfied | `middleware.ts:12-14` | matcher: /dashboard/:path* |
| AC-06 | POST /api/auth/logout → Max-Age=0 | Satisfied | `logout/route.ts:6-12` | |
| AC-07 | wireframe 95% 이상 재현 | Partial | `page.tsx` | 2분할/반응형/SVG 구현. 힌트 텍스트 누락 |
| AC-08 | Enter 키 폼 제출 | Satisfied | `LoginForm.tsx:47` | `<form onSubmit>` + `type="submit"` |
| AC-09 | fetch 진행 중 disabled, 이중 제출 방지 | Satisfied | `LoginForm.tsx:19,94` | isLoading 가드 |
| AC-10 | 기인증 → / 접근 시 /dashboard 리다이렉트 | Satisfied | `page.tsx:27-34` | verifyJwt 후 redirect |
| AC-11 | 주가 ticker 애니메이션 표시 | Satisfied | `StockTicker.tsx:74` + `page.tsx:156` | marquee 30s |
| AC-12 | 커스텀 커서(금색 dot+ring) | Satisfied | `CustomCursor.tsx:46-58` | layout.tsx 전역 |
| AC-13 | 로그인 전 NavBar 숨김 | Satisfied | `dashboard/layout.tsx:10` | root layout에 없음 |
| AC-14 | 로그인 후 4개 메뉴 표시 | Satisfied | `NavBar.tsx:25-47` | 대시보드/주식상품/거래내역/로그아웃 |

**AC Summary**
```
Satisfied:     13 items
Partial:        1 item  (AC-07 — 힌트 텍스트 누락)
Not Satisfied:  0 items
─────────────────────────────
Iterate Required: No (AC 기준)
```

---

## 3. Code Quality Analysis

### 3.1 Complexity Analysis

| File | Functions | Max CCN | Max Func Lines | File Lines | Status |
|------|-----------|---------|---------------|------------|--------|
| `src/lib/auth.ts` | 3 | 2 | 9 | 44 | Good |
| `src/middleware.ts` | 1 | 4 | 34 | 39 | Good |
| `src/app/api/auth/login/route.ts` | 1 | 6 | 51 | 64 | Good (중첩 try/if) |
| `src/app/api/auth/logout/route.ts` | 1 | 1 | 12 | 15 | Good |
| `src/app/page.tsx` | 1 | 3 | 124 | 160 | Info (JSX 포함 라인 수 많음) |
| `src/components/auth/LoginForm.tsx` | 3 | 5 | 43 | 110 | Good |
| `src/components/ui/StockTicker.tsx` | 4 | 3 | 31 | 95 | Good |
| `src/components/ui/CustomCursor.tsx` | 1 | 2 | 37 | 61 | Good |
| `src/components/layout/NavBar.tsx` | 1 | 1 | 39 | 51 | Good |
| `src/components/layout/LogoutButton.tsx` | 1 | 1 | 14 | 29 | Good |
| `src/app/dashboard/layout.tsx` | 1 | 1 | 10 | 16 | Good |
| `src/app/layout.tsx` | 1 | 1 | 11 | 60 | Good |

**CCN > 10 함수: 없음**

### 3.2 Security Issues

| Severity | File | Location | Issue | Recommendation |
|----------|------|----------|-------|----------------|
| Info | `src/middleware.ts` | L6-8 | JWT_SECRET 미설정 시 redirect 처리 (lib/auth.ts는 throw) | throw로 일관성 유지 또는 console.error 추가 |
| Info | `src/components/auth/LoginForm.tsx` | L60 | `role="textbox"` 명시 (type="password" input에 불필요) | 제거 권장 |
| Info | `src/app/page.tsx` | L17-23 | tickerItems 하드코딩 | 향후 서버 사이드 fetch로 분리 |
| Info | `src/app/api/auth/login/route.ts` | L7-9 | JWT_SECRET 이중 체크 (auth.ts 모듈 레벨에서도 throw) | 주석으로 의도 명시 |

**Critical: 0 / Warning: 0 / Info: 4**

---

## 4. Convention Compliance

### 4.1 Naming Convention Check

| Category | Convention | Compliance | Violations |
|----------|-----------|:----------:|------------|
| Components | PascalCase | 100% | 없음 |
| Functions | camelCase | 100% | 없음 |
| Constants | UPPER_SNAKE_CASE | 100% | 없음 |
| Import paths | `@/` alias | 100% | 없음 |

### 4.2 Convention Issues

| Priority | File | Issue | Recommendation |
|----------|------|-------|----------------|
| High | `src/components/ui/StockTicker.tsx` | `onMouseEnter`/`onMouseLeave` 사용 중이나 `'use client'` 없음 — 프로덕션 빌드 오류 가능 | 파일 최상단에 `'use client'` 추가 |
| Medium | `src/components/layout/NavBar.tsx` | `<a href>` 대신 Next.js `<Link>` 미사용 | `import Link from 'next/link'` 로 교체 |
| Medium | `src/components/layout/LogoutButton.tsx` | 로그아웃 fetch 실패 시 에러 처리 없음 | try/catch 추가 |
| Low | `src/lib/auth.ts` | `as unknown as JwtPayload` 이중 타입 단언 | 타입 가드 함수로 교체 권장 |
| Low | `src/types/index.ts` | `JwtPayload.sub` 주석에 `'admin'` 오기 (설계는 `'owner'`) | 주석 수정 |

**Code Quality Score: 82/100**
- Critical Security 차감: 0점
- Info x2 차감: -4점
- Convention Issues x5 차감: -15점 (-3점/개)
- 최종: 100 - 4 - 15 = **81점** (반올림 82)

---

## 5. Test Metrics (TDD)

### 5.1 Coverage Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Line Coverage | 94.11% | 80% | ✅ Pass |
| Branch Coverage | 81.25% | 70% | ✅ Pass |
| Function Coverage | 91.17% | 80% | ✅ Pass |
| Statement Coverage | 93.75% | 80% | ✅ Pass |

### 5.2 Test Results

| Total | Passing | Failing | Skipped |
|-------|---------|---------|---------|
| 47 | 47 | 0 | 0 |

### 5.3 Test Scenario Traceability

| Design TS-ID | Test File | Status | Notes |
|--------------|-----------|--------|-------|
| FE-01 | `LoginForm.test.tsx` | ✅ Pass | 비밀번호 필드 존재 |
| FE-02 | `LoginForm.test.tsx` | ✅ Pass | 버튼 활성 상태 |
| FE-03 | `LoginForm.test.tsx` | ✅ Pass | controlled input |
| FE-04 | `LoginForm.test.tsx` | ✅ Pass | 로딩 중 disabled |
| FE-05 | `LoginForm.test.tsx` | ✅ Pass | router.push('/dashboard') |
| FE-06 | `LoginForm.test.tsx` | ✅ Pass | 에러 메시지 visible |
| FE-07 | `LoginForm.test.tsx` | ✅ Pass | 실패 후 버튼 재활성 |
| FE-08 | `LoginForm.test.tsx` | ✅ Pass | 재입력 시 에러 초기화 |
| FE-09 | - | ⬜ Not Impl | 빈 비밀번호 제출 방지 (HTML required 속성으로 처리) |
| FE-10 | - | ⬜ Not Impl | Enter 키 제출 (form onSubmit으로 동작 보장) |
| FE-11 | `LoginForm.test.tsx` | ✅ Pass | autocomplete="current-password" |
| FE-12 | `LoginForm.test.tsx` | ✅ Pass | type="password" |
| FE-20 | `StockTicker.test.tsx` | ✅ Pass | 심볼 텍스트 DOM 존재 |
| FE-21 | `StockTicker.test.tsx` | ✅ Pass | 상승 green 클래스 |
| FE-22 | `StockTicker.test.tsx` | ✅ Pass | 하락 red 클래스 |
| FE-23 | `StockTicker.test.tsx` | ✅ Pass | 빈 배열 에러 없음 |
| FE-24 | `StockTicker.test.tsx` | ✅ Pass | 2벌 복제 seamless |
| FE-30 | `CustomCursor.test.tsx` | ✅ Pass | mousemove 리스너 등록 |
| FE-31 | `CustomCursor.test.tsx` | ✅ Pass | 언마운트 리스너 해제 |
| FE-32 | `CustomCursor.test.tsx` | ✅ Pass | dot/ring 요소 존재 |
| FE-33 | `CustomCursor.test.tsx` | ✅ Pass | reduced-motion 비활성화 |
| BE-01 | `middleware.test.ts` | ✅ Pass | 올바른 비밀번호 → true |
| BE-02 | `middleware.test.ts` | ✅ Pass | 잘못된 비밀번호 → false |
| BE-03 | `middleware.test.ts` | ✅ Pass | 빈 비밀번호 → false |
| BE-04 | - | ⬜ Not Impl | 로그아웃 쿠키 삭제 (코드 리뷰로 확인) |
| BE-05 | `middleware.test.ts` | ✅ Pass | 유효 JWT → payload 반환 |
| BE-06 | `middleware.test.ts` | ✅ Pass | 토큰 없음 → null |
| BE-07 | `middleware.test.ts` | ✅ Pass | 만료 JWT → null |

**구현된 시나리오: 25/28 = 89.3%**
(FE-09, FE-10, BE-04는 동작 보장되나 명시적 테스트 없음)

---

## 5.5 Tech Debt Trend

> 이전 분석 문서 없음 — 최초 사이클

| Metric | Previous | Current | Delta | Verdict |
|--------|----------|---------|-------|---------|
| Max Complexity (CCN) | N/A | 6 | N/A | 최초 사이클 — N/A |
| Avg Line Coverage | N/A | 94.11% | N/A | 최초 사이클 — N/A |
| Critical Issues | N/A | 0 | N/A | 최초 사이클 — N/A |

---

## 6. Overall Score

### 6.1 Base Score (Design Match)

```
Design Base Match Rate: 87%
─────────────────────────────────────
  API Endpoints:     100%  (7/7)
  Data Model:         75%  (6/8)
  Component:         100%  (8/8)
  Error Handling:     94%  (8.5/9)
  Convention:         67%  (4/6)
  AC Deduction:       -5pt (AC-07 Partial)
```

### 6.2 Extended Score (TDD Metrics)

```
Match Rate = (설계 일치율 × 0.7) + (테스트 메트릭 점수 × 0.3)

테스트 메트릭 점수:
  테스트 통과율:    47/47 = 100%    (weight: 0.5) → 50.0
  커버리지 달성률:  94.11%/80% cap  (weight: 0.3) → 28.2
  시나리오 구현률:  25/28 = 89.3%   (weight: 0.2) → 17.9
  ─────────────────────────────────────────────────────
  테스트 메트릭 점수 = 96.1

TDD Match Rate = (87 × 0.7) + (96.1 × 0.3)
              = 60.9 + 28.8 = 89.7%
```

### 6.3 Combined Match Rate

```
Combined Match Rate = (TDD Match Rate × 0.7) + (Code Quality × 0.3)
                    = (89.7 × 0.7) + (82 × 0.3)
                    = 62.8 + 24.6
                    = 87.4%  →  87%

Critical Security Cap: 적용 없음 (Critical 0건)
임계값: 90% (Complexity: medium)
결과: 87% < 90%  →  iterate 권장
```

---

## 7. Recommended Actions

### 7.1 Immediate (High Priority)

| Priority | Item | File | Impact |
|----------|------|------|--------|
| 1 | `'use client'` 지시어 추가 | `src/components/ui/StockTicker.tsx` | 빌드 오류 방지 |
| 2 | `JwtPayload.sub` 주석 오기 수정 (`'admin'` → `'owner'`) | `src/types/index.ts:71` | 명세 일치 |

### 7.2 Short-term (Medium Priority)

| Priority | Item | File | Expected Impact |
|----------|------|------|-----------------|
| 1 | `<a href>` → `<Link>` 교체 | `src/components/layout/NavBar.tsx` | 클라이언트 사이드 네비게이션 |
| 2 | 로그아웃 fetch 에러 처리 추가 | `src/components/layout/LogoutButton.tsx` | 오류 시 사용자 피드백 |
| 3 | LoginForm 힌트 텍스트 추가 | `src/components/auth/LoginForm.tsx` | AC-07 완전 충족 |
| 4 | FE-09, FE-10, BE-04 명시적 테스트 추가 | `LoginForm.test.tsx`, `middleware.test.ts` | 시나리오 커버리지 100% |

### 7.3 Low Priority

| Priority | Item | File |
|----------|------|------|
| 1 | `as unknown as JwtPayload` 타입 가드로 교체 | `src/lib/auth.ts` |
| 2 | middleware JWT_SECRET 누락 시 console.error 추가 | `src/middleware.ts` |

---

## 8. Next Steps

- [x] Design vs Implementation 검증 완료
- [ ] 우선순위 1: `StockTicker.tsx` `'use client'` 추가 (빌드 오류 방지)
- [ ] 우선순위 1: `types/index.ts` 주석 수정
- [ ] `/pdca iterate 02-auth` 실행 (87% < 90% 임계값)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-10 | Initial analysis | dev |
