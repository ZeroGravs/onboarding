# React: your first tour

For an existing **React 18 or 19** application. You will add one provider and two targets. Using Next.js? Follow the [App Router quickstart](/getting-started/nextjs) instead.

<!--@include: ../.vitepress/partials/package-status.md-->

## 1. Install

::: code-group

```sh [pnpm]
pnpm add @onboarding/react @onboarding/core
```

```sh [npm]
npm install @onboarding/react @onboarding/core
```

:::

React and React DOM stay on your application's existing versions.

## 2. Add the tour and provider

Use this as `App.tsx`, or move the provider above your existing screen:

```tsx [App.tsx]
import { OnboardingProvider, useOnboarding } from '@onboarding/react';
import type { OnboardingOptions } from '@onboarding/core';
import '@onboarding/core/styles.css';

const options: OnboardingOptions = {
  tours: [
    {
      id: 'welcome',
      steps: [
        {
          id: 'workspace',
          target: '[data-onboarding="workspace"]',
          title: 'Welcome to your workspace',
          content: 'Everything you need starts here.',
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
};

function Dashboard() {
  const { kit } = useOnboarding();

  return (
    <main>
      <h1 data-onboarding="workspace">Your workspace</h1>
      <button data-onboarding="create">Create project</button>
      <button onClick={() => void kit.start('welcome')}>Show me around</button>
    </main>
  );
}

export default function App() {
  return (
    <OnboardingProvider options={options}>
      <Dashboard />
    </OnboardingProvider>
  );
}
```

**Why it works:** `OnboardingProvider` creates and mounts the engine. `useOnboarding()` gives descendants access to it. Each `target` matches an element in your existing UI; the attributes do not change its appearance or behavior.

The CSS import supplies the default spotlight and popover. Import it only once. Keep `options` stable: declare it outside a component, as above, or initialize it once with state.

## 3. Start your application

Run your normal development command and click **Show me around**. Use **Next**, **Back**, **Escape**, or the arrow keys to navigate.

Progress is saved in localStorage by default. To replay from the beginning:

```tsx
<button onClick={() => void kit.start('welcome', { resume: false })}>Replay the tour</button>
```

The hook also returns `state` if you want to show progress elsewhere:

```tsx
const { kit, state } = useOnboarding();
// state.status, state.stepIndex, state.totalSteps
```

## Make it yours

[Style the default UI](/theming), [connect React Router](/routing#react-router), or [render your own step UI](/recipes#use-your-own-react-ui).
