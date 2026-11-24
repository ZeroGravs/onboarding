import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const floatingUiLicense = readFileSync(new URL('./FLOATING-UI-LICENSE', import.meta.url), 'utf8');

export default defineConfig({
  entry: { cdn: 'src/index.ts' },
  format: ['iife'],
  globalName: 'Onboarding',
  noExternal: [/.*/],
  minify: true,
  banner: { js: `/*! Floating UI (core, DOM, and utils)\n${floatingUiLicense.trimEnd()}\n*/` },
  outExtension: () => ({ js: '.global.js' }),
});
