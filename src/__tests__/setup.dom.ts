// jsdom 환경 전용 setup — browser API mock
// window.matchMedia는 jsdom에 기본 구현이 없으므로 no-op mock 제공
// 개별 테스트에서 vi.fn().mockImplementation()으로 재정의 가능 (FE-33)

// next/navigation mock — App Router가 없는 jsdom 환경에서 useRouter 등을 사용할 수 있도록
import { vi } from 'vitest';
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
