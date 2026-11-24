// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { createHistoryRouter, createOnboarding, localStorageAdapter } from './index';

describe('server and CDN entry points', () => {
  it('can import, configure and dispose without browser globals', async () => {
    const kit = createOnboarding({
      storage: localStorageAdapter('ssr'),
      router: createHistoryRouter(),
      tours: [{ id: 'ssr', steps: [{ id: 'welcome', title: 'Welcome', content: 'Hello' }] }],
    });
    const unmount = kit.mount();
    await kit.start('ssr');
    expect(kit.getState().status).toBe('idle');
    unmount();
    kit.destroy();
  });

  it('ships a self-contained browser global without require or DOM access at load time', () => {
    const context: Record<string, unknown> = {};
    const bundle = readFileSync(new URL('../dist/cdn.global.js', import.meta.url), 'utf8');
    runInNewContext(bundle, context);
    const api = context.Onboarding as typeof import('./index');
    const kit = api.createOnboarding({
      storage: api.memoryStorage(),
      tours: [{ id: 'cdn', steps: [{ id: 'step', title: 'CDN', content: 'Standalone' }] }],
    });
    expect(kit.getState().status).toBe('idle');
    kit.destroy();
  });
});
