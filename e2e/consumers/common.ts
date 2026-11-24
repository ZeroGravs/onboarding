import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { memoryStorage, type OnboardingOptions } from '@onboarding/core';

export function createOptions(): OnboardingOptions {
  return {
    tours: [
      {
        id: 'welcome',
        version: 1,
        steps: [{ id: 'first', title: 'Welcome', content: 'Hello' }],
      },
    ],
    renderer: 'none',
    storage: memoryStorage(),
  };
}

export function assertNoDOM(): void {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
}

export function assertInstalled(specifier: string): void {
  const project = realpathSync(dirname(dirname(fileURLToPath(import.meta.url))));
  const installed = realpathSync(createRequire(import.meta.url).resolve(specifier));
  const path = relative(project, installed);
  assert(
    path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path),
    `${specifier} resolved outside the isolated consumer: ${installed}`,
  );
}
