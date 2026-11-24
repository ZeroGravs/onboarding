import '@angular/compiler';
import assert from 'node:assert/strict';
import {
  createEnvironmentInjector,
  inject,
  Injector,
  NgZone,
  PLATFORM_ID,
  type EnvironmentInjector,
} from '@angular/core';
import {
  provideOnboarding,
  OnboardingOutletComponent,
  OnboardingService,
  OnboardingStepDirective,
} from '@onboarding/angular';
import { assertInstalled, assertNoDOM, createOptions } from './common.js';

assertNoDOM();
assertInstalled('@onboarding/angular');
assert.equal(typeof OnboardingOutletComponent, 'function');
assert.equal(typeof OnboardingStepDirective, 'function');
const directive = new OnboardingStepDirective();
directive.onboardingStep = 'first';
assert.equal(directive.onboardingStep, 'first');

// A server-only zone stand-in: service callbacks run synchronously, without Zone.js.
const zone: Pick<NgZone, 'run'> = { run: (callback) => callback() };
const injector = createEnvironmentInjector(
  [
    { provide: PLATFORM_ID, useValue: 'server' },
    { provide: NgZone, useValue: zone },
    provideOnboarding(() => {
      assert.equal(inject(PLATFORM_ID), 'server');
      return createOptions();
    }),
  ],
  Injector.NULL as EnvironmentInjector,
);
try {
  const onboarding: OnboardingService = injector.get(OnboardingService);
  assert.equal(injector.get(OnboardingService), onboarding, 'One service per environment injector');
  assert.equal(onboarding.state().status, 'idle');
  assert.equal(onboarding.kit.getState().target, null);
  await onboarding.start('welcome');
  assert.equal(onboarding.state().status, 'idle', 'Server start must not access the DOM');
  const unsubscribe = onboarding.on('tour:started', () => assert.fail('Unexpected server tour'));
  unsubscribe();
  onboarding.reset('welcome');
} finally {
  injector.destroy();
}
assertNoDOM();
