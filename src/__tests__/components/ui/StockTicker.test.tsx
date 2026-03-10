/**
 * TDD Test — StockTicker
 * Design Section 9: FE-20 ~ FE-24
 * Pre-Wave Red: 구현 파일이 없으므로 import 에러(Red) 상태가 정상.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StockTicker from '@/components/ui/StockTicker';

const sampleItems = [
  { symbol: 'AAPL', change: 1.24, changePercent: '+1.2%' },
  { symbol: 'TSLA', change: -0.8, changePercent: '-0.8%' },
  { symbol: 'MSFT', change: 0, changePercent: '0.0%' },
];

describe('StockTicker', () => {
  // FE-20: 기본 렌더링
  it('FE-20: 심볼 텍스트가 DOM에 존재한다', () => {
    render(<StockTicker items={sampleItems} />);
    expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0);
  });

  // FE-21: 상승 종목 색상
  it('FE-21: 상승 종목에 green 클래스가 적용된다', () => {
    render(<StockTicker items={[{ symbol: 'AAPL', change: 1.24, changePercent: '+1.2%' }]} />);
    const elements = document.querySelectorAll('[class*="green"]');
    expect(elements.length).toBeGreaterThan(0);
  });

  // FE-22: 하락 종목 색상
  it('FE-22: 하락 종목에 red 클래스가 적용된다', () => {
    render(<StockTicker items={[{ symbol: 'TSLA', change: -0.8, changePercent: '-0.8%' }]} />);
    const elements = document.querySelectorAll('[class*="red"]');
    expect(elements.length).toBeGreaterThan(0);
  });

  // FE-23: 빈 배열
  it('FE-23: 빈 배열을 전달해도 에러 없이 렌더링된다', () => {
    expect(() => render(<StockTicker items={[]} />)).not.toThrow();
  });

  // FE-24: seamless loop 복제 (2벌)
  it('FE-24: seamless loop를 위해 동일 심볼이 2회 이상 렌더링된다', () => {
    render(<StockTicker items={sampleItems} />);
    const aaplElements = screen.getAllByText('AAPL');
    expect(aaplElements.length).toBeGreaterThanOrEqual(2);
  });

  // EC-08: change: 0 보합 처리
  it('EC-08: change가 0이면 neutral 색상으로 에러 없이 렌더링된다', () => {
    expect(() =>
      render(<StockTicker items={[{ symbol: 'MSFT', change: 0, changePercent: '0.0%' }]} />)
    ).not.toThrow();
  });
});
