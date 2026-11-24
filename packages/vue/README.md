# @zero-lab/onboarding-vue

Vue 3.3+ bindings for Onboarding Kit. MIT. No eager `vue-router` dependency.

## Install

```sh
pnpm add @zero-lab/onboarding-vue @zero-lab/onboarding vue
# or
npm install @zero-lab/onboarding-vue @zero-lab/onboarding vue
```

Import **core CSS separately**, once in the application entry:

```ts
import '@zero-lab/onboarding/styles.css';
```

## Minimal usage: plugin + composable

```ts
import { createApp } from 'vue';
import { createOnboardingPlugin } from '@zero-lab/onboarding-vue';
import { localStorageAdapter } from '@zero-lab/onboarding';
import App from './App.vue';
import '@zero-lab/onboarding/styles.css';

createApp(App)
  .use(
    createOnboardingPlugin({
      storage: localStorageAdapter('my-app'),
      tours: [
        {
          id: 'onboarding',
          steps: [
            {
              id: 'welcome',
              target: '[data-onboarding="welcome"]',
              title: 'Welcome',
              content: 'Everything starts here.',
            },
          ],
        },
      ],
    }),
  )
  .mount('#app');
```

```vue
<script setup lang="ts">
import { useOnboarding } from '@zero-lab/onboarding-vue';
const { kit, state } = useOnboarding();
</script>

<template>
  <section v-onboarding-step="'welcome'">Your workspace</section>
  <button @click="kit.start('onboarding')">Start onboarding</button>
  <output>{{ state.status }}</output>
</template>
```

`useOnboarding()` returns `{ kit, state }`, where `state` is a computed ref of
deeply read-only snapshots (use `state.value` in JavaScript).
It requires a provider or the plugin.
The plugin registers `v-onboarding-step`; the directive maintains a
`data-onboarding` attribute without changing children. Its SSR hook emits the
same attribute on the server. For local registration in `<script setup>`,
import `vOnboardingStep` directly.

## Component provider / scoped slots

Use the component instead of the plugin to scope a kit to a subtree:

```vue
<script setup lang="ts">
import { OnboardingProvider, vOnboardingStep } from '@zero-lab/onboarding-vue';
import type { OnboardingOptions } from '@zero-lab/onboarding';
const options: OnboardingOptions = {
  tours: [
    {
      id: 'onboarding',
      steps: [{ id: 'welcome', title: 'Welcome', content: 'A new beginning.' }],
    },
  ],
};
</script>

<template>
  <OnboardingProvider :options="options">
    <template #default="{ kit, state }">
      <section v-onboarding-step="'welcome'">Your workspace</section>
      <button @click="kit.start('onboarding')">Start onboarding</button>
      <output>{{ state.status }}</output>
    </template>
    <template #step="{ kit, state, labels }">
      <aside :aria-label="state.step?.title">
        <h2>{{ state.step?.title }}</h2>
        <p>
          <strong>{{ state.step?.content }}</strong>
        </p>
        <button @click="kit.skip()">{{ labels.skip }}</button>
        <button :disabled="state.stepIndex === 0" @click="kit.prev()">
          {{ labels.back }}
        </button>
        <button @click="kit.next()">
          {{ state.stepIndex === state.totalSteps - 1 ? labels.done : labels.next }}
        </button>
      </aside>
    </template>
  </OnboardingProvider>
</template>
```

Both slots receive the core renderer context `{ kit, state, labels }`, where
slot `state` is the snapshot, not a ref. The default slot always renders, so
targets exist before a tour starts. `#step` renders only while running and
automatically selects `renderer: 'none'` for an owned kit. Use a `Teleport` for
an overlay if desired. You own positioning, focus and dialog/focus-trap
semantics; core handles headless keyboard shortcuts.

Alternatively use `renderer: 'none'` and render from `useOnboarding()` elsewhere.
Pass `:kit="existingKit"` instead of `:options` to share an existing kit.
External kits must already have `renderer: 'none'` for custom UI, and their
slot labels use English defaults. Headless UI need not import core CSS.

## Vue Router

```ts
import { createVueRouterAdapter, createOnboardingPlugin } from '@zero-lab/onboarding-vue';

app.use(router);
app.use(
  createOnboardingPlugin({
    tours, // steps may specify route: '/' and route: '/settings'
    router: createVueRouterAdapter(router),
  }),
);
await router.isReady();
app.mount('#app');
```

The helper uses a structural `currentRoute`, `push`, `afterEach` interface.
`getPath()` returns `currentRoute.value.path`; subscriptions use actual
`afterEach` notifications and return its unsubscribe function. It never imports
`vue-router`. You can also supply any core `RouterAdapter`. Keep the provider
outside `RouterView`. See `examples/vue`.

## SSR and lifecycle

Create an app/plugin or component provider **per request**, not an SSR singleton.
Kit construction is SSR-safe; no mounting or subscription takes place until
Vue mounts in the browser. Keep initial options/markup deterministic and start
tours after hydration. The same core can serve a Next.js app via the React
adapter; see `@zero-lab/onboarding-react` and `examples/nextjs` for App Router hydration.

The provider captures options/kit/labels during setup. Use a different component
key for new configuration; declare a `#step` slot from the start rather than
adding it dynamically. The plugin attaches once at the app root's mounted hook.
Both clean up subscriptions and call the reversible `mount()` cleanup on
unmount, **not `destroy()`**, so externally owned kits can be reused. Unmounting
resets active state to idle but retains storage. Give each kit one lifecycle
owner; many children can consume it. Permanently retiring an external kit is
the owner's responsibility: call `destroy()` after unmount, and clean up your
own `kit.on` listeners.
