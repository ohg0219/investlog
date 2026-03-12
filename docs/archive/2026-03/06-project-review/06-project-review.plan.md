# 06-project-review Planning Document

> **Summary**: investlog 프로젝트 전체 품질 점검 - 코드 품질, 테스트, 보안, 성능, UI/UX 완성도 확인
>
> **Project**: investlog
> **Version**: 1.0
> **Author**: ohg
> **Date**: 2026-03-12
> **Status**: Draft
> **Complexity**: medium

---

## 1. Overview

### 1.1 Purpose

investlog 프로젝트의 8개 피처(01-foundation ~ 05-04-dashboard-stock-realtime) 개발 완료 후, 프로젝트 전반에 걸친 품질 점검을 수행한다. 테스트 통과율, 타입 안전성, 빌드 안정성, 보안 취약점, API 동작, UI/UX 완성도, 성능 지표, 환경 설정을 종합적으로 검증하여 프로덕션 준비 상태를 확인한다.

### 1.2 Background

- 8개 피처가 개별 PDCA 사이클을 통해 순차적으로 개발 완료됨
- 각 피처는 개별적으로 검증되었으나, 전체 통합 관점의 점검은 미수행
- 267개 테스트가 존재하며, 전체 통합 상태에서의 안정성 확인 필요
- 프로덕션 배포 전 최종 품질 게이트 역할

### 1.3 Related Documents

- Archive: `docs/archive/2026-03/` (01~05-04 피처 문서)
- 테스트: `__tests__/`, `src/**/*.test.*`

---

## 2. Scope

### 2.1 In Scope

- [ ] 전체 테스트 스위트 실행 및 통과 확인
- [ ] TypeScript 컴파일 에러 점검
- [ ] ESLint 및 빌드 검증
- [ ] 보안 취약점 스캔 (npm audit)
- [ ] API 엔드포인트 정상 동작 확인
- [ ] UI/UX 전체 화면 동작 확인
- [ ] Next.js 빌드 성능 지표 확인
- [ ] 환경변수 및 설정 파일 점검

### 2.2 Out of Scope

- 새로운 기능 개발
- 대규모 리팩토링
- 성능 최적화 작업 (지표 확인만 수행)
- CI/CD 파이프라인 구성
- 프로덕션 배포

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 전체 테스트 통과 확인 (267개 테스트) | Must Have | Pending |
| FR-02 | TypeScript 타입 에러 0건 확인 (`npx tsc --noEmit`) | Must Have | Pending |
| FR-03 | ESLint/빌드 오류 0건 확인 (`npm run lint`, `npm run build`) | Must Have | Pending |
| FR-04 | 보안 취약점 점검 (npm audit, OWASP Top 10 체크리스트) | Must Have | Pending |
| FR-05 | API 엔드포인트 정상 동작 확인 (각 route handler 검증) | Should Have | Pending |
| FR-06 | UI/UX 전체 화면 동작 확인 (Playwright E2E 또는 수동 검증) | Should Have | Pending |
| FR-07 | 성능 지표 확인 (Next.js build output 번들 크기, 페이지별 로딩) | Could Have | Pending |
| FR-08 | 환경변수 및 설정 파일 점검 (.env.example 완비, next.config 검증) | Must Have | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Reliability | 전체 테스트 267/267 통과 | `npm test` 실행 |
| Type Safety | TypeScript 컴파일 에러 0건 | `npx tsc --noEmit` |
| Code Quality | ESLint 에러 0건 | `npm run lint` |
| Security | npm audit high/critical 0건 | `npm audit` |
| Build Stability | 빌드 성공 | `npm run build` |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] FR-01~FR-08 모든 항목 검증 완료
- [ ] Critical/High 보안 이슈 0건
- [ ] 테스트 전체 통과
- [ ] 빌드 성공
- [ ] 점검 결과 문서화 완료

### 4.2 Quality Criteria

- [ ] 테스트 통과율 100%
- [ ] TypeScript 에러 0건
- [ ] ESLint 에러 0건
- [ ] 빌드 정상 완료
- [ ] npm audit high/critical 0건

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 피처 간 통합 시 테스트 충돌 | High | Low | 개별 피처별 테스트 격리 확인 |
| npm 의존성 보안 취약점 발견 | Medium | Medium | patch 가능한 것은 즉시 업데이트, 불가능한 것은 위험도 평가 후 문서화 |
| 빌드 시 번들 크기 과다 | Low | Low | 번들 분석 후 개선 권고사항 문서화 (이번 scope에서는 수정 안 함) |
| Playwright 미설치로 E2E 검증 불가 | Medium | Medium | 수동 검증 또는 기존 단위/통합 테스트로 대체 |

---

## 6. Architecture Considerations

### 6.1 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 검증 방식 | 자동화 스크립트 / 수동 점검 | 자동화 우선 + 수동 보완 | 반복 가능성, 정확성 확보 |
| 보안 점검 도구 | npm audit / snyk / OWASP ZAP | npm audit + OWASP 체크리스트 | 추가 도구 설치 없이 실행 가능 |
| E2E 테스트 | Playwright / Cypress / 수동 | Playwright (가능 시) | Next.js 공식 권장 |
| 성능 측정 | Lighthouse / build output | Next.js build output | 별도 서버 기동 불요 |

---

## 7. Next Steps

1. [ ] Write design document (`06-project-review.design.md`)
2. [ ] 검증 항목별 상세 체크리스트 작성
3. [ ] 검증 실행 및 결과 기록

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-12 | Initial draft | ohg |
