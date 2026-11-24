import { defineConfig } from '@playwright/test';

const apps = [
  { name: 'vanilla', port: 4173 },
  { name: 'react', port: 4174 },
  { name: 'vue', port: 4175 },
  { name: 'nextjs', port: 4176 },
  { name: 'angular', port: 4177 },
];
const browsers = ['chromium', 'firefox', 'webkit'] as const;

export default defineConfig({
  testDir: './e2e',
  testMatch: 'tours.spec.ts',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  use: { trace: 'retain-on-failure' },
  projects: apps.flatMap(({ name, port }) =>
    browsers.map((browserName) => ({
      name: `${name}-${browserName}`,
      use: { browserName, baseURL: `http://127.0.0.1:${port}` },
    })),
  ),
  webServer: apps.map(({ name, port }) => ({
    command:
      name === 'nextjs'
        ? `pnpm --filter @onboarding/example-nextjs build && pnpm --filter @onboarding/example-nextjs start --hostname 127.0.0.1 --port ${port}`
        : `pnpm exec vite preview --outDir examples/${name}/dist${name === 'angular' ? '/browser' : ''} --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    env: { ONBOARDING_VERIFY: '1', NEXT_TELEMETRY_DISABLED: '1' },
    reuseExistingServer: false,
    timeout: 180_000,
  })),
});
