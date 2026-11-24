import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createOnboarding, type Onboarding, type OnboardingState } from '@zero-lab/onboarding';
import { assertInstalled, assertNoDOM, createOptions } from './common.js';

assertNoDOM();
assertInstalled('@zero-lab/onboarding');
assertInstalled('@zero-lab/onboarding/styles.css');
const css = fileURLToPath(import.meta.resolve('@zero-lab/onboarding/styles.css'));
assert(statSync(css).isFile());
const kit: Onboarding = createOnboarding(createOptions());
try {
  const state: OnboardingState = kit.getState();
  assert.equal(state.status, 'idle');
  assert.equal(state.target, null);
  assert.equal(state.tourId, null);
} finally {
  kit.destroy();
}
assertNoDOM();
