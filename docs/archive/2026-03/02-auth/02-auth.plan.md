# Auth Planning Document

> **Summary**: 비밀번호 로그인, JWT 미들웨어, 로그인/로그아웃 UI 구현
>
> **Project**: investlog
> **Version**: 0.1.0
> **Author**: dev
> **Date**: 2026-03-10
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

비밀번호 기반 단일 사용자 인증 시스템과 로그인 UI를 구현한다.
bcrypt 검증 + JWT HttpOnly 쿠키 발급으로 세션을 관리하고,
미들웨어로 `/dashboard/*` 라우트를 보호한다.

### 1.2 Background

개인 전용 서비스이므로 OAuth / 회원가입 없이 환경변수에 저장된 단일 비밀번호로 접근한다.
와이어프레임 로그인 페이지: 2분할(에디토리얼 좌측 + 폼 우측), 하단 주가 ticker 스크롤.

### 1.3 Related Documents

- Prerequisites: `docs/01-plan/features/01-foundation.plan.md`
- References: `references/PLAN.md § 4-1`, `references/wireframe.html #screen-login`

---

## 2. Scope

### 2.1 In Scope

- [ ] `POST /api/auth/login` — bcrypt 검증 후 JWT 쿠키 발급, `/dashboard` 리다이렉트
- [ ] `POST /api/auth/logout` — JWT 쿠키 삭제, `/` 리다이렉트
- [ ] `src/middleware.ts` — `/dashboard/*` JWT 검증, 미인증 시 `/` 302
- [ ] `src/app/page.tsx` — 로그인 페이지 (서버 컴포넌트, 이미 인증 시 `/dashboard` 리다이렉트)
- [ ] `src/components/auth/LoginForm.tsx` — 클라이언트 컴포넌트 폼
- [ ] 로그인 UI/UX 구현:
  - 2분할 레이아웃 (left: 브랜드, right: 폼)
  - 좌측: `INVESTLOG` 디스플레이 타이포그래피, 슬로건, 장식 SVG 차트
  - 우측: 비밀번호 입력, "접근하기 →" 버튼, 에러 메시지
  - 하단 주가 ticker 스크롤 애니메이션 (더미 데이터)
  - 커스텀 커서 (8px 금색 dot + 32px 링)
- [ ] Nav 바 — 로그인 전 숨김, 로그인 후 표시 (대시보드/주식상품/거래내역/로그아웃)

### 2.2 Out of Scope

- 비밀번호 변경 기능
- 멀티 사용자 / OAuth
- 이메일 인증

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | POST /api/auth/login: body.password → bcrypt 검증 → JWT 발급 | High | Pending |
| FR-02 | JWT 쿠키: HttpOnly, Secure, SameSite=Lax, 만료 7일 | High | Pending |
| FR-03 | 로그인 성공 → JSON { ok: true } + Set-Cookie | High | Pending |
| FR-04 | 로그인 실패 → 401 + { error: 'Invalid password' } | High | Pending |
| FR-05 | POST /api/auth/logout: 쿠키 삭제 | High | Pending |
| FR-06 | middleware.ts: /dashboard/* 미인증 → 302 → / | High | Pending |
| FR-07 | middleware.ts: 유효 JWT → 통과 | High | Pending |
| FR-08 | 로그인 페이지: 2분할 레이아웃 (wireframe 동일 디자인) | High | Pending |
| FR-09 | 비밀번호 입력 필드: letter-spacing 8px Bebas Neue, 언더라인 보더 | Medium | Pending |
| FR-10 | 에러 메시지 표시: "✕ 비밀번호가 올바르지 않습니다" | High | Pending |
| FR-11 | 하단 주가 ticker 스크롤 (CSS animation, 더미 데이터) | Medium | Pending |
| FR-12 | 커스텀 커서: 8px 금색 dot + 32px 링, pointer-events none | Low | Pending |
| FR-13 | 로그인 성공 시 클라이언트에서 /dashboard 이동 | High | Pending |
| FR-14 | 이미 인증된 사용자가 / 접근 시 /dashboard로 리다이렉트 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Security | JWT HttpOnly, Secure — JS document.cookie 접근 불가 | 브라우저 콘솔 확인 |
| Security | 비밀번호 평문 로그 없음 | 코드 리뷰 |
| UX | 로그인 폼 Enter 키 제출 지원 | 수동 테스트 |
| UX | 로딩 중 버튼 비활성화 | 수동 테스트 |
| Design | wireframe.html 로그인 화면 95% 이상 재현 | 시각 비교 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 올바른 비밀번호 입력 → JWT 쿠키 발급 → `/dashboard` 이동
- [ ] 잘못된 비밀번호 → 에러 메시지 표시, 쿠키 없음
- [ ] JWT 없이 `/dashboard` 직접 접근 → `/` 리다이렉트
- [ ] 로그아웃 → 쿠키 삭제 → `/` 이동
- [ ] 로그인 UI가 wireframe과 시각적으로 일치

### 4.2 Quality Criteria

- [ ] Zero lint errors
- [ ] TypeScript strict 통과
- [ ] 비밀번호 필드 autocomplete="current-password"

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| JWT Secret 분실 | High | Low | 환경변수 안전 보관, Vercel 대시보드 등록 |
| 미들웨어 경로 누락 | High | Low | matcher 패턴 `/dashboard/:path*` 명시 |
| 쿠키 SameSite 설정 오류 | Medium | Low | Vercel 배포 환경 테스트 |

---

## 6. Architecture Considerations

### 6.1 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 세션 방식 | JWT Cookie / Session DB | JWT Cookie | 서버리스 환경, DB 세션 불필요 |
| 미들웨어 위치 | Edge / Node | Edge (middleware.ts) | Vercel Edge Runtime 지원, 빠른 응답 |
| 쿠키명 | token / session | `token` | 단순, 충돌 없음 |

### 6.2 인증 흐름

```
[LoginForm] POST /api/auth/login { password }
  → bcrypt.compare(password, AUTH_PASSWORD_HASH)
    ├─ 실패 → 401
    └─ 성공 → jose.SignJWT → Set-Cookie: token=<jwt>
              → { ok: true }

[middleware.ts] /dashboard/* 요청
  → cookies().get('token') → jose.jwtVerify
    ├─ 유효 → 통과
    └─ 무효/만료 → 302 → /
```

---

## 7. UI/UX 상세 (wireframe 기반)

### 로그인 페이지 레이아웃

```
┌─────────────────────────────────────────────────┐
│ NAV: investLOG                    [숨김 상태]    │
├─────────────────────┬───────────────────────────┤
│  LEFT (ink bg)      │  RIGHT (paper/cream bg)   │
│                     │                           │
│  Investment Log     │  PRIVATE ACCESS           │
│                     │                           │
│  YOUR               │  비밀번호                 │
│  INVEST             │  ━━━━━━━━━━━━━━━━━━━━━    │
│  LOGGED.            │  [••••••••         ]      │
│  (accent 금색)      │                           │
│                     │  [접근하기 →]   힌트 텍스트 │
│  슬로건 설명        │                           │
│  (warm-mid)         │  ✕ 비밀번호 오류 (숨김)   │
│                     │                           │
│  ───장식 차트───    │  ━━━ticker scroll━━━━━    │
└─────────────────────┴───────────────────────────┘
```

### 컬러 토큰 (wireframe 기준)

- 배경: `--ink (#0a0a08)` / 폼 영역: `--paper (#f4f0e8)`
- 강조: `--accent (#c8a96e)` / 에러: `--red (#8b3a3a)`
- 텍스트 서브: `--warm-mid (#c8c0b0)`

---

## 8. Next Steps

1. [ ] Write design document (`02-auth.design.md`)
2. [ ] AUTH_PASSWORD_HASH 환경변수 생성 (`node -e "require('bcryptjs').hash('pw',10).then(console.log)"`)
3. [ ] JWT_SECRET 환경변수 생성 (openssl rand -base64 32)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-10 | Initial draft | dev |
