# 02-auth Design Document

> **Summary**: 비밀번호 로그인, JWT 미들웨어, 로그인/로그아웃 UI 구현 — 기술 설계
>
> **Project**: investlog
> **Version**: 0.1.0
> **Author**: dev
> **Date**: 2026-03-10
> **Status**: Draft
> **Complexity**: medium
> **Planning Doc**: [02-auth.plan.md](../../01-plan/features/02-auth.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 서버리스(Vercel Edge) 환경에서 동작하는 stateless JWT 인증 구현
- Next.js 15 App Router의 서버 컴포넌트 / Edge 미들웨어를 활용한 최소 클라이언트 코드
- wireframe 기반 2분할 로그인 UI를 Tailwind CSS와 CSS animation으로 충실히 구현
- 환경변수 기반 단일 사용자 인증 — DB 의존성 없음

### 1.2 Design Principles

- **Fail Fast**: 환경변수 누락 시 서버 기동 실패 (런타임 요청 중 재확인 없음)
- **HttpOnly 쿠키 전용**: 클라이언트 JS에서 JWT에 직접 접근 불가
- **서버 컴포넌트 우선**: "use client"는 이벤트 핸들러·브라우저 API가 필요한 경우에만 사용
- **평문 비밀번호 노출 금지**: 로그, 에러 메시지 어디에도 평문 비밀번호 포함하지 않음

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser                                                          │
│  ┌────────────────┐   POST /api/auth/login    ┌────────────────┐ │
│  │  LoginForm     │ ─────────────────────────> │  API Route     │ │
│  │  (Client)      │ <──────── 200 + Set-Cookie─│  /auth/login   │ │
│  └────────────────┘                           └───────┬────────┘ │
│                                                       │bcrypt    │
│  ┌─────────────────────────────────────────────────── │ ────────┐ │
│  │  middleware.ts (Edge Runtime)                       │         │ │
│  │  /dashboard/* 요청 → JWT 검증 → 통과 or 302 /       │         │ │
│  └─────────────────────────────────────────────────── │ ────────┘ │
│                                                       │jose      │
│  ENV: AUTH_PASSWORD_HASH ─────────────────────────────┘          │
│  ENV: JWT_SECRET ─────────────────────── jose.SignJWT / Verify   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

**로그인 흐름**
```
LoginForm POST { password }
  → POST /api/auth/login
    → bcrypt.compare(password, AUTH_PASSWORD_HASH)
      ├─ 실패 → 401 { error: 'INVALID_PASSWORD' }
      └─ 성공 → jose.SignJWT({ sub: 'owner' })
                → Set-Cookie: token=<JWT>; HttpOnly; Secure; SameSite=Lax; Max-Age=604800
                → 200 { ok: true }
                → client: router.push('/dashboard')
```

**보호 라우트 흐름 (middleware.ts)**
```
Request → /dashboard/*
  → cookies().get('token')
    ├─ 없음 → NextResponse.redirect('/')
    └─ 있음 → jose.jwtVerify(token, JWT_SECRET)
               ├─ 실패/만료 → NextResponse.redirect('/')
               └─ 성공 → NextResponse.next() (요청 통과)
```

**로그아웃 흐름**
```
LogoutButton → POST /api/auth/logout
  → Set-Cookie: token=; Max-Age=0
  → 200 { ok: true }
  → client: router.push('/')
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `LoginForm` | `next/navigation` | 로그인 성공 후 `/dashboard` 이동 |
| `/api/auth/login` | `bcryptjs` | 비밀번호 해시 검증 |
| `/api/auth/login` | `jose` | JWT 서명 |
| `middleware.ts` | `jose` | JWT 검증 (Edge Runtime 호환) |
| `LoginPage (page.tsx)` | `next/headers` (cookies) | 기인증 사용자 서버 리다이렉트 |

---

## 3. Data Model

### 3.1 인증 관련 타입 정의

이 피처는 DB 테이블을 사용하지 않는다. 모든 상태는 JWT 페이로드와 HttpOnly 쿠키로 표현한다.

```typescript
// 클라이언트 → 서버 요청 바디
interface LoginRequest {
  password: string  // 평문 비밀번호. 서버에서 bcrypt 검증 후 즉시 폐기
}

// 로그인 성공 응답 바디
interface LoginResponse {
  ok: true
}

// 공통 에러 응답 포맷
interface ErrorResponse {
  error: string    // 에러 코드 (대문자 스네이크 케이스)
  message?: string // 사람이 읽을 수 있는 설명 (선택)
}

// JWT 클레임 구조 (jose 기반)
interface JWTPayload {
  sub: 'owner'  // 단일 사용자 식별자. 항상 리터럴 'owner'
  iat: number   // 발급 시각 (jose 자동 설정)
  exp: number   // 만료 시각 (발급 시각 + 7일)
}

// StockTicker 아이템
interface TickerItem {
  symbol: string        // "AAPL"
  change: number        // +1.24 (양수: 상승, 음수: 하락)
  changePercent: string // "+1.2%"
}
```

JWT 알고리즘: **HS256**. 서명 키는 `JWT_SECRET` 환경변수 값을 `TextEncoder`로 인코딩한 `Uint8Array`.

### 3.2 환경변수 스키마

| 변수명 | 타입 | 예시 | 설명 |
|--------|------|------|------|
| `AUTH_PASSWORD_HASH` | `string` | `$2a$10$...` | bcryptjs로 생성한 비밀번호 해시 (cost factor 10 권장) |
| `JWT_SECRET` | `string` | base64 32바이트 | JWT HS256 서명 키 |

생성 명령:
```bash
# AUTH_PASSWORD_HASH
node -e "require('bcryptjs').hash('YOUR_PW', 10).then(console.log)"

# JWT_SECRET
openssl rand -base64 32
```

**누락 처리 정책**: 두 변수 모두 모듈 로드 시점에 존재 여부 확인 → 누락 시 즉시 `throw` (Fail Fast).

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | 설명 | 인증 필요 |
|--------|------|------|----------|
| `POST` | `/api/auth/login` | 비밀번호 검증 후 JWT 쿠키 발급 | No |
| `POST` | `/api/auth/logout` | JWT 쿠키 삭제 | No |

### 4.2 Detailed Specification

#### `POST /api/auth/login`

**Request:**
```json
{
  "password": "string"
}
```

| 필드 | 필수 | 검증 규칙 |
|------|------|-----------|
| `password` | Y | 비어있지 않은 문자열 |

**Response 200 — 로그인 성공:**
```
HTTP/1.1 200 OK
Content-Type: application/json
Set-Cookie: token=<JWT>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800

{ "ok": true }
```

**Set-Cookie 속성 상세:**

| 속성 | 값 | 설명 |
|------|----|------|
| 이름 | `token` | 고정 쿠키명 |
| `HttpOnly` | — | JS `document.cookie` 접근 차단 |
| `Secure` | — | HTTPS 전송만 허용 |
| `SameSite` | `Lax` | CSRF 방어, 일반 네비게이션 허용 |
| `Path` | `/` | 모든 경로에서 쿠키 전송 |
| `Max-Age` | `604800` | 7일 (초 단위) |

**Error Responses:**

```
HTTP/1.1 401 Unauthorized
{ "error": "INVALID_PASSWORD", "message": "비밀번호가 올바르지 않습니다" }

HTTP/1.1 400 Bad Request
{ "error": "BAD_REQUEST", "message": "password 필드가 필요합니다" }

HTTP/1.1 500 Internal Server Error
{ "error": "INTERNAL_ERROR" }
```

---

#### `POST /api/auth/logout`

**Request:** (body 없음)

**Response 200:**
```
HTTP/1.1 200 OK
Set-Cookie: token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0

{ "ok": true }
```

---

#### Middleware — `/dashboard/*` 보호

`src/middleware.ts` (Edge Runtime). matcher: `/dashboard/:path*`

| 조건 | 동작 |
|------|------|
| `token` 쿠키 없음 | `302 /` 리다이렉트 |
| JWT 서명 무효 | `302 /` 리다이렉트 |
| JWT 만료 | `302 /` 리다이렉트 + `Max-Age=0` Set-Cookie (쿠키 정리) |
| JWT 유효 | 요청 통과 |

---

## 5. UI/UX Design

### 5.1 Screen Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  <NavBar>  investLOG    [메뉴]  [로그아웃]    ← 인증 후에만 표시 │
├────────────────────────────┬────────────────────────────────────┤
│  LEFT PANEL                │  RIGHT PANEL                       │
│  bg: ink (#0a0a08)         │  bg: paper (#f4f0e8)               │
│  w: 50vw  h: ~100dvh       │  w: 50vw  h: ~100dvh               │
│                            │                                    │
│  Investment Log            │  PRIVATE ACCESS                    │
│  (warm-mid, serif)         │  (ink, Bebas Neue display)         │
│                            │                                    │
│  YOUR                      │  비밀번호 (label)                  │
│  INVEST                    │  ─────────────────────────         │
│  LOGGED.                   │  [••••••••         ]               │
│  (accent #c8a96e, display) │  (Bebas, letter-spacing: 8px,      │
│                            │   border-bottom only)              │
│  슬로건/설명               │                                    │
│  (warm-mid)                │  [접근하기 →]   힌트 텍스트        │
│                            │                                    │
│  ~~~장식 SVG 차트~~~       │  ✕ 비밀번호가 올바르지 않습니다    │
│  (accent/warm-mid)         │  (red #8b3a3a, 기본 hidden)        │
│                            │                                    │
├────────────────────────────┴────────────────────────────────────┤
│  <StockTicker> ─ AAPL +1.2% ─ TSLA -0.8% ─ MSFT +0.3% ──>     │
└─────────────────────────────────────────────────────────────────┘

[CustomCursor]  ← pointer-events:none, position:fixed, z-index 최상단
  - 8px gold dot (cursor center)
  - 32px ring (cursor center, 80ms transition lag)
```

**반응형 분기점:**

| Breakpoint | Layout |
|---|---|
| `< 768px` | 단일 컬럼. 좌측 패널 → 상단 압축 헤더 (accent bg, 120px) |
| `768px–1023px` | 2분할 (좌 40% / 우 60%) |
| `>= 1024px` | 2분할 50% / 50% (기준) |

---

### 5.2 Component List

| 컴포넌트 | 파일 경로 | 렌더 방식 | 책임 |
|---|---|---|---|
| `LoginPage` | `src/app/page.tsx` | Server Component | 루트 페이지. 기인증 사용자 `/dashboard` 서버 리다이렉트. 2분할 레이아웃 구조 선언. |
| `LoginForm` | `src/components/auth/LoginForm.tsx` | Client Component | 비밀번호 입력, 제출, fetch 호출, 에러/로딩 상태. |
| `StockTicker` | `src/components/ui/StockTicker.tsx` | Server Component | 더미 주가 데이터 CSS marquee 애니메이션 렌더링. |
| `CustomCursor` | `src/components/ui/CustomCursor.tsx` | Client Component | mousemove 추적, 8px dot + 32px ring 커서 이펙트. `layout.tsx` 전역 배치. |
| `NavBar` | `src/components/layout/NavBar.tsx` | Server Component | 상단 네비게이션. 인증 필요 레이아웃(`dashboard/layout.tsx`)에서만 표시. |
| `LogoutButton` | `src/components/layout/LogoutButton.tsx` | Client Component | NavBar 내 로그아웃 버튼. `POST /api/auth/logout` 호출 후 `router.push('/')`. |

---

### 5.3 State Management

인증 상태(JWT 쿠키)는 서버에서만 관리. 클라이언트 컴포넌트는 UI 로컬 상태만 보유. 전역 클라이언트 상태 라이브러리 사용 안 함.

**LoginForm 로컬 상태:**

| 상태 키 | 타입 | 초기값 | 설명 |
|---|---|---|---|
| `password` | `string` | `""` | 비밀번호 입력 필드 controlled 값 |
| `isLoading` | `boolean` | `false` | fetch 요청 진행 중 여부 |
| `error` | `string \| null` | `null` | 로그인 실패 에러 메시지 |

**상태 전환:**
```
[초기] → 사용자 입력 → [입력 중] → 폼 제출 → [로딩 중 (isLoading: true)]
   → 성공: router.push('/dashboard')
   → 실패: error = "비밀번호가 올바르지 않습니다", isLoading: false, password: ""
   → 재입력 시 첫 onChange: error = null
```

---

### 5.4 Interaction Design

#### 에러 표시
- 에러 메시지 영역은 DOM에 항상 존재. `error === null`이면 `visibility: hidden` (레이아웃 유지)
- 에러 시 비밀번호 입력 필드 언더라인 보더를 `border-red (#8b3a3a)`로 변경
- `aria-live="polite"` 적용 (스크린리더 지원)
- 재입력 시 첫 `onChange`에서 `error → null` 초기화

#### 로딩 상태
- 버튼: `disabled`, 텍스트 "접근하기 →" → "접근 중...", `opacity-70`
- 비밀번호 필드: `disabled` (이중 제출 방지)

#### Enter 키 제출
- `<form onSubmit>` 네이티브 폼 동작 활용. 버튼 `type="submit"`.

#### 커스텀 커서
- `cursor-dot`: 8px, `bg-accent`, `border-radius: 50%`, `position: fixed`
- `cursor-ring`: 32px, `border: 1px solid accent`, `transition: transform 80ms ease-out`
- `document.body`: `cursor: none`
- `useEffect` cleanup으로 mousemove 리스너 제거
- `prefers-reduced-motion: reduce` 시 비활성화

#### StockTicker 스크롤
- `@keyframes marquee`: `translateX(0%)` → `translateX(-50%)` (아이템 2벌 복제, seamless loop)
- `animation: 30s linear infinite`
- 호버 시 `animation-play-state: paused`
- 상승: `text-green-bright`, 하락: `text-red-bright`

---

## 6. Error Handling

### 6.1 에러 분류

| 에러 코드 | HTTP 상태 | 발생 위치 | 설명 |
|-----------|-----------|-----------|------|
| `INVALID_PASSWORD` | 401 | `/api/auth/login` | bcrypt 검증 실패 |
| `BAD_REQUEST` | 400 | `/api/auth/login` | 요청 바디 파싱 실패 / password 누락 |
| `INTERNAL_ERROR` | 500 | 모든 API 라우트 | 예상치 못한 예외 |
| (302 리다이렉트) | 302 | `middleware.ts` | JWT 검증 실패 — JSON 응답 아님 |

### 6.2 시나리오별 처리

| 상황 | HTTP | 클라이언트 동작 |
|------|------|----------------|
| 로그인 성공 | 200 | `router.push('/dashboard')` |
| 비밀번호 오류 | 401 | 에러 메시지 표시 |
| 요청 형식 오류 | 400 | 폼 유효성 안내 |
| 서버 오류 | 500 | 일반 오류 안내 |
| 미인증 `/dashboard` 접근 | 302 | 브라우저 자동 리다이렉트 → `/` |
| 네트워크 오류 | — | fetch 예외 catch → 오류 안내 |

### 6.3 환경변수 누락

모듈 로드 시점에 `AUTH_PASSWORD_HASH`, `JWT_SECRET` 존재 여부 확인.
누락 시 즉시 `throw new Error('{VAR} is not set')` — Fail Fast.

### 6.4 bcrypt / jose 내부 예외

- `bcrypt.compare()` 예외: catch → 500 `INTERNAL_ERROR` (평문 비밀번호 로그 금지)
- `jose.SignJWT().sign()` 예외: catch → 500 `INTERNAL_ERROR`
- `jose.jwtVerify()` (미들웨어) 예외: catch → 302 리다이렉트 (예외 전파 금지)

---

## 7. Security Considerations

- [x] JWT HttpOnly 쿠키 — JS `document.cookie` 접근 불가
- [x] JWT Secure flag — HTTPS 전송만 허용
- [x] SameSite=Lax — CSRF 방어
- [x] 비밀번호 평문 로그 미포함 — bcrypt 검증 후 즉시 폐기
- [x] 에러 메시지 최소화 — 존재 여부 힌트 미노출
- [x] 환경변수로 민감 정보 관리 — 코드에 비밀번호/시크릿 하드코딩 금지
- [x] `password` 필드 `autocomplete="current-password"` 설정
- [x] Edge Runtime 미들웨어 — DB 접근 없이 빠른 인증 검사

---

## 8. Acceptance Criteria

### 8.1 Functional Acceptance Criteria

| ID | Criteria | Verification Method | Priority |
|-------|----------|---------------------|----------|
| AC-01 | Given 올바른 비밀번호 / When POST /api/auth/login / Then 200 + Set-Cookie token (HttpOnly, Secure, SameSite=Lax, Max-Age=604800) | 브라우저 개발자 도구 Network 탭 확인 | Must |
| AC-02 | Given 올바른 비밀번호 / When 로그인 성공 / Then 클라이언트에서 /dashboard로 이동 | 수동 테스트 | Must |
| AC-03 | Given 잘못된 비밀번호 / When POST /api/auth/login / Then 401 + { error: 'INVALID_PASSWORD' } + 쿠키 없음 | 수동 테스트 / curl | Must |
| AC-04 | Given 잘못된 비밀번호 / When 응답 수신 / Then 에러 메시지 "✕ 비밀번호가 올바르지 않습니다" 표시 | 수동 테스트 | Must |
| AC-05 | Given JWT 쿠키 없음 / When /dashboard 직접 접근 / Then 302 → / 리다이렉트 | 수동 테스트 | Must |
| AC-06 | Given 로그인 상태 / When POST /api/auth/logout / Then Set-Cookie token Max-Age=0 (쿠키 삭제) | 브라우저 쿠키 확인 | Must |
| AC-07 | Given 로그인 UI / When 시각 비교 / Then wireframe 로그인 화면 95% 이상 재현 | 시각 비교 (스크린샷) | Must |
| AC-08 | Given 비밀번호 필드 / When Enter 키 / Then 폼 제출 (버튼 클릭과 동일 동작) | 수동 테스트 | Must |
| AC-09 | Given fetch 진행 중 / When 버튼/Enter 재입력 / Then 버튼 disabled, 이중 제출 없음 | 수동 테스트 | Must |
| AC-10 | Given 이미 인증된 상태 / When / 접근 / Then /dashboard 서버 리다이렉트 | 수동 테스트 | Should |
| AC-11 | Given 로그인 페이지 / When 렌더링 / Then 하단 주가 ticker 스크롤 애니메이션 표시 | 수동 테스트 | Should |
| AC-12 | Given 로그인 페이지 / When 마우스 이동 / Then 커스텀 커서(금색 dot + ring) 표시 | 수동 테스트 | Could |
| AC-13 | Given NavBar / When 로그인 전 / Then NavBar 숨김 | 수동 테스트 | Must |
| AC-14 | Given NavBar / When 로그인 후 / Then 대시보드/주식상품/거래내역/로그아웃 메뉴 표시 | 수동 테스트 | Must |

### 8.2 Non-Functional Acceptance Criteria

| Category | Criteria | Measurement Method |
|---|---|---|
| Security | JWT `HttpOnly` — 브라우저 콘솔 `document.cookie`에 token 미노출 | 브라우저 콘솔 확인 |
| Security | 비밀번호 평문이 서버 로그에 없음 | 코드 리뷰 |
| Security | `autocomplete="current-password"` 속성 존재 | DOM 검사 |
| UX | Enter 키 제출 지원 | 수동 테스트 |
| UX | 로딩 중 버튼 비활성화 | 수동 테스트 |
| Code Quality | Zero lint errors | ESLint 실행 결과 |
| Code Quality | TypeScript strict 통과 | `tsc --noEmit` |

### 8.3 Edge Cases

| ID | Scenario | Expected Behavior |
|---|---|---|
| EC-01 | 네트워크 오류 (fetch reject) | `isLoading: false`, 일반 오류 메시지 표시. `router.push` 미호출 |
| EC-02 | 로딩 중 중복 제출 | 버튼 `disabled`로 추가 fetch 호출 차단 |
| EC-03 | 비밀번호 1000자 이상 입력 | 레이아웃 유지, fetch 정상 호출, 서버 401 반환 |
| EC-04 | 특수문자 / 멀티바이트 문자 입력 | `onChange` 정상 동작, value 정확히 반영 |
| EC-05 | JWT 쿠키 만료 후 `/dashboard` 접근 | middleware 302 리다이렉트, 만료 쿠키 `Max-Age=0` 정리 |
| EC-06 | `prefers-reduced-motion: reduce` | 커스텀 커서 비활성화, 기본 커서 복원 |
| EC-07 | `AUTH_PASSWORD_HASH` 환경변수 누락 | 서버 기동 즉시 실패 (Fail Fast) |
| EC-08 | ticker `change: 0` (보합) | neutral 색상(`text-warm-mid`) 적용, 렌더링 오류 없음 |

---

## 9. TDD Test Scenarios

### 9.1 Test Strategy

- **Approach**: TDD (Red-Green-Refactor)
- **Scope**: LoginForm 유닛, middleware 로직, API Route handler
- **Coverage Target**: 80%+
- **Test Framework**: Vitest + @testing-library/react + @testing-library/user-event + msw

**테스트 파일 위치:**
```
src/
  __tests__/
    components/
      auth/
        LoginForm.test.tsx
      ui/
        StockTicker.test.tsx
        CustomCursor.test.tsx
    lib/
      auth.test.ts         ← verifyJwt, createJwt 유닛 테스트
    middleware.test.ts
```

### 9.2 Test Scenario List

#### LoginForm 유닛 테스트

**사전 조건**: `next/navigation`의 `useRouter` mock, MSW로 `/api/auth/login` 핸들러 설정.

| ID | 시나리오 | 입력 조건 | 기대 결과 | Priority |
|---|---|---|---|---|
| FE-01 | 초기 렌더링 — 비밀번호 필드 존재 | 컴포넌트 마운트 | input 존재, 에러 요소 비표시 | Critical |
| FE-02 | 초기 렌더링 — 제출 버튼 활성 | 컴포넌트 마운트 | "접근하기" 버튼 `not.toBeDisabled()` | Critical |
| FE-03 | controlled input 반영 | `userEvent.type(input, 'hello')` | input value = 'hello' | High |
| FE-04 | 폼 제출 시 로딩 상태 | 비밀번호 입력 후 클릭, MSW 지연 | 버튼/필드 `toBeDisabled()` | Critical |
| FE-05 | 로그인 성공 — router.push | MSW `{ ok: true }` 응답 | `mockRouter.push('/dashboard')` 1회 호출 | Critical |
| FE-06 | 로그인 실패 — 에러 메시지 | MSW 401 응답 | "비밀번호가 올바르지 않습니다" `toBeVisible()` | Critical |
| FE-07 | 실패 후 버튼 재활성화 | MSW 401 응답 후 | 버튼/필드 `not.toBeDisabled()` | High |
| FE-08 | 재입력 시 에러 초기화 | FE-06 상태에서 `userEvent.type` | 에러 메시지 비표시 | High |
| FE-09 | 빈 비밀번호 제출 방지 | 빈 필드 버튼 클릭 | fetch 미호출 (HTML required) | High |
| FE-10 | Enter 키 폼 제출 | 입력 후 `userEvent.keyboard('{Enter}')` | MSW 핸들러 1회 호출 | High |
| FE-11 | autocomplete 속성 확인 | 컴포넌트 마운트 | `autocomplete="current-password"` | Medium |
| FE-12 | input type="password" 확인 | 컴포넌트 마운트 | `type="password"` | High |

#### StockTicker 렌더 테스트

| ID | 시나리오 | 입력 조건 | 기대 결과 | Priority |
|---|---|---|---|---|
| FE-20 | 기본 렌더링 | `items=[{symbol:'AAPL', change:1.24, ...}]` | "AAPL" 텍스트 DOM 존재 | High |
| FE-21 | 상승 종목 색상 | `change: 1.24` | green 클래스 적용 | Medium |
| FE-22 | 하락 종목 색상 | `change: -0.8` | red 클래스 적용 | Medium |
| FE-23 | 빈 배열 props | `items=[]` | 에러 없이 렌더링 | High |
| FE-24 | seamless loop 복제 | 3개 items | 동일 심볼 2회 이상 존재 | Medium |

#### CustomCursor 이벤트 테스트

| ID | 시나리오 | 입력 조건 | 기대 결과 | Priority |
|---|---|---|---|---|
| FE-30 | 마운트 시 리스너 등록 | 컴포넌트 마운트 | `addEventListener('mousemove')` 1회 호출 | High |
| FE-31 | 언마운트 시 리스너 해제 | `unmount()` 후 | `removeEventListener('mousemove')` 1회 호출 | High |
| FE-32 | dot · ring 요소 존재 | 마운트 | `cursor-dot`, `cursor-ring` testid 각 1개 | High |
| FE-33 | prefers-reduced-motion | matchMedia mock | cursor 요소 렌더링 안 됨 | Medium |

#### API Route / Middleware 유닛 테스트

| ID | 시나리오 | 입력 조건 | 기대 결과 | Priority |
|---|---|---|---|---|
| BE-01 | 올바른 비밀번호 로그인 | 유효 password, 유효 env | 200 + Set-Cookie token | Critical |
| BE-02 | 잘못된 비밀번호 로그인 | 잘못된 password | 401 INVALID_PASSWORD | Critical |
| BE-03 | 빈 password 필드 | `{ password: '' }` | 400 BAD_REQUEST | High |
| BE-04 | 로그아웃 | POST /api/auth/logout | 200 + Max-Age=0 쿠키 | High |
| BE-05 | middleware 유효 JWT | 유효 JWT 쿠키 | NextResponse.next() | Critical |
| BE-06 | middleware 쿠키 없음 | 쿠키 미포함 요청 | 302 / 리다이렉트 | Critical |
| BE-07 | middleware 만료 JWT | 만료된 JWT | 302 / 리다이렉트 | High |

### 9.3 Edge Cases (참고: 8.3과 연동)

| ID | 케이스 | 예상 동작 | 검증 방법 |
|---|---|---|---|
| EC-01 | 네트워크 오류 | 에러 메시지 표시, push 미호출 | MSW network error 설정 |
| EC-02 | 로딩 중 중복 제출 | fetch 1회만 호출 | `vi.spyOn(global, 'fetch')` |
| EC-03 | 비밀번호 1000자 이상 | 렌더링 유지, 401 반환 | 스냅샷 비교 |
| EC-04 | 한글+특수문자 입력 | value 정확히 반영 | `userEvent.type` 후 value 검증 |

### 9.4 Test Implementation Order

1. **BE-05, BE-06** — middleware 핵심 로직 (인증 흐름의 기반)
2. **BE-01, BE-02** — login API Route (bcrypt + JWT 서명)
3. **BE-03, BE-04** — 엣지 케이스 (logout, bad request)
4. **FE-04 ~ FE-08** — LoginForm 핵심 시나리오 (fetch 흐름)
5. **FE-01 ~ FE-03, FE-09 ~ FE-12** — LoginForm 나머지
6. **FE-20 ~ FE-33** — UI 컴포넌트 (StockTicker, CustomCursor)

---

## 10. Implementation Guide

### 10.1 File Structure

```
src/
  app/
    page.tsx                         ← 로그인 페이지 (Server Component)
    layout.tsx                       ← CustomCursor 전역 배치
    dashboard/
      layout.tsx                     ← NavBar 배치 (인증 후 표시)
  app/api/
    auth/
      login/
        route.ts                     ← POST /api/auth/login
      logout/
        route.ts                     ← POST /api/auth/logout
  components/
    auth/
      LoginForm.tsx                  ← Client Component
    layout/
      NavBar.tsx                     ← Server Component
      LogoutButton.tsx               ← Client Component
    ui/
      StockTicker.tsx                ← Server Component
      CustomCursor.tsx               ← Client Component
  lib/
    auth.ts                          ← createJwt, verifyJwt 유틸
  middleware.ts                      ← Edge Runtime 미들웨어
  __tests__/
    components/auth/LoginForm.test.tsx
    components/ui/StockTicker.test.tsx
    components/ui/CustomCursor.test.tsx
    lib/auth.test.ts
    middleware.test.ts
```

### 10.2 Implementation Order

1. [ ] `src/lib/auth.ts` — `createJwt`, `verifyJwt` 유틸 함수 (jose 래핑)
2. [ ] `src/middleware.ts` — `/dashboard/*` JWT 검증
3. [ ] `src/app/api/auth/login/route.ts` — bcrypt 검증 + JWT 쿠키 발급
4. [ ] `src/app/api/auth/logout/route.ts` — 쿠키 삭제
5. [ ] `src/app/page.tsx` — 로그인 페이지 서버 컴포넌트 (리다이렉트 로직 포함)
6. [ ] `src/components/auth/LoginForm.tsx` — 로그인 폼 클라이언트 컴포넌트
7. [ ] `src/components/ui/StockTicker.tsx` — ticker 애니메이션
8. [ ] `src/components/ui/CustomCursor.tsx` — 커서 이펙트
9. [ ] `src/components/layout/NavBar.tsx` + `LogoutButton.tsx`
10. [ ] `src/app/dashboard/layout.tsx` — NavBar 배치
11. [ ] `src/app/layout.tsx` — CustomCursor 배치
12. [ ] 테스트 작성 (TDD: 각 구현 전 테스트 먼저 작성)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-10 | Initial draft | dev |
