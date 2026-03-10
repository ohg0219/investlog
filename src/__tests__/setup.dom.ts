// jsdom 환경 전용 setup — browser API mock
// window.matchMedia는 jsdom에 기본 구현이 없으므로 no-op mock 제공
// 개별 테스트에서 vi.fn().mockImplementation()으로 재정의 가능 (FE-33)
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
