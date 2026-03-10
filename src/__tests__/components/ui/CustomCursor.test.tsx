/**
 * TDD Test — CustomCursor
 * Design Section 9: FE-30 ~ FE-33
 * Pre-Wave Red: 구현 파일이 없으므로 import 에러(Red) 상태가 정상.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomCursor from '@/components/ui/CustomCursor';

describe('CustomCursor', () => {
  // FE-30: 마운트 시 mousemove 리스너 등록
  it('FE-30: 마운트 시 mousemove 이벤트 리스너가 등록된다', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    render(<CustomCursor />);
    const calls = addSpy.mock.calls.filter(([event]) => event === 'mousemove');
    expect(calls.length).toBeGreaterThan(0);
    addSpy.mockRestore();
  });

  // FE-31: 언마운트 시 리스너 해제
  it('FE-31: 언마운트 시 mousemove 이벤트 리스너가 해제된다', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<CustomCursor />);
    unmount();
    const calls = removeSpy.mock.calls.filter(([event]) => event === 'mousemove');
    expect(calls.length).toBeGreaterThan(0);
    removeSpy.mockRestore();
  });

  // FE-32: dot · ring 요소 존재
  it('FE-32: cursor-dot과 cursor-ring 요소가 렌더링된다', () => {
    render(<CustomCursor />);
    expect(document.querySelector('[data-testid="cursor-dot"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="cursor-ring"]')).toBeTruthy();
  });

  // FE-33: prefers-reduced-motion 시 렌더링 안 됨
  it('FE-33: prefers-reduced-motion이 reduce면 커서가 렌더링되지 않는다', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    render(<CustomCursor />);
    expect(document.querySelector('[data-testid="cursor-dot"]')).toBeNull();
    window.matchMedia = originalMatchMedia;
  });
});
