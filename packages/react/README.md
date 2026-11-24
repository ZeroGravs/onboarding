# @onboarding/react

React 18 and 19 bindings for Onboarding Kit. MIT.

## Install

```sh
pnpm add @onboarding/react @onboarding/core react react-dom
# or
npm install @onboarding/react @onboarding/core react react-dom
```

Import the **core CSS separately** once in your app entry or root layout:

```tsx
import '@onboarding/core/styles.css';
```

## Minimal usage

```tsx
import { OnboardingProvider, OnboardingStep, useOnboarding } from '@onboarding/react';
import { localStorageAdapter, type OnboardingOptions } from '@onboarding/core';

const options: OnboardingOptions = {
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
};

function Screen() {
  const { kit, state } = useOnboarding();
  return (
    <>
      <OnboardingStep name="welcome">
        <button>Your workspace</button>
      </OnboardingStep>
      <button onClick={() => void kit.start('onboarding')}>Start onboarding</button>
      <output>{state.status}</output>
    </>
  );
}

export default function App() {
  return (
    <OnboardingProvider options={options}>
      <Screen />
    </OnboardingProvider>
  );
}
```

`useOnboarding()` returns `{ kit, state }`; state is a reactive snapshot via
`useSyncExternalStore`. The hook must be inside a provider.
`OnboardingStep` renders a `span` with `data-onboarding={name}` and preserves its
children, HTML attributes and events. For block-level targets, put
`data-onboarding` directly on your element instead.

## Rich rendering / headless

```tsx
<OnboardingProvider
  options={options}
  renderStep={({ state, kit, labels }) => (
    <aside aria-label={state.step?.title}>
      <h2>{state.step?.title}</h2>
      <p>
        <strong>{state.step?.content}</strong>
      </p>
      <button onClick={() => kit.skip()}>{labels.skip}</button>
      <button onClick={() => void kit.prev()} disabled={state.stepIndex === 0}>
        {labels.back}
      </button>
      <button onClick={() => void kit.next()}>
        {state.stepIndex === state.totalSteps - 1 ? labels.done : labels.next}
      </button>
    </aside>
  )}
>
  <Screen />
</OnboardingProvider>
```

`renderStep` receives the core `RendererContext`: `{ state, kit, labels }`.
It is called only while `state.status === 'running'` and automatically chooses
`renderer: 'none'` for a provider-owned kit. React owns the returned UI; you can
return a portal. Labels come from the initial options merged with English defaults.
You own positioning, focus management and any dialog semantics/focus trap.
Core supplies headless keyboard shortcuts. Omit the callback and pass
`renderer: 'none'` to use the hook to render entirely elsewhere.

You can instead supply `<OnboardingProvider kit={existingKit}>`. Configure that
external kit with `renderer: 'none'` yourself when rendering custom UI; the
provider cannot reconfigure it. Callback labels for external kits use defaults.
Default rendering needs the separate core CSS; headless-only UI does not.

## Routers

No router is a peer dependency. Provide the core `RouterAdapter`:

```tsx
// React Router data router, created outside the component:
const adapter = {
  getPath: () => router.state.location.pathname,
  navigate: (path: string) => router.navigate(path),
  subscribe: (listener: () => void) => router.subscribe(() => listener()),
};
// Supply { ...options, router: adapter } to the provider.
// Add route: '/' or route: '/settings' to each step.
```

Subscribe to actual route commits (including Back/Forward), not just clicks or
calls to `navigate`. Keep the provider above the routed outlet so navigation
doesn't unmount the tour. See `examples/react`.

### Next.js App Router / hydration

- Put a `'use client'` provider wrapper in the root layout; Server Components
  can remain its children. The published ESM **and CJS** entrypoints preserve
  the client directive.
- Create options once with `useState`; never create a browser/router singleton
  in an SSR module. `createOnboarding` and `localStorageAdapter` are SSR-safe.
- Use `useRouter().push` for navigation and `usePathname()` in an effect to
  update a stable path ref and notify adapter subscribers after route commits.
  App Router has no `router.events`; a no-op subscription is not sufficient.
- Render the same initial markup on server and client. Mounting happens in an
  effect, with a cached initial server snapshot. Start tours after hydration,
  e.g. from a button, not during render.
- Import `@onboarding/core/styles.css` in `app/layout.tsx`.

`examples/nextjs/app/providers.tsx` is a complete implementation with a stable
adapter and real pathname notifications.

## Lifecycle

Options, labels and kit are captured on the first render. Change the provider's
React `key` to replace configuration. Providers call `kit.mount()` in an effect
and its reversible cleanup on unmount. They **do not call `destroy()`**, allowing
StrictMode effect replay and reuse of externally owned kits. Core unmount
returns the state to idle while retaining persisted progress. One provider
should own the mount lifecycle of each kit; hooks can be used by many children.
For an external kit, call `destroy()` only when you permanently retire it,
after its provider unmounts. Events can be subscribed with `kit.on`; unsubscribe
your own listeners in effect cleanup.
