/**
 * TDD Test — useDebounce 훅
 * Design Section 9.2: TS-90 ~ TS-92
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
  // TS-90: 초기값 즉시 반환
  it('TS-90: 초기값을 즉시 반환한다', () => {
    const { result } = renderHook(() => useDebounce('init', 300));
    expect(result.current).toBe('init');
  });

  // TS-91: 지연 후 값 갱신
  it('TS-91: 300ms 경과 후 새 값으로 갱신된다', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'init', delay: 300 } }
    );

    rerender({ value: 'updated', delay: 300 });

    // 300ms 전에는 이전 값 유지
    expect(result.current).toBe('init');

    // 300ms 경과 후 새 값
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });
    expect(result.current).toBe('updated');
  });

  // TS-92: 지연 내 재입력 — 이전 값 유지
  it('TS-92: 300ms 내 연속 변경 시 이전 값 유지 (디바운스)', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    );

    // 100ms 간격으로 연속 변경
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      rerender({ value: 'ab', delay: 300 });
      await new Promise((resolve) => setTimeout(resolve, 100));
      rerender({ value: 'abc', delay: 300 });
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // 아직 300ms 미경과 → 초기값 유지
    expect(result.current).toBe('a');

    // 300ms 더 경과 후 → 마지막 값
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });
    expect(result.current).toBe('abc');
  });
});
