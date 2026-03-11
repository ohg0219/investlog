# Transactions Management Planning Document

> **Summary**: 거래 내역(매수/매도/배당) CRUD 관리 — 테이블 UI, 필터, 폼 모달, API
>
> **Project**: investlog
> **Version**: 0.1.0
> **Author**: dev
> **Date**: 2026-03-10
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

사용자의 주식 매수/매도/배당 거래 내역을 기록·조회·수정·삭제하는 기능을 구현한다.
에디토리얼 스타일의 테이블 UI와 오버레이 모달 폼으로 구성된다.

### 1.2 Background

거래 내역은 대시보드 차트 데이터의 원천이므로 정확한 입력이 중요하다.
와이어프레임: 상단 필터 컨트롤 + 전체 테이블 + 페이지네이션, 추가 시 모달 오버레이.
주식상품(stocks) 테이블이 먼저 구성되어 있어야 한다.

### 1.3 Related Documents

- Prerequisites: `docs/01-plan/features/01-foundation.plan.md`, `docs/01-plan/features/03-stocks.plan.md`
- References: `references/PLAN.md § 4-4, § 6`, `references/wireframe.html #screen-transactions, #screen-modal-add, #screen-modal-pw`

---

## 2. Scope

### 2.1 In Scope

- [ ] `GET /api/transactions` — 전체 조회 (stock_id 필터, JWT)
- [ ] `POST /api/transactions` — 추가 (JWT + 비밀번호)
- [ ] `PUT /api/transactions/[id]` — 수정 (JWT + 비밀번호)
- [ ] `DELETE /api/transactions/[id]` — 삭제 (JWT + 비밀번호)
- [ ] `/dashboard/transactions` 페이지
- [ ] `TransactionTable.tsx` — 전체 테이블 (날짜/유형/종목코드/종목명/수량/단가/금액/통화/메모/액션)
- [ ] 필터 컨트롤: 유형(전체/매수/매도/배당), 통화(전체/KRW/USD), 종목 검색
- [ ] 페이지네이션 (10건씩)
- [ ] `TransactionForm.tsx` — 거래 추가/수정 모달 폼
  - 주식상품 선택 드롭다운 (등록된 종목 목록)
  - 선택 시 종목 정보 배지 자동 표시 (ticker, market, currency, 현재가)
  - 유형 선택 (매수/매도/배당, 3-grid 버튼)
  - 날짜, 수량(BUY/SELL), 단가(BUY/SELL), 금액(자동 계산 또는 수동)
  - 메모 (선택)
  - 비밀번호 입력 섹션 (점선 구분)
- [ ] `PasswordConfirmModal.tsx` — 삭제 전 비밀번호 확인 모달
- [ ] 호버 시 수정/삭제 버튼 노출 (행 액션)
- [ ] 금액 자동 계산: 수량 × 단가 → amount 자동 채움 (편집 가능)

### 2.2 Out of Scope

- CSV/Excel 내보내기
- 일괄 삭제
- 거래 내역 정렬 변경 (기본: 날짜 DESC)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | GET /api/transactions: 전체 조회, stock_id 쿼리 필터 지원, date DESC | High | Pending |
| FR-02 | GET /api/transactions: stocks JOIN으로 ticker, name, currency 포함 | High | Pending |
| FR-03 | POST /api/transactions: JWT + bcrypt 이중 검증 후 DB insert | High | Pending |
| FR-04 | PUT /api/transactions/[id]: JWT + bcrypt 이중 검증 후 DB update | High | Pending |
| FR-05 | DELETE /api/transactions/[id]: JWT + bcrypt 이중 검증 후 DB delete | High | Pending |
| FR-06 | 테이블: 날짜/유형 chip/종목코드/종목명/수량/단가/금액/통화/메모/액션 컬럼 | High | Pending |
| FR-07 | 유형 chip: BUY(초록), SELL(빨강), DIVIDEND(파랑) | High | Pending |
| FR-08 | 금액 색상: 양수 #6bba8a, 음수 #d07070, 중립 warm-mid | Medium | Pending |
| FR-09 | 필터: 유형, 통화 (select), 종목 검색 (text input 디바운스) | High | Pending |
| FR-10 | 페이지네이션: 10건씩, 총 건수 표시 | Medium | Pending |
| FR-11 | TransactionForm: 주식상품 선택 → 현재가 자동 표시 배지 | High | Pending |
| FR-12 | TransactionForm: 유형 선택에 따라 수량/단가 필드 표시/숨김 (DIVIDEND: 금액만) | High | Pending |
| FR-13 | TransactionForm: 수량 × 단가 → amount 자동 계산 | High | Pending |
| FR-14 | PasswordConfirmModal: 삭제 전 비밀번호 입력 확인 | High | Pending |
| FR-15 | 행 호버 시 수정/삭제 버튼 opacity 1 전환 | Medium | Pending |
| FR-16 | 모달 오버레이: 배경 페이지 위 중앙 정렬 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Security | 쓰기 API: JWT + bcrypt 이중 검증 | 코드 리뷰 |
| UX | 모달 열림/닫힘 애니메이션 | 수동 테스트 |
| UX | 저장 중 버튼 로딩 상태 표시 | 수동 테스트 |
| Design | wireframe.html transactions 화면 95% 이상 재현 | 시각 비교 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 거래 내역 추가 → 테이블에 노출
- [ ] 유형/통화/종목 필터 동작
- [ ] 수정 → 변경사항 반영
- [ ] 삭제 → 비밀번호 확인 후 행 제거
- [ ] 수량 × 단가 자동 계산 동작

### 4.2 Quality Criteria

- [ ] Zero lint errors
- [ ] DIVIDEND 유형 수량/단가 입력 불필요 (amount만)
- [ ] 비밀번호 미일치 시 명확한 에러 표시

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 외화 거래 금액 환산 복잡성 | Medium | Medium | 금액은 Stock.currency 기준 저장, 환산은 대시보드에서만 처리 |
| 대량 데이터 조회 성능 | Low | Low | Supabase 페이지네이션 (range), DB 인덱스 활용 |
| 모달 상태 관리 복잡성 | Low | Medium | 단일 isOpen + editTarget 상태, useReducer 고려 |

---

## 6. Architecture Considerations

### 6.1 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 모달 방식 | 별도 페이지 / 오버레이 | 오버레이 | wireframe 디자인, UX 연속성 |
| 필터 | 서버사이드 / 클라이언트사이드 | 서버사이드 API 쿼리 | 데이터 정확성, 페이지네이션 연동 |
| 페이지네이션 | 무한스크롤 / 번호 | 번호 | wireframe 스타일, 총 건수 명시 |

### 6.2 모달 UI 구조 (wireframe 기반)

```
┌──────────────────────────────────┐
│ ████ (accent/green/blue 그라디언트)│ ← modal-strip
│ 거래 추가          NEW TRANSACTION │
│ ─────────────────────────────────│
│                            [✕]   │
│ 주식상품 선택 *                   │
│ [— 등록된 종목에서 선택 ▾ ——]    │
│ ● 삼성전자  005930.KS · KRX · KRW │
│                         ₩78,500  │
│                                  │
│ [▲ 매수] [▼ 매도] [💰 배당]      │ ← 유형 3-grid
│                                  │
│ 날짜           주식상품           │
│ 수량           단가              │
│ 금액 (자동)                       │
│ 메모                             │
│ - - - - - - - - - - - - - - - - │
│ 🔒 비밀번호 확인                  │
│ [비밀번호 입력]                   │
│                                  │
│              [취소] [저장하기]    │
└──────────────────────────────────┘
```

---

## 7. Next Steps

1. [ ] Write design document (`04-transactions.design.md`)
2. [ ] 03-stocks 완료 후 stocks 데이터 준비
3. [ ] 비밀번호 재확인 컴포넌트 공통화 여부 결정

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-10 | Initial draft | dev |
