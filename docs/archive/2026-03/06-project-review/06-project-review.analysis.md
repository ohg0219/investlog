# 06-project-review Analysis Report

> **Analysis Type**: Gap Analysis / Code Quality / Security Analysis
>
> **Project**: investlog
> **Version**: 1.0
> **Analyst**: ohg
> **Date**: 2026-03-12
> **Design Doc**: [06-project-review.design.md](../02-design/features/06-project-review.design.md)
> **적용 임계값**: 90% (Complexity: medium)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Do 페이즈에서 수행한 프로젝트 품질 검증(FR-01~FR-08) 결과가 design.md의 Acceptance Criteria를 충족하는지 Gap 분석하고, 수정된 코드의 품질을 평가한다.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/06-project-review.design.md`
- **Verification Output**: `docs/03-implementation/features/06-project-review/findings.md`
- **Modified Files**: `src/components/dashboard/StockProfitChart.tsx`, `src/app/api/stocks/[id]/history/route.ts`, `src/__tests__/api/stocks-history.test.ts`
- **Analysis Date**: 2026-03-12

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 Verification Execution Status

| FR | 검증 항목 | 상태 | 결과 |
|----|-----------|------|------|
| FR-08 | 환경변수 및 설정 파일 | ✅ 완료 | PASS |
| FR-02 | TypeScript 타입 검사 | ✅ 완료 (수정 후) | PASS |
| FR-03a | ESLint 검사 | ✅ 완료 | PASS |
| FR-03b | Next.js 빌드 | ✅ 완료 (수정 후) | PASS |
| FR-01 | 전체 테스트 (267개) | ✅ 완료 | PASS |
| FR-04 | npm audit (보안) | ✅ 완료 | FAIL — high 4건 |
| FR-05 | API 엔드포인트 검증 | ⚠️ 부분 완료 | 정적 검토만 수행 |
| FR-06 | UI/UX 화면 검증 | ❌ 미완료 | 빌드 fix 후 재검증 미수행 |
| FR-07 | 번들 크기 확인 | ✅ 완료 | PASS (max 227KB) |

### 2.2 Match Rate Summary

```
Base Match Rate (AC 기준): 68.75%
---
  Satisfied:     5 items (AC-01, AC-02, AC-03, AC-05, AC-08)
  Partial:       1 items (AC-06)
  Not Satisfied: 2 items (AC-04, AC-07)
```

### 2.3 Acceptance Criteria Verification

| ID | Criteria | Status | Evidence | Notes |
|----|----------|--------|----------|-------|
| AC-01 | 267/267 tests pass, failed 0 | Satisfied | findings.md FR-01: 267/267 PASS | |
| AC-02 | tsc --noEmit exit 0, 에러 0건 | Satisfied | StockProfitChart.tsx:48 타입 에러 발견 후 수정 완료 | formatter 파라미터 타입 수정 |
| AC-03 | lint error 0건, build exit 0 | Satisfied | [id] vs [ticker] slug 충돌 발견 후 [id]/history로 통일 | 빌드 정상화 |
| AC-04 | high/critical 취약점 0건 | **Not Satisfied** | npm audit: high 4건 (next DoS 2건, glob CLI 2건) | Must Have FAIL |
| AC-05 | .env.example 완비 | Satisfied | 5개 필수 키 전체 포함 확인 | |
| AC-06 | 모든 route handler 검증 완료 | **Partial** | 12개 정적 검토 (runtime 미검증, slug fix 후 재확인 미기록) | Should Have |
| AC-07 | 5개 페이지 정상 렌더링 확인 | **Not Satisfied** | 빌드 fix 후 UI 재검증 미수행 | Should Have |
| AC-08 | First Load JS <= 500KB | Satisfied | 최대 227KB (/dashboard), 전체 500KB 이하 | |

**AC Summary**
```
Satisfied:     5 items
Partial:       1 items
Not Satisfied: 2 items (AC-04 Must Have, AC-07 Should Have)
---
Iterate Required: Yes (68.75% < 90% threshold)
```

---

## 3. Code Quality Analysis

### 3.1 Complexity Analysis

| File | Function | Complexity | Level | Recommendation |
|------|----------|------------|-------|----------------|
| `StockProfitChart.tsx` | `StockProfitChart` | ~3 | Low | - |
| `stocks/[id]/history/route.ts` | `getDateRange` | ~4 | Low | - |
| `stocks/[id]/history/route.ts` | `GET` | ~6 | Low | - |
| `stocks/[id]/route.ts` | `PUT` | ~13 | Medium | 허용 범위 |
| `stocks/[id]/route.ts` | `DELETE` | ~9 | Low | - |
| `transactions/[id]/route.ts` | `PUT` | ~18 | **High** | validation 헬퍼 함수 분리 권장 |
| `transactions/[id]/route.ts` | `DELETE` | ~8 | Low | - |
| `lib/auth.ts` | `signJwt` | ~1 | Low | - |
| `lib/auth.ts` | `verifyJwt` | ~2 | Low | - |

### 3.2 Security Issues

| Severity | File | Location | Issue | Recommendation |
|----------|------|----------|-------|----------------|
| Warning | `stocks/[id]/route.ts` | L87, L176+ | `params.id` UUID 형식 검증 없음 (transactions route에는 UUID_REGEX 존재) | UUID 형식 검증 추가 |
| Warning | `stocks/[id]/history/route.ts` | L54, L64 | `ticker` 경로 파라미터 형식 검증 없이 외부 API 호출 | `/^[A-Z0-9.^=-]{1,10}$/i` 패턴 검증 추가 |
| Warning | `lib/auth.ts` | L28–29 | `payload as unknown as JwtPayload` 이중 타입 캐스팅 | zod 등 runtime 검증 추가 |
| Warning | `transactions/[id]/route.ts` | L162–168 | 필드 검증 후 비밀번호 검증 — 최소 노출 원칙 위반 | JWT 검증 직후 비밀번호 검증으로 순서 변경 |
| Warning | `stocks/[id]/route.ts` | L180 | `txError.message` console.error — 내부 스키마 노출 가능 | 에러 메시지 sanitize |

**Code Quality Score: 82/100**

---

## 4. Convention Compliance

### 4.1 Convention Issues

| Severity | File | Location | Issue | Recommendation |
|----------|------|----------|-------|----------------|
| Info | `stocks/[id]/route.ts`, `transactions/[id]/route.ts` | RouteContext 타입 | params를 동기 타입으로 정의 — Next.js 15는 비동기. `history/route.ts`는 올바르게 구현됨 | `Promise<{ id: string }>` 로 통일 |
| Info | `transactions/[id]/route.ts` | L210–218 | `NOT_FOUND` catch 분기 — dead code | 제거 권장 |
| Info | `stocks/[id]/route.ts` | L99–109 | duplicate-ticker 에러 처리 2개 if문 → 1개로 통합 가능 | `||` 조건 병합 |
| Info | `stocks-history.test.ts` | L52 | `process.env.JWT_SECRET`을 `beforeEach`에서 설정 — 모듈 동적 import 후 env 적용이 불안정 | `vi.stubEnv` 또는 `beforeAll`로 이동 |

---

## 5.5 Tech Debt Trend

> 이전 분석 문서 없음 — 최초 사이클

| Metric | Previous | Current | Delta | Verdict |
|--------|----------|---------|-------|---------|
| Max Complexity | N/A | 18 (transactions PUT) | N/A | 최초 사이클 |
| Avg Line Coverage | N/A | 267/267 pass | N/A | 최초 사이클 |
| Critical Issues | N/A | 0 | N/A | 최초 사이클 |

---

## 6. Overall Score

### 6.1 Base Score (Design Match)

```
Gap Match Rate (AC 기반):   68.75%
Code Quality Score:          82 / 100

Combined Match Rate = (68.75 × 0.7) + (82 × 0.3)
                    = 48.125 + 24.6
                    = 72.7%
```

**최종 Match Rate: 72.7% (threshold 90% 미달 → iterate 필요)**

---

## 7. Recommended Actions

### 7.1 Immediate (Must Have — iterate 대상)

| Priority | Item | 세부 내용 |
|----------|------|-----------|
| 1 | AC-07 UI/UX 재검증 | 빌드 fix 완료 — `npm run dev` 후 5개 페이지 수동 검증 수행 및 결과 findings.md에 기록 |
| 2 | AC-04 보안 취약점 해결 | next 14 DoS 취약점 (GHSA-9g9p, GHSA-h25m) — next 업그레이드 또는 workaround 적용 |

### 7.2 Short-term (Warning — 품질 개선)

| Priority | Item | File | Expected Impact |
|----------|------|------|-----------------|
| 1 | ticker 파라미터 형식 검증 | `stocks/[id]/history/route.ts:54` | SSRF/injection 방어 |
| 2 | params.id UUID 검증 | `stocks/[id]/route.ts` | transactions route와 패턴 통일 |
| 3 | RouteContext 비동기 타입 통일 | stocks, transactions [id] routes | Next.js 15 호환성 |
| 4 | transactions PUT 핸들러 분리 | `transactions/[id]/route.ts` | 복잡도 18 → 감소 |

---

## 8. Next Steps

- [ ] `/pdca iterate 06-project-review` — AC-07 UI 재검증 + AC-04 보안 취약점 대응
- [ ] iterate 완료 후 `/pdca report 06-project-review`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-12 | Initial analysis | ohg |
