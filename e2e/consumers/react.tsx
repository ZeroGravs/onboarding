import assert from 'node:assert/strict';
import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createOnboarding } from '@zero-lab/onboarding';
import {
  OnboardingProvider,
  OnboardingStep,
  useOnboarding,
  type OnboardingContextValue,
} from '@zero-lab/onboarding-react';
import { assertInstalled, assertNoDOM, createOptions } from './common.js';

assertNoDOM();
assertInstalled('@zero-lab/onboarding-react');
const kit = createOnboarding(createOptions());

function Consumer(): ReactElement {
  const context: OnboardingContextValue = useOnboarding();
  assert.equal(context.kit, kit);
  assert.equal(context.state.status, 'idle');
  return (
    <OnboardingStep name="first">
      <span data-state={context.state.status}>{context.kit.getState().status}</span>
    </OnboardingStep>
  );
}

try {
  const html = renderToString(
    <OnboardingProvider kit={kit}>
      <Consumer />
    </OnboardingProvider>,
  );
  assert.match(html, /data-onboarding="first"/);
  assert.match(html, /data-state="idle">idle</);
} finally {
  kit.destroy();
}
assertNoDOM();
