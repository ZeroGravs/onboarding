import { defineConfig } from '@playwright/test';

const base = process.env.DOCS_BASE ?? '/';

export default defineConfig({
  testDir: './e2e/docs',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  use: {
    browserName: 'chromium',
    baseURL: `http://127.0.0.1:4180${base}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm --filter @onboarding/docs preview --host 127.0.0.1 --port 4180',
    url: `http://127.0.0.1:4180${base}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
