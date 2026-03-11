/**
 * TDD Test — KpiCard
 * Design Section 9.2: TS-01 ~ TS-08, EC-01 ~ EC-03
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import KpiCard from '@/components/dashboard/KpiCard';

describe('KpiCard', () => {
  // TS-01: label 텍스트 렌더링
  it('TS-01: label 텍스트가 DOM에 존재한다', () => {
    render(<KpiCard label="총 투자금" value={1000000} colorVariant="neutral" />);
    expect(screen.getByText('총 투자금')).toBeInTheDocument();
  });

  // TS-02: currency-krw 포맷 양수 금액 표시
  it('TS-02: currency-krw 포맷으로 양수 금액이 표시된다', () => {
    render(<KpiCard label="테스트" value={1234567} colorVariant="neutral" format="currency-krw" />);
    expect(screen.getByText(/1,234,567/)).toBeInTheDocument();
  });

  // TS-03: pnl variant, value > 0 → "▲ +" 접두사 + green 클래스
  it('TS-03: pnl variant value > 0 → "▲ +" 접두사와 text-green-bright 클래스', () => {
    render(<KpiCard label="실현 손익" value={50000} colorVariant="pnl" showArrow />);
    expect(screen.getByText(/▲/)).toBeInTheDocument();
    const valueEl = screen.getByTestId('kpi-value');
    expect(valueEl).toHaveClass('text-green-bright');
  });

  // TS-04: pnl variant, value < 0 → "▼ " 접두사 + red 클래스 (abs 처리)
  it('TS-04: pnl variant value < 0 → "▼ " 접두사와 text-red-bright 클래스, 절댓값 표시', () => {
    render(<KpiCard label="실현 손익" value={-30000} colorVariant="pnl" showArrow />);
    expect(screen.getByText(/▼/)).toBeInTheDocument();
    expect(screen.getByText(/30,000/)).toBeInTheDocument();
    const valueEl = screen.getByTestId('kpi-value');
    expect(valueEl).toHaveClass('text-red-bright');
  });

  // TS-05: pnl variant, value === 0 → 화살표 없음 + warm-mid 색상
  it('TS-05: pnl variant value === 0 → 화살표 없음, text-warm-mid 클래스', () => {
    render(<KpiCard label="실현 손익" value={0} colorVariant="pnl" showArrow />);
    expect(screen.queryByText(/▲/)).not.toBeInTheDocument();
    expect(screen.queryByText(/▼/)).not.toBeInTheDocument();
    const valueEl = screen.getByTestId('kpi-value');
    expect(valueEl).toHaveClass('text-warm-mid');
  });

  // TS-06: accent variant → text-accent 클래스
  it('TS-06: accent variant → text-accent 클래스', () => {
    render(<KpiCard label="총 투자금" value={5000000} colorVariant="accent" />);
    const valueEl = screen.getByTestId('kpi-value');
    expect(valueEl).toHaveClass('text-accent');
  });

  // TS-07: neutral variant → text-accent 클래스
  it('TS-07: neutral variant → text-accent 클래스', () => {
    render(<KpiCard label="배당 수익" value={1000000} colorVariant="neutral" />);
    const valueEl = screen.getByTestId('kpi-value');
    expect(valueEl).toHaveClass('text-accent');
  });

  // TS-08: showArrow=false → pnl variant 양수에서도 화살표 없음
  it('TS-08: showArrow=false → pnl variant 양수에서도 화살표 미표시', () => {
    render(<KpiCard label="실현 손익" value={10000} colorVariant="pnl" showArrow={false} />);
    expect(screen.queryByText(/▲/)).not.toBeInTheDocument();
    expect(screen.queryByText(/▼/)).not.toBeInTheDocument();
  });

  // EC-01: value=0, currency-krw
  it('EC-01: value=0 → "₩0" 표시, 오류 없음', () => {
    render(<KpiCard label="테스트" value={0} colorVariant="neutral" format="currency-krw" />);
    expect(screen.getByText(/0/)).toBeInTheDocument();
  });

  // EC-02: value 10억 이상
  it('EC-02: value 10억 이상 → 자릿수 구분자 정상 적용', () => {
    render(<KpiCard label="테스트" value={1000000000} colorVariant="neutral" format="currency-krw" />);
    expect(screen.getByText(/1,000,000,000/)).toBeInTheDocument();
  });

  // EC-03: value 음수 + accent variant → 색상 변화 없음
  it('EC-03: value 음수 + accent variant → 화살표 없음, text-accent 유지', () => {
    render(<KpiCard label="총 투자금" value={-5000} colorVariant="accent" />);
    expect(screen.queryByText(/▲/)).not.toBeInTheDocument();
    expect(screen.queryByText(/▼/)).not.toBeInTheDocument();
    const valueEl = screen.getByTestId('kpi-value');
    expect(valueEl).toHaveClass('text-accent');
  });
});
