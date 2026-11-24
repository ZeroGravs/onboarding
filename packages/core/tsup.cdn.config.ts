import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { cdn: 'src/index.ts' },
  format: ['iife'],
  globalName: 'Onboarding',
  noExternal: [/.*/],
  minify: true,
  outExtension: () => ({ js: '.global.js' }),
});
