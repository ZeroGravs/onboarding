import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { cwd } from 'node:process';
import {
  createOnboarding,
  memoryStorage,
  type Onboarding,
  type OnboardingOptions,
  type OnboardingState,
} from '@onboarding/core';

assert.equal(typeof globalThis.window, 'undefined');
assert.equal(typeof globalThis.document, 'undefined');
const requireFromConsumer = createRequire(join(cwd(), 'package.json'));
assert(statSync(requireFromConsumer.resolve('@onboarding/core/styles.css')).isFile());
const options: OnboardingOptions = {
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
const kit: Onboarding = createOnboarding(options);
try {
  const state: OnboardingState = kit.getState();
  assert.equal(state.status, 'idle');
  assert.equal(state.target, null);
} finally {
  kit.destroy();
}
