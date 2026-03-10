# Foundation Planning Document

> **Summary**: Next.js 프로젝트 초기 설정, Supabase DB 스키마, 인증 라이브러리, 유틸리티 구성
>
> **Project**: investlog
> **Version**: 0.1.0
> **Author**: dev
> **Date**: 2026-03-10
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

investlog 프로젝트의 기반 인프라를 구성한다. 이 단계에서 설정된 구조 위에 모든 기능이 구현된다.

### 1.2 Background

`references/PLAN.md`에 기반한 개인 투자 내역 관리 서비스(investlog)를 구축한다.
Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase(PostgreSQL) 스택으로,
Vercel에 배포되는 단일 사용자 서비스이다.

### 1.3 Related Documents

- References: `references/PLAN.md`, `references/wireframe.html`

---

## 2. Scope

### 2.1 In Scope

- [ ] Next.js 14 App Router 프로젝트 생성 (`create-next-app`)
- [ ] 필수 패키지 설치: `@supabase/supabase-js`, `yahoo-finance2`, `bcryptjs`, `jose`, `recharts`
- [ ] Tailwind CSS 설정 (wireframe 색상 토큰 반영: `--ink`, `--paper`, `--accent` 등)
- [ ] 커스텀 폰트 설정: Instrument Serif, DM Mono, Bebas Neue, Noto Serif KR
- [ ] Supabase DB 스키마 SQL 작성 (`stocks`, `transactions` 테이블 + 트리거)
- [ ] `src/lib/supabase.ts` — `supabaseAdmin` / `supabaseClient` 구현
- [ ] `src/lib/auth.ts` — JWT 발급/검증, bcrypt 비밀번호 비교 함수
- [ ] `src/lib/yahoo.ts` — yahoo-finance2 래퍼 (현재가, 과거 데이터, 검색)
- [ ] `src/lib/calculations.ts` — 손익·수익률·비중 계산 함수
- [ ] `src/types/index.ts` — Stock, Transaction 타입 정의
- [ ] `.env.local` / `.env.example` 환경변수 파일 구성
- [ ] `vercel.json` — Cron 설정 (`/api/cron/ping`, UTC 00:00 매일)
- [ ] `src/app/layout.tsx` — 루트 레이아웃 (폰트, 전역 스타일)

### 2.2 Out of Scope

- UI 페이지 구현 (→ 02-auth, 03-stocks, 04-transactions, 05-dashboard)
- API Route 구현 (→ 각 feature)
- Vercel 배포 (→ 전체 구현 완료 후)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Next.js 14 App Router 프로젝트 구조 생성 | High | Pending |
| FR-02 | Supabase stocks / transactions 테이블 + 인덱스 + updated_at 트리거 | High | Pending |
| FR-03 | supabaseAdmin (service role) / supabaseClient (anon) 클라이언트 분리 | High | Pending |
| FR-04 | JWT 발급 (jose) — HttpOnly 쿠키, 만료 7일 | High | Pending |
| FR-05 | bcrypt 비밀번호 검증 함수 | High | Pending |
| FR-06 | yahoo-finance2 래퍼: quote(현재가), historical(과거), search(자동완성) | High | Pending |
| FR-07 | 손익 계산 함수: 총투자금, 실현손익(평균법), 배당수익, 수익률 | High | Pending |
| FR-08 | 포트폴리오 비중 계산 (종목별 보유금액 / 전체) | Medium | Pending |
| FR-09 | 일별 잔고 계산 (누적 BUY - 누적 SELL) | Medium | Pending |
| FR-10 | 환경변수 파일 구성 (AUTH_PASSWORD_HASH, JWT_SECRET, Supabase keys, CRON_SECRET) | High | Pending |
| FR-11 | Vercel Cron 설정 (0 0 * * * → KST 09:00) | Medium | Pending |
| FR-12 | Tailwind 색상 토큰 (ink, paper, cream, accent, green, red, blue 등) | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Security | Service Role Key 서버 전용, 클라이언트 미노출 | 코드 리뷰 |
| Security | JWT HttpOnly 쿠키, Secure 플래그 | 브라우저 개발자 도구 확인 |
| Performance | supabaseAdmin 인스턴스 모듈 레벨 싱글톤 | 코드 리뷰 |
| Type Safety | strict TypeScript, Stock/Transaction 타입 완전 정의 | tsc --noEmit |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] `npm run dev` 실행 시 에러 없이 기동
- [ ] `tsc --noEmit` 통과
- [ ] Supabase SQL 스키마 실행 가능 (SQL Editor 테스트)
- [ ] `supabaseAdmin`으로 `stocks` 테이블 더미 select 성공
- [ ] JWT 발급 후 검증 단위 테스트 통과
- [ ] bcrypt 해시/검증 단위 테스트 통과

### 4.2 Quality Criteria

- [ ] Zero lint errors (`next lint`)
- [ ] 환경변수 노출 없음 (`.env.local` gitignore 확인)
- [ ] 타입 any 없음

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| yahoo-finance2 국내 종목 데이터 불안정 | High | Medium | `.KS` / `.KQ` 티커 포맷 명시, 에러 핸들링 래퍼 |
| Supabase 무료 플랜 1주 미접속 일시정지 | Medium | High | Vercel Cron `/api/cron/ping` 일 1회 활성 유지 |
| JWT Secret 노출 | High | Low | 환경변수로만 관리, 코드에 하드코딩 금지 |

---

## 6. Architecture Considerations

### 6.1 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js 14 App Router | Next.js 14 App Router | 서버 컴포넌트, API Routes, Vercel 최적화 |
| DB | Supabase / PlanetScale | Supabase | 무료 Postgres 500MB, 대시보드 편의성 |
| 인증 | NextAuth / jose+bcrypt | jose+bcrypt | 단일 사용자, 외부 OAuth 불필요, 경량 |
| 주가 API | yahoo-finance2 / Alpha Vantage | yahoo-finance2 | API Key 불필요, 국내외 통합 |
| 스타일 | Tailwind / CSS Modules | Tailwind | 와이어프레임 디자인 시스템 토큰화 용이 |

### 6.2 디렉토리 구조

```
src/
├── app/
│   ├── layout.tsx          ← 루트 레이아웃 (폰트, 메타)
│   ├── page.tsx            ← 로그인 (02-auth)
│   ├── dashboard/          ← (05-dashboard)
│   └── api/                ← API Routes (02~05)
├── components/             ← (02~05)
├── lib/
│   ├── supabase.ts         ← ✅ 이번 feature
│   ├── auth.ts             ← ✅ 이번 feature
│   ├── yahoo.ts            ← ✅ 이번 feature
│   └── calculations.ts     ← ✅ 이번 feature
└── types/index.ts          ← ✅ 이번 feature
```

---

## 7. Next Steps

1. [ ] Write design document (`01-foundation.design.md`)
2. [ ] 환경변수 값 준비 (bcrypt 해시 생성, JWT secret 생성)
3. [ ] Supabase 프로젝트 생성 및 키 획득

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-10 | Initial draft | dev |
