import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const alias = {
  '@': path.resolve(__dirname, './src'),
};

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    // vitest v4: projects 배열로 환경별 분리 (environmentMatchGlobs 대체)
    projects: [
      {
        // Node 환경: lib, api, middleware 테스트
        resolve: { alias },
        test: {
          name: 'node',
          environment: 'node',
          globals: true,
          setupFiles: ['./src/__tests__/setup.ts'],
          include: [
            'src/__tests__/auth.test.ts',
            'src/__tests__/calculations.test.ts',
            'src/__tests__/middleware.test.ts',
          ],
        },
      },
      {
        // jsdom 환경: React 컴포넌트 테스트
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'components',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/__tests__/setup.ts', './src/__tests__/setup.dom.ts'],
          include: ['src/__tests__/components/**/*.test.tsx'],
        },
      },
    ],
  },
  resolve: { alias },
});
