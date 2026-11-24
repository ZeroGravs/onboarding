import { defineConfig } from 'vitest/config';

// Also usable independently from the workspace. The adjacent tsconfig enables
// legacy TypeScript decorators for Angular JIT without changing root Vitest config.
export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['../../test-setup.ts'],
    restoreMocks: true,
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: { experimentalDecorators: true, useDefineForClassFields: false },
    },
  },
});
