# 04-transactions Analysis Report

> **Analysis Type**: Gap Analysis / Code Quality / TDD Metrics
>
> **Project**: investlog
> **Version**: 0.2.0
> **Analyst**: dev
> **Date**: 2026-03-11
> **Design Doc**: [04-transactions.design.md](../02-design/features/04-transactions.design.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

04-transactions 거래내역 CRUD 기능의 설계 대비 구현 일치율을 측정하고, 코드 품질 및 TDD 테스트 메트릭을 종합하여 iterate 필요 여부를 판단한다.

**적용 임계값: 90% (Complexity: medium)**

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/04-transactions.design.md`
- **Implementation Paths**: `src/app/api/transactions/`, `src/app/dashboard/transactions/`, `src/components/transactions/`, `src/lib/transactions.ts`, `src/hooks/useDebounce.ts`
- **Test Paths**: `src/__tests__/components/transactions/`, `src/__tests__/hooks/useDebounce.test.ts`
- **Analysis Date**: 2026-03-11

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 API Endpoints

| Design | Implementation | Status | Notes |
|--------|---------------|--------|-------|
| GET `/api/transactions?stock_id=` | `route.ts` GET handler | Match | stocks JOIN 포함 |
| POST `/api/transactions` | `route.ts` POST handler | Match | 201 응답 |
| PUT `/api/transactions/[id]` | `[id]/route.ts` PUT handler | Match | 200 응답 |
| DELETE `/api/transactions/[id]` | `[id]/route.ts` DELETE handler | Match | 204 응답 |
| POST `INVALID_AMOUNT` 에러 코드 | `VALIDATION_ERROR`로 통합 반환 | Changed | GAP-01 |
| POST `MISSING_QUANTITY_PRICE` 에러 코드 | `VALIDATION_ERROR`로 통합 반환 | Changed | GAP-01 |
| PUT `STOCK_NOT_FOUND` 검증 | 미구현 | Not Implemented | GAP-02 |
| 403 에러 코드: `FORBIDDEN` | `WRONG_PASSWORD`로 구현 | Changed | GAP-03 |

### 2.2 Data Model

| Field | Design Type | Impl Type | Status |
|-------|-------------|-----------|--------|
| Transaction.id | string (UUID) | string | Match |
| Transaction.type | 'BUY'\|'SELL'\|'DIVIDEND' | TransactionType union | Match |
| Transaction.amount | number | number | Match |
| Transaction.quantity | number \| null | number \| null | Match |
| Transaction.price | number \| null | number \| null | Match |
| TransactionWithStock.stock | Stock object | Stock object (JOIN) | Match |
| TransactionInput | 입력 타입 | TransactionInput | Match |

### 2.3 Component Structure

| Design Component | Implementation File | Status |
|------------------|---------------------|--------|
| TransactionsPage (Server) | `src/app/dashboard/transactions/page.tsx` | Match |
| TransactionsClientShell | `src/components/transactions/TransactionsClientShell.tsx` | Match |
| TransactionFilterBar (300ms debounce) | `src/components/transactions/TransactionFilterBar.tsx` | Match |
| TransactionTable (빈 상태 포함) | `src/components/transactions/TransactionTable.tsx` | Match |
| TransactionRow (group-hover 패턴) | `src/components/transactions/TransactionRow.tsx` | Match |
| TransactionTypeBadge | `src/components/transactions/TransactionTypeBadge.tsx` | Match |
| Pagination | `src/components/transactions/Pagination.tsx` | Match |
| TransactionFormModal (overlay 클릭 닫힘, 애니메이션) | `src/components/transactions/TransactionFormModal.tsx` | Partial |
| TransactionForm (자동 계산, DIVIDEND 조건부) | `src/components/transactions/TransactionForm.tsx` | Match |
| PasswordConfirmModal | `src/components/transactions/PasswordConfirmModal.tsx` | Match |
| useDebounce hook | `src/hooks/useDebounce.ts` | Match |

### 2.4 Match Rate Summary

```
Base Match Rate: 88%
---
  Match:           27 items (79%)
  Partial:          3 items  (9%)
  Not Implemented:  3 items  (9%)
  Changed:          3 items  (3%)
```

### 2.5 Acceptance Criteria Verification

| ID | Criteria | Status | Evidence | Notes |
|----|----------|--------|----------|-------|
| AC-01 | 거래 내역 테이블 표시 | Satisfied | `page.tsx`:L8-28 JWT 검증 후 ClientShell 렌더 | |
| AC-02 | 행 호버 시 수정/삭제 버튼 표시 | Satisfied | `TransactionRow.tsx`:L80 group-hover:opacity-100 | |
| AC-03 | 유형 필터(BUY) 적용 | Satisfied | `TransactionsClientShell.tsx`:L101 클라이언트 필터 | |
| AC-04 | 통화 필터(KRW) 적용 | Satisfied | `TransactionsClientShell.tsx`:L102 클라이언트 필터 | |
| AC-05 | 종목 검색 300ms 디바운스 | Satisfied | `TransactionsClientShell.tsx`:L44 useDebounce(300) | |
| AC-06 | 수량×단가 금액 자동 계산 | Satisfied | `TransactionForm.tsx`:L111-118 | |
| AC-07 | DIVIDEND 시 수량/단가 필드 숨김 | Satisfied | `TransactionForm.tsx`:L231 showQuantityPrice 조건 | |
| AC-08 | 저장하기 → DB 저장 후 테이블 갱신 | Satisfied | `TransactionForm.tsx`:L175-228 router.refresh() | |
| AC-09 | 삭제 비밀번호 확인 후 삭제 | Satisfied | `PasswordConfirmModal.tsx`:L59-100 DELETE 호출 | |
| AC-10 | 비밀번호 불일치 → 에러 표시, 필드 초기화 | Satisfied | 403 처리 양쪽 컴포넌트 구현 | |
| AC-11 | BUY 금액 text-red-bright 색상 | Satisfied | `TransactionRow.tsx`:L13 AMOUNT_COLOR.BUY | |
| AC-12 | SELL 금액 text-green-bright 색상 | Satisfied | `TransactionRow.tsx`:L14 AMOUNT_COLOR.SELL | |
| AC-13 | DIVIDEND 금액 text-blue-bright 색상 | Satisfied | `TransactionRow.tsx`:L15 AMOUNT_COLOR.DIVIDEND | |
| AC-14 | 거래 0건 빈 상태 + 첫 거래 추가 버튼 | Satisfied | `TransactionTable.tsx`:L19-41 | |
| AC-15 | 11건 이상 페이지네이션 동작 | Satisfied | `TransactionsClientShell.tsx`:L192 Pagination 조건 | |
| AC-16 | 주식 선택 → ticker/market/currency 배지 | Satisfied | `TransactionForm.tsx`:L272-291 배지 렌더 | |

**AC Summary**
```
Satisfied:     16 items
Partial:        0 items
Not Satisfied:  0 items
---
AC Iterate Required: No (AC 전체 충족)
```

### 2.6 Gap List

| ID | Severity | Category | Description |
|----|----------|----------|-------------|
| GAP-01 | High | API | POST/PUT에서 `INVALID_AMOUNT`, `MISSING_QUANTITY_PRICE` 별도 에러 코드 미구현. `VALIDATION_ERROR`로 통합 반환하여 클라이언트 세분화 불가 |
| GAP-02 | High | API | PUT `/api/transactions/[id]`에서 `stock_id` 변경 시 `STOCK_NOT_FOUND` 검증 누락 |
| GAP-03 | Medium | API | 403 에러 코드가 설계의 `FORBIDDEN` 아닌 `WRONG_PASSWORD`로 반환 |
| GAP-04 | Medium | UI/UX | TransactionFormModal overlay 배경 클릭 시 닫힘 미구현 |
| GAP-05 | Medium | UI/UX | TransactionFormModal 첫 입력 요소 autoFocus 미구현 |
| GAP-06 | Medium | Error | 401 UNAUTHORIZED 발생 시 `router.push('/')` 클라이언트 처리 미구현 |
| GAP-07 | Low | UI/UX | 금액 필드 `(직접 입력)` 레이블 미구현 (`(자동)`/`*`만 표시) |
| GAP-08 | Low | UI/UX | TransactionFormModal 열림/닫힘 CSS 애니메이션(scale/opacity transition) 미구현 |

**Structural Gaps:**
- `src/lib/transactions.ts`에 환경변수 fail-fast 검증 없음 (설계 6.5절 명시, API route에서만 검증)
- TransactionTypeBadge 배경색(bg-green/20, bg-red/20, bg-blue/20) 미구현 (border-current만 사용)

---

## 3. Code Quality Analysis

### 3.1 Complexity Analysis

| 파일 | Max Complexity | 수준 | 비고 |
|------|---------------|------|------|
| `src/lib/transactions.ts` | 3 | Low | 단순 CRUD |
| `src/app/api/transactions/route.ts` | 14 | High | POST 입력 검증 분기 |
| `src/app/api/transactions/[id]/route.ts` | 14 | High | PUT 함수 복잡 |
| `src/app/dashboard/transactions/page.tsx` | 2 | Low | 서버 컴포넌트 |
| `src/components/transactions/TransactionsClientShell.tsx` | 8 | Medium | useEffect + 필터링 |
| `src/components/transactions/TransactionFilterBar.tsx` | 3 | Low | |
| `src/components/transactions/TransactionTable.tsx` | 3 | Low | |
| `src/components/transactions/TransactionRow.tsx` | 4 | Low | |
| `src/components/transactions/TransactionTypeBadge.tsx` | 1 | Low | |
| `src/components/transactions/Pagination.tsx` | 3 | Low | |
| `src/components/transactions/TransactionFormModal.tsx` | 3 | Low | |
| `src/components/transactions/TransactionForm.tsx` | **16** | **Very High** | validate+submit+typeChange 복합 |
| `src/components/transactions/PasswordConfirmModal.tsx` | 7 | Medium | |
| `src/hooks/useDebounce.ts` | 1 | Low | |

### 3.2 Security Issues

| Severity | File | Location | Issue | Recommendation |
|----------|------|----------|-------|----------------|
| Warning | `route.ts` | L158 | 비밀번호 검증이 필드 검증 이후 수행 — 불필요한 연산 노출 | 비밀번호 검증을 구조 확인 직후로 이동 |
| Warning | `[id]/route.ts` | L158 | 동일 패턴: PUT에서 필드 검증 후 비밀번호 검증 | 위와 동일 |
| Warning | `[id]/route.ts` | L146 | `params.id` UUID 형식 검증 없이 DB 전달 | UUID_REGEX 사전 검증 추가 |
| Warning | `route.ts` | L42 | GET `stock_id` 파라미터 UUID 검증 없음 | UUID_REGEX 검증 추가 |
| Warning | `PasswordConfirmModal.tsx` | L60 | `console.log` 디버그 출력 프로덕션 잔존 | 배포 전 제거 |
| Warning | `TransactionForm.tsx` | L194 | 비밀번호가 요청 바디에 평문 포함 | HTTPS 강제 확인 |
| Info | `route.ts` | L8-11 | 모듈 최상위 환경변수 throw — 빌드 타임 크래시 가능 | 핸들러 내부 검증 패턴 고려 |

**Critical Issues: 0**

---

## 4. Convention Compliance

### 4.1 Naming Convention Check

| Category | Convention | Compliance | Violations |
|----------|-----------|:----------:|------------|
| Components | PascalCase | 100% | 없음 |
| Functions | camelCase | 100% | 없음 |
| Constants | UPPER_SNAKE_CASE | 95% | 일부 인라인 상수 소문자 |
| Folders | kebab-case | 100% | 없음 |

### 4.2 Code Smells

| Severity | 파일 | 설명 |
|----------|------|------|
| Warning | `route.ts` + `[id]/route.ts` | UUID_REGEX, DATE_REGEX, JWT 검증 블록 등 100줄 이상 중복 (DRY 위반) |
| Warning | `TransactionForm.tsx` | `initialFormState`가 매 렌더마다 재계산 — useMemo/useReducer 패턴 권장 |
| Warning | `TransactionFilterBar.tsx` | L25-32 `useEffect` 두 개 eslint-disable로 stale closure 위험 |
| Info | `TransactionsClientShell.tsx` | L97 `useEffect` deps 의도적 제외 + eslint-disable |
| Info | `TransactionForm.tsx` | 560줄 Large File — `useTransactionForm` 커스텀 훅 분리 권장 |
| Info | `TransactionRow.tsx` | L23 `formatNumber` 매 렌더마다 생성 — 모듈 레벨 추출 권장 |
| Info | `[id]/route.ts` | PUT/DELETE 존재 확인 후 update/delete 2-query 패턴 |
| Info | `Pagination.tsx` | L41 전체 페이지 버튼 렌더 — 대량 데이터 시 오버플로우 위험 |

---

## 5. Test Metrics (TDD)

### 5.1 Coverage Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Statement Coverage | 84.98% | 80% | **Pass** |
| Branch Coverage | 81.20% | 70% | **Pass** |
| Function Coverage | 79.64% | 80% | **Fail** (-0.36%p) |
| Line Coverage | 88.73% | 80% | **Pass** |

### 5.2 Test Results

| Total | Passing | Failing | Skipped |
|-------|---------|---------|---------|
| 161 | 161 | 0 | 0 |

### 5.3 Test Scenario Traceability (04-transactions)

| Design TS-ID | Test File | Status | Notes |
|--------------|-----------|--------|-------|
| TS-01 | `TransactionTypeBadge.test.tsx` | Pass | BUY "매수" + text-green-bright |
| TS-02 | `TransactionTypeBadge.test.tsx` | Pass | SELL "매도" + text-red-bright |
| TS-03 | `TransactionTypeBadge.test.tsx` | Pass | DIVIDEND "배당" + text-blue-bright |
| TS-10 | `TransactionRow.test.tsx` | Pass | BUY 행 DOM 요소 존재 |
| TS-11 | `TransactionRow.test.tsx` | Pass | DIVIDEND 수량/단가 "—" 표시 |
| TS-12 | `TransactionRow.test.tsx` | Pass | BUY 금액 text-red-bright |
| TS-13 | `TransactionRow.test.tsx` | Pass | SELL 금액 text-green-bright |
| TS-14 | `TransactionRow.test.tsx` | Pass | DIVIDEND 금액 text-blue-bright |
| TS-15 | `TransactionRow.test.tsx` | Pass | [수정] 클릭 → onEdit 호출 |
| TS-16 | `TransactionRow.test.tsx` | Pass | [삭제] 클릭 → onDelete 호출 |
| TS-17 | `TransactionRow.test.tsx` | Pass | 긴 메모 truncate 클래스 |
| TS-20 | `TransactionFilterBar.test.tsx` | Pass | 초기값 유형/통화 ALL |
| TS-21 | `TransactionFilterBar.test.tsx` | Pass | 유형 BUY 선택 → onFilterChange |
| TS-22 | `TransactionFilterBar.test.tsx` | Pass | 통화 KRW 선택 → onFilterChange |
| TS-23 | `TransactionFilterBar.test.tsx` | Pass | 종목 검색 타이핑 value 반영 |
| TS-24 | `TransactionFilterBar.test.tsx` | Pass | 300ms 내 연속 타이핑 콜백 미호출 |
| TS-25 | `TransactionFilterBar.test.tsx` | Pass | 300ms 후 stockSearch 콜백 1회 |
| TS-50 | `TransactionForm.test.tsx` | Pass | 초기 렌더링 — 모든 필드 DOM |
| TS-51 | `TransactionForm.test.tsx` | Pass | 주식 선택 → ticker/market/currency 배지 |
| TS-52 | `TransactionForm.test.tsx` | Pass | 주식 선택 → 현재가 배지 표시 |
| TS-54 | `TransactionForm.test.tsx` | Pass | BUY → 수량/단가 DOM 존재 |
| TS-55 | `TransactionForm.test.tsx` | Pass | DIVIDEND → 수량/단가 DOM 미존재 |
| TS-80 | `PasswordConfirmModal.test.tsx` | Pass | open=true 다이얼로그 + autoFocus |
| TS-81 | `PasswordConfirmModal.test.tsx` | Pass | open=false 다이얼로그 미존재 |
| TS-82 | `PasswordConfirmModal.test.tsx` | Pass | 비밀번호 타이핑 value 반영 |
| TS-83 | `PasswordConfirmModal.test.tsx` | Pass | DELETE 204 → onSuccess 호출 |
| TS-84 | `PasswordConfirmModal.test.tsx` | Pass | 403 → 에러 메시지 + 입력 초기화 |
| TS-85 | `PasswordConfirmModal.test.tsx` | Pass | 제출 중 [확인] 버튼 disabled |
| TS-86 | `PasswordConfirmModal.test.tsx` | Pass | isSubmitting 중 재클릭 → fetch 1회 |

---

## 5.5 Tech Debt Trend

최초 사이클 — N/A (이전 04-transactions 분석 문서 없음)

| Metric | Previous | Current | Delta | Verdict |
|--------|----------|---------|-------|---------|
| Max Complexity | N/A | 16 (TransactionForm) | N/A | OK |
| Avg Line Coverage | N/A | 88.73% | N/A | OK |
| Critical Issues | N/A | 0 | N/A | OK |

---

## 6. Overall Score

### 6.1 Base Score (Design Match)

```
Design Match Score: 88/100 (Base Gap Match Rate)
---
  AC 항목:        16/16 Satisfied (100%)
  API 구현:       5/8 완전 일치 (GAP-01, 02, 03 존재)
  컴포넌트 구현:  10/11 완전 일치 (TransactionFormModal partial)
  구조 갭:         2건 (환경변수 검증, TransactionTypeBadge 배경색)
  Code Quality:   76/100
  Critical 이슈:  0건
```

### 6.2 Extended Score (TDD Metrics)

```
TDD Extended Match Rate = (설계 일치율 × 0.7) + (테스트 메트릭 점수 × 0.3)

테스트 메트릭 점수:
  테스트 통과율:    161/161 = 100%  (weight: 0.5) → 50.0
  커버리지 달성률:  83.19% (stmt/branch/func 평균) (weight: 0.3) → 24.96
  시나리오 구현률:  29/29 = 100%    (weight: 0.2) → 20.0
  ---
  테스트 메트릭 점수 = 94.96

TDD Extended = (88 × 0.7) + (94.96 × 0.3) = 61.6 + 28.49 = 90.09%

Combined Match Rate = (TDD Extended × 0.7) + (Code Quality Score × 0.3)
                    = (90.09 × 0.7) + (76 × 0.3)
                    = 63.06 + 22.8
                    = 85.86%

최종 Combined Match Rate: 86%
적용 임계값: 90% (Complexity: medium)
```

---

## 7. Recommended Actions

### 7.1 Immediate (High Priority)

| Priority | Item | File | 설명 |
|----------|------|------|------|
| 1 | INVALID_AMOUNT / MISSING_QUANTITY_PRICE 에러 코드 분리 | `route.ts`, `[id]/route.ts` | GAP-01: VALIDATION_ERROR 통합에서 분리 |
| 2 | PUT stock_id STOCK_NOT_FOUND 검증 추가 | `[id]/route.ts` | GAP-02: stock 존재 확인 로직 필요 |
| 3 | 403 에러 코드 FORBIDDEN으로 변경 | `route.ts`, `[id]/route.ts` | GAP-03: WRONG_PASSWORD → FORBIDDEN |

### 7.2 Short-term (Medium Priority)

| Priority | Item | File | Expected Impact |
|----------|------|------|-----------------|
| 4 | TransactionFormModal overlay 클릭 닫힘 | `TransactionFormModal.tsx` | GAP-04: UX 개선 |
| 5 | TransactionFormModal autoFocus | `TransactionFormModal.tsx` | GAP-05: 접근성 개선 |
| 6 | 401 → router.push('/') 처리 | `TransactionForm.tsx`, `PasswordConfirmModal.tsx` | GAP-06: 세션 만료 처리 |
| 7 | UUID 파라미터 검증 추가 | `route.ts`, `[id]/route.ts` | 보안 강화 |
| 8 | console.log 제거 | `PasswordConfirmModal.tsx`:L60 | 프로덕션 정리 |

### 7.3 Optional (Low Priority)

| Priority | Item | File | Notes |
|----------|------|------|-------|
| 9 | 금액 필드 (직접 입력) 레이블 | `TransactionForm.tsx` | GAP-07 |
| 10 | 모달 열림/닫힘 애니메이션 | `TransactionFormModal.tsx` | GAP-08 |
| 11 | TransactionTypeBadge 배경색 | `TransactionTypeBadge.tsx` | 설계 5.5절 반영 |
| 12 | route.ts DRY 개선 (공통 유틸 추출) | `route.ts`, `[id]/route.ts` | 유지보수성 향상 |

---

## 8. Next Steps

- [x] Gap Analysis 완료 (Combined Match Rate: 86%)
- [ ] `/pdca iterate 04-transactions` 실행 (86% < 90% threshold)
  - Priority: GAP-01~03 (High), GAP-04~06 (Medium)
- [ ] iterate 후 재분석하여 90% 달성 확인
- [ ] `/pdca report 04-transactions` 실행

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-11 | Initial analysis | dev |
