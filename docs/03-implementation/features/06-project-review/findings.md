# 06-project-review Findings

**실행일**: 2026-03-12
**실행자**: ohg

---

## 종합 판정: FAIL

> Must Have FR 중 FR-02(TypeScript), FR-03b(빌드), FR-04(보안) 3개 FAIL

---

## FR별 결과

### FR-08: 환경변수 및 설정 파일
- **상태**: ✅ PASS
- 발견 사항:
  - `.env.example` 존재 (707 bytes)
  - 필수 키 전체 포함: `JWT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`
  - `.env`, `.env.local`, `.env.*.local` 모두 `.gitignore`에 포함

---

### FR-02: TypeScript 타입 검사
- **상태**: ❌ FAIL
- 실행 커맨드: `npx tsc --noEmit`
- exit code: 2
- 에러 건수: **1건**
- 발견 사항:

```
src/components/dashboard/StockProfitChart.tsx(48,11): error TS2322:
  Type '(value: number, name: string) => [string, string]' is not assignable to type 'Formatter<ValueType, NameType>'
  원인: Recharts Tooltip formatter의 value 파라미터 타입이 'ValueType | undefined'인데
        컴포넌트는 'number'로 받고 있어 undefined 케이스 미처리
```

- **수정 필요 위치**: `src/components/dashboard/StockProfitChart.tsx:48`

---

### FR-03a: ESLint
- **상태**: ✅ PASS
- 실행 커맨드: `npm run lint`
- exit code: 0
- 발견 사항: ESLint 에러 0건, 경고 0건

---

### FR-03b: Next.js 빌드
- **상태**: ❌ FAIL
- 실행 커맨드: `npm run build`
- 발견 사항:

```
Error: You cannot use different slug names for the same dynamic path ('id' !== 'ticker').
원인: src/app/api/stocks/ 하위에
  - [id]/route.ts (CRUD용)
  - [ticker]/history/route.ts (가격 이력 조회)
  두 개의 서로 다른 dynamic segment가 같은 레벨에 존재
  → Next.js는 같은 경로 레벨의 dynamic segment 이름이 달라지는 경우를 허용하지 않음
```

- **수정 방법 (선택지)**:
  1. `[ticker]/history/` → `[id]/history/`로 폴더명 변경 (route handler 내부 변수명도 통일)
  2. 또는 price-history API를 `/api/stocks/price-history?ticker=...` 쿼리 파라미터 방식으로 변경

---

### FR-01: 전체 테스트 실행
- **상태**: ✅ PASS
- 실행 커맨드: `npm test` (vitest run)
- 결과: **267/267 통과** (37 test files)
- failed: 0, skipped: 0
- 비고: `linearGradient` casing 경고 (Recharts SVG 관련) — 기능에 영향 없음

---

### FR-04: 보안 취약점 점검
- **상태**: ❌ FAIL
- 실행 커맨드: `npm audit --audit-level=high`
- exit code: 1
- high 건수: **4건**
- critical 건수: **0건**

| 패키지 | 심각도 | CVE | 내용 | 수정 가능 |
|--------|--------|-----|------|-----------|
| `glob` (10.2.0~10.4.5) | high | GHSA-5j98-mcp5-4vw2 | `-c/--cmd` 옵션 command injection | `npm audit fix --force` (breaking change) |
| `@next/eslint-plugin-next` | high | - | glob 의존 취약점 전이 | 위 동일 |
| `eslint-config-next` | high | - | glob 의존 취약점 전이 | 위 동일 |
| `next` (10.0.0~15.5.9) | high | GHSA-9g9p-9gw9-jx7f, GHSA-h25m-26qc-wcjf | Image Optimizer DoS, RSC HTTP deserialization DoS | `npm audit fix --force` (breaking: Next.js 16 업그레이드) |

- **비고**: `glob` 취약점은 CLI 직접 실행 시에만 해당 — 이 프로젝트에서 공격 경로 없음 (eslint-config-next 의존성, 빌드 시에만 사용)
- `next` 취약점은 프로덕션 서버 운영 시 실제 위험 존재 → 업그레이드 권장

---

### FR-05: API 엔드포인트 검증
- **상태**: ⚠️ WARNING
- 방식: 소스코드 정적 검토
- 발견 사항:
  - Route 파일 12개 확인 (설계 17개 대비 — cron/ping 경로는 실제 `src/app/api/cron/ping/route.ts` 존재, prices/lookup 존재)
  - `[ticker]/history` vs `[id]` slug 충돌 — 빌드 불가 상태 (FR-03b FAIL과 동일 원인)
  - 인증 패턴: `jose` JWT 검증 일관 적용 확인 (grep 결과에서 보호 route 다수 확인됨)

---

### FR-06: UI/UX 전체 화면 검증
- **상태**: ⏭️ SKIP
- 이유: FR-03b(빌드) FAIL로 인해 프리뷰 서버 기동 불가. 빌드 수정 후 재검증 필요.

---

### FR-07: 빌드 성능 지표
- **상태**: ⏭️ SKIP
- 이유: 빌드 실패로 번들 크기 데이터 수집 불가.

---

## 주요 발견 사항 요약

| 구분 | 심각도 | 내용 | 조치 필요 |
|------|--------|------|-----------|
| 빌드 오류 | 🔴 Critical | `api/stocks/[id]` vs `[ticker]` slug 충돌 | 즉시 수정 필요 |
| TypeScript 에러 | 🔴 High | `StockProfitChart.tsx:48` formatter 타입 불일치 | 즉시 수정 필요 |
| 보안 취약점 | 🟡 High | next 14 DoS 취약점 2건 (GHSA-9g9p, GHSA-h25m) | 업그레이드 권장 |
| 보안 취약점 | 🟢 Low(실질) | glob CLI injection (빌드 도구 전이, 공격경로 없음) | 낮은 우선순위 |
| 테스트 | ✅ Pass | 267/267 통과 | 없음 |
| 코드 품질 | ✅ Pass | ESLint 에러 0건 | 없음 |
| 환경변수 | ✅ Pass | .env.example 완비 | 없음 |
