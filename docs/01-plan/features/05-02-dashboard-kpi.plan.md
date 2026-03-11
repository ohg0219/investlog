# 05-02-dashboard-kpi Planning Document

> **Summary**: 대시보드 KPI 카드 + 포트폴리오 비중 + 최근 거래 (Wave 1 Frontend)
>
> **Project**: investlog
> **Version**: 0.1.0
> **Author**: dev
> **Date**: 2026-03-11
> **Status**: Draft
> **Parent**: [05-dashboard.plan.md](05-dashboard.plan.md)

---

## 1. Overview

### 1.1 Purpose

대시보드의 첫 번째 가시적 구역을 구현한다.
KPI 요약 카드 4개, 포트폴리오 도넛 차트 + 보유 종목 리스트, 최근 거래 미니 테이블로 구성된다.

### 1.2 Related Documents

- Parent Plan: `docs/01-plan/features/05-dashboard.plan.md`
- **Depends on**: `05-01-dashboard-infra` (API + 계산 함수 완료 필요)
- Provides data to: 05-03, 05-04

---

## 2. Scope

### 2.1 In Scope

**섹션 1: KPI 카드 그룹**
- [ ] `KpiCardGroup.tsx` — 4개 KPI 카드 컨테이너
- [ ] `KpiCard.tsx` — 개별 KPI 카드 (레이블, 값, 단위, 색상)
- 총 투자금 / 실현 손익 / 배당 수익 / 총 수익률

**섹션 2: 포트폴리오 비중**
- [ ] `PortfolioPieChart.tsx` — Recharts PieChart (innerRadius 도넛)
- [ ] `HoldingsList.tsx` — 종목별 비중 리스트 (ticker, 비중%, 금액)

**섹션 5: 최근 거래**
- [ ] `RecentTransactions.tsx` — 최근 5건 미니 테이블 + "전체 보기 →" 링크

**페이지 기본 구조**
- [ ] `src/app/dashboard/page.tsx` — Server Component, 데이터 페치 + 레이아웃
- [ ] `DashboardClientShell.tsx` — Client Component 최상위 래퍼 (실시간 갱신 허브, 05-04에서 완성)

### 2.2 Out of Scope

- 차트 섹션 (→ 05-03)
- 실시간 갱신 (→ 05-04)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Component | Status |
|----|-------------|----------|-----------|--------|
| FR-01 | KPI 카드 4개: 총투자금, 실현손익, 배당수익, 총수익률 표시 | High | `KpiCard.tsx` | Pending |
| FR-02 | KPI 값: `/api/dashboard/summary` 응답 kpi 필드 사용 | High | `KpiCardGroup.tsx` | Pending |
| FR-03 | 총투자금 양수 — 기본 accent 색상 / 실현손익·총수익률 양수 = green, 음수 = red | High | `KpiCard.tsx` | Pending |
| FR-04 | 포트폴리오 도넛 차트: innerRadius, 종목별 색상 Cell | High | `PortfolioPieChart.tsx` | Pending |
| FR-05 | 차트 hover 툴팁: 종목명, 비중(%), 금액 | High | `PortfolioPieChart.tsx` | Pending |
| FR-06 | 보유 종목 리스트: ticker, 비중%, 금액 (비중 높은 순 정렬) | High | `HoldingsList.tsx` | Pending |
| FR-07 | 최근 거래 5건: 날짜/유형chip/종목ticker/금액 | High | `RecentTransactions.tsx` | Pending |
| FR-08 | "전체 보기 →" 클릭 시 `/dashboard/transactions` 이동 | Medium | `RecentTransactions.tsx` | Pending |
| FR-09 | 보유 종목 없을 때 "종목 없음" 빈 상태 UI | Medium | `PortfolioPieChart.tsx` | Pending |
| FR-10 | 거래 내역 없을 때 "거래 없음" 빈 상태 UI | Medium | `RecentTransactions.tsx` | Pending |

### 3.2 Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-01 | 로그인 후 `/dashboard` 진입 → KPI 카드 4개 모두 실제 데이터 표시 |
| AC-02 | 거래 내역 없을 때 KPI 값 모두 0, 빈 상태 메시지 표시 |
| AC-03 | 포트폴리오 차트 hover → 툴팁에 종목명, 비중%, 금액 표시 |
| AC-04 | 보유 종목 리스트 행 수 = 보유 종목 수 |
| AC-05 | 최근 거래 최대 5건 표시 |
| AC-06 | "전체 보기 →" 클릭 → `/dashboard/transactions` 이동 |

---

## 4. Architecture

### 4.1 컴포넌트 트리

```
/dashboard (page.tsx — Server)
  → GET /api/dashboard/summary (서버사이드)
  → DashboardClientShell (Client)
       ├─ KpiCardGroup
       │    └─ KpiCard × 4
       ├─ PortfolioPieChart (Recharts PieChart)
       ├─ HoldingsList
       └─ RecentTransactions
```

### 4.2 신규 파일 목록

```
src/app/dashboard/page.tsx              ← 신규
src/components/dashboard/
  DashboardClientShell.tsx             ← 신규 (skeleton, 05-04에서 완성)
  KpiCardGroup.tsx                     ← 신규
  KpiCard.tsx                          ← 신규
  PortfolioPieChart.tsx                ← 신규
  HoldingsList.tsx                     ← 신규
  RecentTransactions.tsx               ← 신규
src/__tests__/components/dashboard/
  KpiCard.test.tsx                     ← 신규
  PortfolioPieChart.test.tsx           ← 신규
  RecentTransactions.test.tsx          ← 신규
```

---

## 5. Next Steps

1. [ ] `05-01-dashboard-infra` 완료 후 착수
2. [ ] `/pdca design 05-02-dashboard-kpi`
