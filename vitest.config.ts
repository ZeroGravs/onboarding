import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['packages/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    setupFiles: ['./test-setup.ts'],
  },
  oxc: { jsx: { runtime: 'automatic' } },
});
