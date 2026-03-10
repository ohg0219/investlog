# Dashboard Planning Document

> **Summary**: 투자 대시보드 — KPI 카드, 파이차트, 라인차트, 수익 바차트, 주식별 차트, 최근 거래
>
> **Project**: investlog
> **Version**: 0.1.0
> **Author**: dev
> **Date**: 2026-03-10
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

투자 내역의 전체 현황을 시각화하는 메인 대시보드를 구현한다.
실시간 주가 반영, 수익률 계산, 멀티 차트로 투자 성과를 한눈에 파악할 수 있다.

### 1.2 Background

와이어프레임의 대시보드는 다크 배경(--ink)에 에디토리얼 타이포그래피와
금색(--accent) 포인트 컬러로 구성된 고급스러운 UI이다.
Recharts 라이브러리를 사용하되 wireframe의 커스텀 SVG 차트 스타일을 최대한 재현한다.
모든 차트 데이터는 `lib/calculations.ts`의 계산 함수에서 도출된다.

### 1.3 Related Documents

- Prerequisites: `docs/01-plan/features/01-foundation.plan.md`, `docs/01-plan/features/03-stocks.plan.md`, `docs/01-plan/features/04-transactions.plan.md`
- References: `references/PLAN.md § 4-2, § 10`, `references/wireframe.html #screen-dashboard`

---

## 2. Scope

### 2.1 In Scope

- [ ] `/dashboard` 페이지 — 대시보드 메인 (인증 보호)
- [ ] **섹션 1: 요약 KPI 카드** (4개)
  - 총 투자금 (BUY.amount 합계 + 등락률 badge)
  - 실현 손익 (SELL - 매입원가, 평균법)
  - 배당 수익 (DIVIDEND.amount 합계)
  - 총 수익률 ((실현손익 + 배당) / 총투자금 × 100)
- [ ] **섹션 2: 포트폴리오 비중** — 도넛 파이차트 + 종목별 리스트
- [ ] **섹션 3: 일별 잔고 추이** — 에어리어 라인차트 (누적 BUY - SELL)
- [ ] **섹션 4: 월별 손익 현황** — 매수/매도/배당 그룹 바차트
- [ ] **섹션 5: 최근 거래** — 미니 테이블 최근 5건 + "전체 보기 →"
- [ ] **섹션 6: 월별 수익 추이** — 실시간 배지 + 기간 필터 (3M/6M/1Y/전체) + 수익/손실 상하 바차트 + 연간 요약 사이드바
- [ ] **섹션 7: 주식별 수익 추이** — 종목 탭 + 기간 필터 + 멀티라인 차트 + 종목별 평가손익 카드
- [ ] 실시간 주가 갱신: 진입 시 1회 + 60초 interval (SWR 또는 setInterval)
- [ ] Nav 바: 대시보드/주식상품/거래내역/로그아웃

### 2.2 Out of Scope

- 포트폴리오 시뮬레이션
- 종목별 상세 분석 페이지
- 알림 / 목표 수익률 설정
- 다중 포트폴리오

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | KPI: 총 투자금 = SUM(BUY.amount) | High | Pending |
| FR-02 | KPI: 실현 손익 = SUM(SELL.amount) - SUM(SELL 시점 평균매입원가 × 수량) | High | Pending |
| FR-03 | KPI: 배당 수익 = SUM(DIVIDEND.amount) | High | Pending |
| FR-04 | KPI: 총 수익률 = (실현손익 + 배당) / 총투자금 × 100 | High | Pending |
| FR-05 | 포트폴리오 파이차트: 종목별 보유금액 비중, 도넛 형태 SVG | High | Pending |
| FR-06 | 파이차트 하단 리스트: 종목명, 비중(%), 보유금액 | High | Pending |
| FR-07 | 일별 잔고 추이: 날짜 정렬 후 누적 BUY - SELL 계산, 에어리어 그래디언트 | High | Pending |
| FR-08 | 월별 손익 바차트: 월별 BUY/SELL/DIVIDEND 금액 그룹 바, 범례 | High | Pending |
| FR-09 | 최근 거래 미니 테이블: 날짜/유형chip/종목/금액, 최근 5건 | High | Pending |
| FR-10 | 월별 수익 추이: 실현손익 + 배당 수익 상하 바차트 (양수↑ / 음수↓) | High | Pending |
| FR-11 | 월별 수익 추이: 기간 필터 3M/6M/1Y/전체 토글 버튼 | High | Pending |
| FR-12 | 월별 수익 추이: 현재월 미실현 수익 = (현재가 - 평균매수가) × 보유수량 | High | Pending |
| FR-13 | 월별 수익 추이: REALTIME 배지 + 60초 자동 갱신 | Medium | Pending |
| FR-14 | 월별 수익 추이: 연간 요약 사이드바 (연간 총수익, 최고수익월, 손실월 수, 배당포함 수익률) | High | Pending |
| FR-15 | 주식별 수익 추이: 종목 탭 (전체/개별 종목) + 기간 필터 6M/1Y/전체 | High | Pending |
| FR-16 | 주식별 수익 추이: 멀티라인 차트 (종목별 월말 종가 기반 누적 수익률) | High | Pending |
| FR-17 | 주식별 수익 추이: yahooFinance.historical 과거 월말 종가 조회 | High | Pending |
| FR-18 | 주식별 수익 추이: 매수 평균단가 기준선 (zero line = 매수가) | Medium | Pending |
| FR-19 | 주식별 수익 추이: 종목별 평가손익 카드 (수익률%, 평가손익 금액) | High | Pending |
| FR-20 | 실시간 주가: 진입 시 1회 조회 + 60초 interval 갱신 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 대시보드 초기 로딩 3초 이내 | 브라우저 Performance 탭 |
| Performance | 차트 데이터 서버 컴포넌트에서 초기 계산 | 코드 리뷰 |
| Design | wireframe.html 대시보드 화면 95% 이상 재현 | 시각 비교 |
| Design | 다크 배경 (#0a0a08), 금색 포인트 (#c8a96e), 에디토리얼 타이포 | 시각 비교 |
| UX | 차트 hover 툴팁 표시 | 수동 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] KPI 카드 4개 실제 데이터 표시
- [ ] 파이차트 종목별 비중 정확
- [ ] 일별 잔고 추이 차트 동작
- [ ] 월별 손익 바차트 동작
- [ ] 월별 수익 추이 기간 필터 동작
- [ ] 주식별 멀티라인 차트 동작
- [ ] 실시간 갱신 동작

### 4.2 Quality Criteria

- [ ] Zero lint errors
- [ ] Recharts 반응형 (ResponsiveContainer 사용)
- [ ] 데이터 없을 때 빈 상태 UI

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| yahoo historical API 속도 느림 | Medium | High | 서버 컴포넌트 캐싱 (next: { revalidate: 3600 }), 로딩 스켈레톤 |
| Recharts 스타일 커스터마이징 한계 | Medium | Medium | SVG 직접 렌더링 혼용, className 오버라이드 |
| 실현 손익 계산 복잡성 (평균법) | High | Medium | calculations.ts 단위 테스트, FIFO 대신 평균법 선택 |
| 복수 통화 환산 | Medium | High | 이번 버전: 원화 기준 환산 생략, 통화별 분리 표시 |

---

## 6. Architecture Considerations

### 6.1 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 차트 라이브러리 | Recharts / Chart.js / D3 | Recharts | React 친화적, 반응형, 커스터마이징 |
| 데이터 페칭 | Server Component / Client SWR | 혼합 | 초기 데이터 서버, 실시간 갱신 클라이언트 |
| 실시간 갱신 | SWR / React Query / setInterval | setInterval + useState | 의존성 최소화, 단순 구현 |
| 손익 계산 위치 | 클라이언트 / 서버 | 서버 | DB 데이터 직접 계산, 클라이언트 부담 감소 |

### 6.2 대시보드 레이아웃 구조

```
DASHBOARD
├── dash-header: investlog 타이틀 + 총투자금/수익률
├── kpi-row (4열 그리드)
│   ├── KPI: 총 투자금
│   ├── KPI: 실현 손익
│   ├── KPI: 배당 수익
│   └── KPI: 총 수익률
├── dash-grid (1fr + 360px)
│   ├── 일별 잔고 추이 (에어리어 차트)
│   └── 포트폴리오 비중 (도넛 + 리스트)
├── dash-grid2 (1fr + 1fr)
│   ├── 월별 손익 현황 (그룹 바차트)
│   └── 최근 거래 (미니 테이블)
├── 월별 수익 추이 (full width)
│   ├── 수익/손실 상하 바차트
│   └── 연간 요약 사이드바
└── 주식별 수익 추이 (full width)
    ├── 종목 탭 + 기간 필터
    ├── 멀티라인 차트
    └── 종목별 평가손익 카드 (3열)
```

### 6.3 컬러 시스템 (wireframe 기반)

| 용도 | 색상 |
|------|------|
| 수익/양수 | `#6bba8a` (green) |
| 손실/음수 | `#d07070` (red) |
| 배당 | `#6898cc` (blue) |
| 매수 | `#3d6b4f` (dark green) |
| 매도 | `#8a7248` (gold-brown) |
| 포인트 | `#c8a96e` (accent) |
| 배경 | `#0a0a08` (ink) |

---

## 7. 계산 로직 상세

```
# 평균매수가 (종목별)
평균매수가[ticker] = SUM(BUY.amount) / SUM(BUY.quantity)

# 실현 손익 (평균법)
실현손익 = SUM(SELL.amount - SELL.quantity × 평균매수가[ticker])

# 현재 미실현 평가손익 (실시간)
미실현[ticker] = (현재가 - 평균매수가[ticker]) × 잔여수량[ticker]
잔여수량[ticker] = SUM(BUY.quantity) - SUM(SELL.quantity)

# 월별 수익 추이
월별수익[N] = 실현손익(해당월) + DIVIDEND(해당월)
현재월 = 미실현 평가손익 (실시간)

# 주식별 누적 수익률 (과거 데이터)
누적수익률[ticker][월] = (월말종가 - 평균매수가) / 평균매수가 × 100
```

---

## 8. Next Steps

1. [ ] Write design document (`05-dashboard.design.md`)
2. [ ] 01~04 feature 완료 후 실제 데이터로 계산 로직 검증
3. [ ] Recharts 커스텀 스타일링 프로토타입

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-10 | Initial draft | dev |
