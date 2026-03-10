# 01-foundation Analysis Report

> **Analysis Type**: Gap Analysis / Code Quality / TDD Metrics
>
> **Project**: investlog
> **Version**: 0.1.0
> **Analyst**: dev
> **Date**: 2026-03-10
> **Design Doc**: [01-foundation.design.md](../02-design/features/01-foundation.design.md)
> **적용 임계값**: 90% (Complexity: medium)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

01-foundation feature의 구현 코드가 설계 문서(design.md)의 요구사항을 얼마나 충족하는지 검증한다. 라이브러리 인터페이스, 타입 정의, 보안 설계, 디자인 시스템 구성의 일치 여부를 확인하고, 코드 품질 및 TDD 메트릭을 종합하여 iterate 필요성을 판단한다.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/01-foundation.design.md`
- **Implementation Paths**: `src/lib/`, `src/types/`, `src/app/`, `tailwind.config.js`, `vercel.json`
- **Analysis Date**: 2026-03-10

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 Library Interface (Section 4)

| Design | Implementation | Status | Notes |
|--------|---------------|--------|-------|
| `supabaseAdmin` (service_role 싱글톤) | `src/lib/supabase.ts:14-17` | Match | 모듈 레벨 싱글톤 |
| `supabaseClient` (anon key) | `src/lib/supabase.ts:20-23` | Match | |
| `signJwt(payload, expiresIn): Promise<string>` | `src/lib/auth.ts:15-24` | Match | HS256, jose v6 |
| `verifyJwt(token): Promise<JwtPayload \| null>` | `src/lib/auth.ts:26-33` | Match | 실패 시 null 반환 |
| `comparePassword(plain, hash): Promise<boolean>` | `src/lib/auth.ts:35-44` | Match | 실패 시 false |
| `getQuote(ticker): Promise<PriceQuote>` | `src/lib/yahoo.ts:8-16` | Match | |
| `getHistorical() 실패 시 [] 반환` (Section 6.4) | `src/lib/yahoo.ts:18-41` | **Partial** | try/catch 없음, 예외 전파 |
| `searchTicker() 실패 시 [] 반환` (Section 6.4) | `src/lib/yahoo.ts:43-63` | **Partial** | try/catch 없음, 예외 전파 |
| `calcTotalInvested`, `calcRealizedPnL`, `calcDividendIncome` | `src/lib/calculations.ts:1-55` | Match | 평균법 포함 |
| `calcTotalReturn`, `calcWeightByStock`, `calcDailyBalance` | `src/lib/calculations.ts:56-117` | Match | |

### 2.2 Data Model (Section 3)

| Field | Design Type | Impl Type | Status |
|-------|-------------|-----------|--------|
| `Stock` (10 fields) | TypeScript interface | `src/types/index.ts:5-16` | Match |
| `Transaction` (10 fields) | TypeScript interface | `src/types/index.ts:24-35` | Match |
| `TransactionType` | `'BUY' \| 'SELL' \| 'DIVIDEND'` | `src/types/index.ts:23` | Match |
| `PriceQuote` | `{ price, currency, changePercent, name }` | `src/types/index.ts:41-46` | Match |
| `HistoricalData` | `{ date, open, high, low, close, volume }` | `src/types/index.ts:49-56` | Match |
| `SearchResult.country/currency` | 실제 값 반환 | `src/lib/yahoo.ts:59-60` (빈 문자열 고정) | **Partial** |
| `JwtPayload`, `DailyBalance`, `WeightByStock` | 설계 명세 | `src/types/index.ts:71-85` | Match |
| DB Schema SQL (stocks, transactions, triggers) | `docs/` 내 SQL 명시 | design.md Section 3.3 | **Partial** (코드 파일 없음, 수동 실행 전제) |

### 2.3 UI/UX Design (Section 5)

| Design Component | Implementation | Status |
|------------------|---------------|--------|
| 색상 토큰 12종 (ink, paper, cream 등) | `tailwind.config.js:11-31` | Match |
| fontFamily 4종 (display, serif, mono, kr) | `tailwind.config.js:33-38` | Match |
| globals.css CSS 변수 (:root) | `src/app/globals.css:5-21` | Match |
| layout.tsx html/body 구조 + metadata | `src/app/layout.tsx:47-54, 36-39` | Match |
| Google Fonts 4종 (next/font/google) | `src/app/layout.tsx:10-34` | Match |

### 2.4 Error Handling & Security (Section 6, 7)

| Design | Implementation | Status |
|--------|---------------|--------|
| 환경변수 Fail Fast — supabase.ts | `src/lib/supabase.ts:3-11` | Match |
| 환경변수 Fail Fast — auth.ts | `src/lib/auth.ts:5-7` | Match |
| `CRON_SECRET` Fail Fast (Section 6.2) | `src/app/api/cron/ping/route.ts:6` | **Partial** (런타임 401, 모듈 throw 아님) |
| verifyJwt null 반환 | `src/lib/auth.ts:30` | Match |
| comparePassword false 반환 | `src/lib/auth.ts:42` | Match |
| JWT HttpOnly Secure Lax 쿠키 | API Route에서 설정 예정 (02-auth) | N/A |
| Cron 401 인증 (CRON_SECRET) | `src/app/api/cron/ping/route.ts:5-8` | Match |
| Service Role Key 서버 전용 | `SUPABASE_SERVICE_ROLE_KEY` (NEXT_PUBLIC_ 없음) | Match |
| `server-only` 가드 / supabaseAdmin 격리 | 없음 | **Gap** (S-02) |

### 2.5 Architecture (Section 2)

| Design | Implementation | Status |
|--------|---------------|--------|
| Admin/Client 분리 | `src/lib/supabase.ts` | Match |
| vercel.json cron `0 0 * * *` | `vercel.json:4-7` | Match |
| .env.example 6개 변수 | `.env.example:2-11` | Match |
| /api/cron/ping route 구현 | `src/app/api/cron/ping/route.ts` | Match |

### 2.6 Gap 목록

| Gap ID | 심각도 | 설명 | 위치 |
|--------|--------|------|------|
| GAP-01 | Medium | `CRON_SECRET` 미설정 시 런타임 401 반환 (Fail Fast throw 아님) | `route.ts:6` |
| GAP-02 | Medium | DB SQL 마이그레이션 파일 없음 (수동 실행 전제) | 코드베이스 없음 |
| GAP-03 | Low | `getHistorical()` / `searchTicker()` 실패 시 빈 배열 미반환 (예외 전파) | `yahoo.ts:18-63` |
| GAP-04 | Low | `SearchResult.country` / `currency` 항상 빈 문자열 반환 | `yahoo.ts:59-60` |

### 2.7 Match Rate Summary

```
Base Match Rate: 92%
─────────────────────
  Match:      24 items
  Partial:     5 items
  Not Implemented: 0 items
─────────────────────
Gap severity: 0 Critical / 2 Medium / 2 Low
```

### 2.8 Acceptance Criteria Verification

| ID | Criteria | Status | Evidence |
|----|----------|--------|----------|
| AC-01 | npm run dev 에러 없이 기동 | Satisfied | layout.tsx 폰트 에러 수정 완료 (`weight: '400'` 추가) |
| AC-02 | supabaseAdmin stocks select 가능 | Satisfied | cron/ping route에 동일 쿼리 패턴 구현 |
| AC-03 | signJwt → verifyJwt → `{sub:'admin'}` | Satisfied | auth.ts:15-33 + TS-01 Green |
| AC-04 | 올바른 비밀번호 → comparePassword true | Satisfied | auth.ts:35-44 + TS-03 Green |
| AC-05 | getQuote('005930.KS') PriceQuote 반환 | Satisfied | yahoo.ts:8-16 (구조 일치) |
| AC-06 | calcRealizedPnL 평균법 계산 | Satisfied | calculations.ts:9-46 + TS-06 Green |
| AC-07 | updated_at 트리거 SQL 명시 | Partial | design.md Section 3.3 SQL 있음. 코드 마이그레이션 파일 없음 |
| AC-08 | bg-ink / text-accent / font-display 클래스 | Satisfied | tailwind.config.js:11,35,34 |
| AC-09 | CRON_SECRET 미일치 → 401 | Satisfied | route.ts:5-8 |
| AC-10 | tsc --noEmit 에러 없음 | Satisfied | 실행 확인 (0 errors) |

**AC Summary**
```
Satisfied:     9 items
Partial:       1 item  (AC-07)
Not Satisfied: 0 items
─────────────────
Iterate Required: Yes (Combined Match Rate < threshold)
```

---

## 3. Code Quality Analysis

### 3.1 Complexity Analysis

| File | Function | Complexity (CC) | Status |
|------|----------|----------------|--------|
| `calculations.ts` | `calcRealizedPnL` | 7 | Good |
| `calculations.ts` | `calcWeightByStock` | 5 | Good |
| `calculations.ts` | `calcDailyBalance` | 4 | Good |
| `yahoo.ts` | `searchTicker` | 4 | Good |
| `cron/ping/route.ts` | `GET` | 3 | Good |
| `auth.ts` | `verifyJwt` | 2 | Good |

**Max Complexity**: `calcRealizedPnL` CC=7 (기준치 이하, 문제 없음)
**Code Quality Score**: 68/100

### 3.2 Security Issues

| ID | Severity | File | Location | Issue | Recommendation |
|----|----------|------|----------|-------|----------------|
| S-01 | **Critical** | `src/lib/supabase.ts` | L14-17 | `supabaseAdmin`에 `server-only` 가드 없음 — 클라이언트 컴포넌트에서 잘못 import 시 service_role key 번들 포함 위험 | 파일 상단에 `import 'server-only'` 추가 |
| S-02 | **Critical** | `src/app/api/cron/ping/route.ts` | L12 | `error.message`를 응답 body에 직접 포함 — Supabase 내부 에러 정보 외부 노출 | generic 메시지 반환, 상세 에러는 서버 로그만 |
| S-03 | Warning | `src/app/api/cron/ping/route.ts` | L5-6 | 일반 `!==` 비교 — 이론적 타이밍 공격 가능 | `crypto.timingSafeEqual()` 사용 권장 |
| S-04 | Warning | `src/lib/auth.ts` | L29 | `as unknown as JwtPayload` 강제 캐스팅 — 런타임 타입 안전성 없음 | 명시적 타입 가드 또는 zod 검증 |
| S-05 | Warning | `src/lib/yahoo.ts` | L8, L18, L43 | 입력값 검증 없음 (빈 ticker, 특수문자) | 파라미터 유효성 검사 추가 |

---

## 4. Convention Compliance

### 4.1 Naming Convention

| Category | Convention | Compliance | Violations |
|----------|-----------|:----------:|------------|
| Types/Interfaces | PascalCase | 100% | 없음 |
| Functions | camelCase | 100% | 없음 |
| Constants/Env vars | UPPER_SNAKE_CASE | 100% | 없음 |
| DB 컬럼 매핑 | snake_case | 100% | 의도적 (DB 컨벤션) |

### 4.2 TypeScript Strict 준수

| Check | Status | Notes |
|-------|--------|-------|
| `any` 타입 직접 사용 | Pass | 없음 |
| `as unknown as T` 캐스팅 | Warning | auth.ts:29 (불가피한 jose 타입 변환) |
| `string & {}` 패턴 미사용 | Info | `'KR' \| 'US' \| string` 패턴에서 리터럴 타입 힌트 소실 |
| Null 체크 | Pass | Optional chaining 적절히 사용 |

### 4.3 에러 처리 패턴 일관성

| 파일 | 패턴 | 평가 |
|------|------|------|
| `supabase.ts` | 모듈 레벨 Fail Fast throw | 설계 일치 |
| `auth.ts` | try/catch + null/false 반환 | 설계 일치 |
| `yahoo.ts` | try/catch 없음, 예외 전파 | **설계 불일치 (GAP-03)** |
| `calculations.ts` | 기본값 반환, 예외 없음 | 설계 일치 |
| `cron/ping/route.ts` | 런타임 조건 분기 | 설계 부분 일치 (GAP-01) |

---

## 5. Test Metrics (TDD)

### 5.1 Coverage Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Line Coverage | 94.02% | 80% | **Pass** |
| Branch Coverage | 72.22% | 70% | **Pass** |
| Function Coverage | 100% | 80% | **Pass** |

- 미커버 라인: `auth.ts:6` (throw 라인 — 환경변수 미설정 경로), `auth.ts:42` / `calculations.ts:71-72` (예외 처리 분기)

### 5.2 Test Results

| Total | Passing | Failing | Skipped |
|-------|---------|---------|---------|
| 20 | **20** | 0 | 0 |

### 5.3 Test Scenario Traceability

| Design TS-ID | Test File | Status | Notes |
|--------------|-----------|--------|-------|
| TS-01 | `src/__tests__/auth.test.ts` | **Pass** | signJwt/verifyJwt 왕복 검증 |
| TS-02 | `src/__tests__/auth.test.ts` | **Pass** | 만료 토큰 → null |
| TS-03 | `src/__tests__/auth.test.ts` | **Pass** | 올바른 비밀번호 → true |
| TS-04 | `src/__tests__/auth.test.ts` | **Pass** | 틀린 비밀번호 → false |
| TS-05 | `src/__tests__/calculations.test.ts` | **Pass** | calcTotalInvested BUY 합산 |
| TS-06 | `src/__tests__/calculations.test.ts` | **Pass** | calcRealizedPnL 평균법 |
| TS-07 | `src/__tests__/calculations.test.ts` | **Pass** | calcDividendIncome 배당 합산 |
| TS-08 | `src/__tests__/calculations.test.ts` | **Pass** | calcTotalReturn 수익률 |
| TS-09 | `src/__tests__/calculations.test.ts` | **Pass** | calcTotalReturn 투자금 0 → 0 |
| TS-10 | `src/__tests__/calculations.test.ts` | **Pass** | calcDailyBalance 일별 잔고 |

### 5.4 TDD Extended Score 계산

```
test metrics:
  통과율:     20/20 = 100%  (weight: 0.5) → 50.0
  커버리지:   94.02%/80%   (weight: 0.3) → 28.2  (94.02% 그대로 사용)
  시나리오:   10/10 = 100%  (weight: 0.2) → 20.0
  ─────────────────────────
  test metrics = 98.2

TDD Extended Match Rate:
  = (design match 92% × 0.7) + (test metrics 98.2% × 0.3)
  = 64.4 + 29.5
  = 93.9% → 94%
```

### 5.5 Tech Debt Trend

| Metric | Previous | Current | Delta | Verdict |
|--------|----------|---------|-------|---------|
| Max Complexity | N/A | 7 (calcRealizedPnL) | N/A | OK |
| Avg Line Coverage | N/A | 94.0% | N/A | OK |
| Critical Issues | N/A | 2 | N/A | OK |

**최초 사이클 — N/A** (이전 분석 문서 없음)

---

## 6. Overall Score

### 6.1 Base Score (Design Match)

```
Base Match Rate (gap-detector): 92%
Code Quality Score:             68/100
───────────────────────────────────────
  Complexity:   24/25  → 낮은 복잡도 유지
  Code Smells:  22/25  → 소수 패턴 불일치
  Security:      8/25  → Critical 2개 (서버 가드, 에러 노출)
  Architecture: 14/25  → 전반적 구조 양호
```

### 6.2 Extended Score (TDD Metrics 포함)

```
TDD Extended Match Rate:
  = (design match 92% × 0.7) + (test metrics 98.2% × 0.3)
  = 93.9% → 94%

Combined Match Rate:
  = (TDD extended 94% × 0.7) + (code quality 68% × 0.3)
  = 65.8 + 20.4
  = 86.2% → 86%

Critical security issues: 2개 → cap 89% 조건 확인
  → 86% < 89%, cap 미적용

최종 Combined Match Rate: 86%
임계값(threshold): 90%
판정: 86% < 90% → iterate 권장
```

---

## 7. Recommended Actions

### 7.1 Immediate (Critical)

| Priority | Item | File | 기대 효과 |
|----------|------|------|----------|
| 1 | `supabaseAdmin` 파일 상단에 `import 'server-only'` 추가 | `src/lib/supabase.ts:1` | service_role key 클라이언트 번들 포함 방지 |
| 2 | Cron route error.message 직접 노출 제거 | `src/app/api/cron/ping/route.ts:12` | 내부 DB 에러 정보 외부 차단 |

### 7.2 Short-term (Warning / Gap)

| Priority | Item | File | 기대 효과 |
|----------|------|------|----------|
| 3 | `getHistorical()` / `searchTicker()` try/catch + 빈 배열 반환 추가 | `src/lib/yahoo.ts:18-63` | GAP-03 해소, 설계 일치 |
| 4 | `searchTicker()` 결과의 country/currency 실제 값 추출 | `src/lib/yahoo.ts:59-60` | GAP-04 해소 |
| 5 | `CRON_SECRET` 미설정 시 명시적 에러 처리 강화 | `src/app/api/cron/ping/route.ts:6` | GAP-01 해소 |
| 6 | `supabase/migrations/` 폴더 + SQL 파일 추가 | 신규 파일 | GAP-02 해소, DB 형상 관리 |

### 7.3 Low Priority (Info)

| Item | File | Notes |
|------|------|-------|
| Cron 타이밍 안전 비교 (`timingSafeEqual`) | `route.ts:6` | 이론적 보안 강화 |
| `'KR' \| 'US' \| string` 패턴 정리 | `types/index.ts:10-11` | IDE 힌트 개선 |
| `display: 'swap'` 모든 폰트 통일 | `layout.tsx:10-33` | FOUT 방지 |

---

## 8. Next Steps

- [ ] **(iterate)** Critical 이슈 2개 수정: server-only 가드, error.message 노출 제거
- [ ] **(iterate)** GAP-03, GAP-04: yahoo.ts 에러 처리 + SearchResult 필드 보완
- [ ] 이후 `/pdca iterate 01-foundation` 실행하여 90% 이상 달성 후 report 작성

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-10 | Initial analysis (gap-detector + code-analyzer + TDD metrics) | dev |
