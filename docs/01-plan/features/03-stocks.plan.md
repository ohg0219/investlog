# Stocks Management Planning Document

> **Summary**: 주식상품 CRUD 관리 — 등록/수정/삭제 UI, API, Yahoo Finance 자동완성
>
> **Project**: investlog
> **Version**: 0.1.0
> **Author**: dev
> **Date**: 2026-03-10
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

사용자가 투자하는 주식상품(종목)을 등록·수정·삭제할 수 있는 관리 페이지와 API를 구현한다.
Yahoo Finance API를 통해 티커 입력 시 종목명/거래소/통화를 자동으로 조회한다.

### 1.2 Background

거래 내역(04-transactions)은 주식상품 FK에 의존하므로, 이 기능이 먼저 완성되어야 한다.
와이어프레임의 stocks 화면은 별도 스크린으로 존재하지 않으나,
PLAN.md `§ 4-3` 및 거래 추가 모달의 주식상품 선택 드롭다운에서 역할을 확인할 수 있다.

### 1.3 Related Documents

- Prerequisites: `docs/01-plan/features/01-foundation.plan.md`
- References: `references/PLAN.md § 4-3, § 6`, `references/wireframe.html #screen-modal-add`

---

## 2. Scope

### 2.1 In Scope

- [ ] `GET /api/stocks` — 전체 주식상품 조회 (JWT 인증)
- [ ] `POST /api/stocks` — 주식상품 등록 (JWT + 비밀번호 이중 검증)
- [ ] `PUT /api/stocks/[id]` — 주식상품 수정 (JWT + 비밀번호)
- [ ] `DELETE /api/stocks/[id]` — 주식상품 삭제 (연결 거래내역 존재 시 경고, JWT + 비밀번호)
- [ ] `GET /api/prices?tickers=` — 현재가 일괄 조회 (JWT, yahoo-finance2 quote)
- [ ] `GET /api/prices/lookup?q=` — 티커 자동완성 검색 (JWT, yahoo-finance2 search)
- [ ] `/dashboard/stocks` 페이지 — 주식상품 카드 그리드
- [ ] `StockGrid.tsx` — 카드 목록 (ticker, name, market, currency, sector, 현재가)
- [ ] `StockForm.tsx` — 등록/수정 폼 (티커 자동완성, Yahoo 조회 버튼)
- [ ] `PasswordConfirmModal.tsx` — 쓰기 작업 비밀번호 재확인 모달

### 2.2 Out of Scope

- 주식 상세 페이지 (단일 종목 차트 분석)
- 즐겨찾기 / 카테고리 분류
- 실시간 가격 알림

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | GET /api/stocks: Supabase에서 전체 stocks 조회, created_at DESC 정렬 | High | Pending |
| FR-02 | POST /api/stocks: body { password, data: Stock } → DB insert | High | Pending |
| FR-03 | PUT /api/stocks/[id]: body { password, data } → DB update | High | Pending |
| FR-04 | DELETE /api/stocks/[id]: 연결 transactions 존재 확인 → 경고 또는 삭제 | High | Pending |
| FR-05 | GET /api/prices?tickers=: yahooFinance.quote() 병렬 조회 | High | Pending |
| FR-06 | GET /api/prices/lookup?q=: yahooFinance.search() → 상위 5개 반환 | High | Pending |
| FR-07 | 주식상품 카드: ticker, name, market, currency, sector, 현재가, 등락률 표시 | High | Pending |
| FR-08 | 티커 입력 후 "조회" 클릭 → Yahoo Finance에서 name/market/currency 자동 채움 | High | Pending |
| FR-09 | 삭제 시 연결 거래내역 존재 경고 다이얼로그 | Medium | Pending |
| FR-10 | 쓰기 작업(등록/수정/삭제) 전 비밀번호 재확인 모달 | High | Pending |
| FR-11 | Yahoo Finance 티커 규칙 안내: KS/KQ/T suffix | Medium | Pending |
| FR-12 | 주식상품 목록 카드에 현재가 실시간 조회 (페이지 진입 시 1회) | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Security | 쓰기 API: JWT + bcrypt 이중 검증 | 코드 리뷰 |
| Security | Service Role Key 서버 전용 | 코드 리뷰 |
| Performance | /api/prices 병렬 Promise.allSettled 사용 | 코드 리뷰 |
| UX | yahoo-finance2 조회 실패 시 명확한 에러 메시지 | 수동 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 주식상품 등록 → DB 저장 → 카드 목록에 노출
- [ ] 수정 → 변경사항 반영
- [ ] 삭제 → 목록에서 제거 (연결 거래 없을 때)
- [ ] 연결 거래 있는 종목 삭제 시 경고 표시
- [ ] 티커 입력 자동완성 동작

### 4.2 Quality Criteria

- [ ] Zero lint errors
- [ ] API 응답 타입 일치
- [ ] 비밀번호 미일치 시 403 응답

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| yahoo-finance2 국내 종목 검색 불안정 | Medium | Medium | `.KS`/`.KQ` 수동 입력 안내, search API 폴백 |
| 병렬 가격 조회 중 일부 실패 | Low | Medium | Promise.allSettled, 실패 종목 null 반환 |
| 거래 연결된 종목 강제 삭제 | High | Low | DELETE API에서 FK 참조 확인 후 403 반환 |

---

## 6. Architecture Considerations

### 6.1 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 쓰기 인증 | JWT만 / JWT + 비밀번호 | JWT + 비밀번호 | 중요 데이터 보호, PLAN.md 요구사항 |
| 가격 조회 | 클라이언트 직접 / 서버 API 프록시 | 서버 API 프록시 | CORS 방지, 인증 일관성 |
| 자동완성 | 클라이언트 디바운스 / 버튼 조회 | 버튼 조회 | API 호출 최소화, UX 명확성 |

### 6.2 API 응답 형식

```typescript
// GET /api/prices?tickers=AAPL,005930.KS
{
  "AAPL": { "price": 182.40, "currency": "USD", "changePercent": 1.2, "name": "Apple Inc." },
  "005930.KS": { "price": 78500, "currency": "KRW", "changePercent": -0.4, "name": "삼성전자" }
}

// GET /api/prices/lookup?q=삼성
[
  { "ticker": "005930.KS", "name": "삼성전자", "exchange": "KSC", "type": "EQUITY" },
  { "ticker": "005935.KS", "name": "삼성전자우", ... }
]
```

---

## 7. UI/UX 상세

### 주식상품 관리 페이지 레이아웃

```
/dashboard/stocks
┌────────────────────────────────────────┐
│ 주식상품 관리          [+ 종목 추가]   │
├────────────────────────────────────────┤
│  [카드]삼성전자  [카드]AAPL  [카드]NVDA│
│  005930.KS      NASDAQ       NASDAQ    │
│  KRX · KRW      USD          USD       │
│  ₩78,500 ▲0.4%  $182 ▲1.2%  $891 ▼0.3%│
│  [수정] [삭제]  [수정][삭제] [수정][삭제]│
└────────────────────────────────────────┘
```

### StockForm 필드

| 필드 | 타입 | 비고 |
|------|------|------|
| ticker | text + 조회 버튼 | Yahoo Finance 자동완성 |
| name | text (자동 채움) | |
| market | text (자동 채움) | KRX, NASDAQ 등 |
| country | select | KR/US/JP/기타 |
| currency | text (자동 채움) | KRW/USD/JPY |
| sector | text (선택) | |
| memo | textarea (선택) | |

---

## 8. Next Steps

1. [ ] Write design document (`03-stocks.design.md`)
2. [ ] 01-foundation 완료 후 Supabase stocks 테이블 생성 확인
3. [ ] yahoo-finance2 API 동작 로컬 테스트

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-10 | Initial draft | dev |
