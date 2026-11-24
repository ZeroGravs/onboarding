import assert from 'node:assert/strict';
import { createSSRApp, defineComponent, h, withDirectives } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createOnboarding, type Onboarding } from '@onboarding/core';
import {
  createOnboardingPlugin,
  OnboardingProvider,
  useOnboarding,
  vOnboardingStep,
  type OnboardingContextValue,
} from '@onboarding/vue';
import { assertInstalled, assertNoDOM, createOptions } from './common.js';

declare module 'vue' {
  interface ComponentCustomProps {
    consumerLabel?: string;
  }
}

assertNoDOM();
assertInstalled('@onboarding/vue');
const kit = createOnboarding(createOptions());
const providerProps: InstanceType<typeof OnboardingProvider>['$props'] = {
  kit,
  class: 'tour-provider',
  style: { color: 'inherit' },
  onVnodeMounted: () => {},
  consumerLabel: 'application-owned prop',
};
assert.equal(providerProps.kit, kit);
const seen = new Set<Onboarding>([kit]);
const Consumer = defineComponent({
  setup() {
    const context: OnboardingContextValue = useOnboarding();
    seen.add(context.kit);
    assert.equal(context.state.value.status, 'idle');
    return () =>
      withDirectives(
        h('span', { 'data-state': context.state.value.status }, context.kit.getState().status),
        [[vOnboardingStep, 'first']],
      );
  },
});

try {
  const providerApp = createSSRApp({
    render: () => h(OnboardingProvider, { kit }, { default: () => [h(Consumer)] }),
  });
  const pluginApp = createSSRApp(Consumer).use(createOnboardingPlugin(createOptions()));
  for (const app of [providerApp, pluginApp]) {
    const html = await renderToString(app);
    assert.match(html, /data-onboarding="first"/);
    assert.match(html, />idle</);
    assert.match(html, /data-state="idle"/);
  }
  assert.equal(seen.size, 2, 'The plugin must create a separate request-local kit');
} finally {
  for (const instance of seen) instance.destroy();
}
assertNoDOM();
