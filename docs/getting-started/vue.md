# Vue: your first tour

For an existing **Vue 3.3+** application. Install the plugin once, then start a tour from any descendant with the composable.

<!--@include: ../.vitepress/partials/package-status.md-->

## 1. Install

::: code-group

```sh [pnpm]
pnpm add @onboarding/vue @onboarding/core
```

```sh [npm]
npm install @onboarding/vue @onboarding/core
```

:::

## 2. Register the plugin

```ts [src/main.ts]
import { createApp } from 'vue';
import { createOnboardingPlugin } from '@onboarding/vue';
import App from './App.vue';
import '@onboarding/core/styles.css';

createApp(App)
  .use(
    createOnboardingPlugin({
      tours: [
        {
          id: 'welcome',
          steps: [
            {
              id: 'workspace',
              target: '[data-onboarding="workspace"]',
              title: 'Your workspace',
              content: 'Everything starts here.',
            },
            {
              id: 'create',
              target: '[data-onboarding="create"]',
              title: 'Make something new',
              content: 'Create your first project with this button.',
            },
          ],
        },
      ],
    }),
  )
  .mount('#app');
```

The plugin supplies one engine to the app and manages mounting and cleanup. The stylesheet is separate so headless apps do not have to load it.

## 3. Add targets and a launcher

```vue [src/App.vue]
<script setup lang="ts">
import { useOnboarding } from '@onboarding/vue';

const { kit, state } = useOnboarding();
</script>

<template>
  <main>
    <h1 data-onboarding="workspace">Your workspace</h1>
    <button data-onboarding="create">Create project</button>
    <button @click="kit.start('welcome')">Show me around</button>
    <p aria-live="polite">{{ state.status }}</p>
  </main>
</template>
```

Run your normal dev command, then choose **Show me around**. `state` is a computed ref: Vue unwraps it in templates; use `state.value` in JavaScript.

The plugin also registers `v-onboarding-step`, which writes the same attribute without adding a wrapper:

```vue
<h1 v-onboarding-step="'workspace'">Your workspace</h1>
```

## Make it yours

Use [CSS variables](/theming) to match your UI, or a `OnboardingProvider` with a `#step` slot for fully custom rendering. For multi-page tours, connect [`createVueRouterAdapter`](/routing#vue-router-and-angular-router) to Vue Router.
