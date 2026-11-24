# Multi-page tours

Core never imports or guesses your framework router. Supply this bridge:

```ts
interface RouterAdapter {
  getPath(): string;
  navigate(path: string): void | Promise<void>;
  subscribe(listener: () => void): () => void;
}
```

`getPath` must return the actual current route, not merely the last requested URL. `subscribe` must notify after committed route changes. Match the exact path convention used in your steps; query strings, hashes, locale prefixes, trailing slashes and base paths are application choices.

```ts
const tours = [
  {
    id: 'onboarding',
    steps: [
      { id: 'home', route: '/', target: '#welcome', title: 'Home', content: 'Start here.' },
      {
        id: 'settings',
        route: '/settings',
        target: '#settings',
        title: 'Settings',
        content: 'Make it yours.',
      },
    ],
  },
];
```

The engine requests navigation, waits until the router reports the step route, invokes `beforeShow`, then waits for the target to appear. Both forward and backward navigation follow routes. A timeout produces `step:error` and a centered fallback. Make auth redirects and denied routes explicit in your tour conditions.

## Vanilla JavaScript

```ts
import { createHistoryRouter } from '@onboarding/core';

const router = createHistoryRouter();
const stop = router.subscribe(() => renderPage(router.getPath()));
// Pass router into createOnboarding({ tours, router }).
// Use router.navigate('/settings') for links.
```

The helper handles its own navigation and browser back/forward. It does not monkey-patch `history.pushState` or render pages. Subscribe your page renderer before mounting onboardings so each navigation can render its targets.

## React Router

Create a stable adapter backed by committed `useLocation().pathname`; notify subscribers in an effect after location changes. Its `navigate` delegates to `useNavigate`. Keep the same adapter object across renders so the onboarding instance does not hold a stale reference. The complete integration is in `examples/react`.

If you already use React Router's data router, it supplies the subscription directly. With your existing `router` and the `tours` above:

```tsx
import { OnboardingProvider } from '@onboarding/react';
import { RouterProvider } from 'react-router-dom';
import type { OnboardingOptions } from '@onboarding/core';

const options: OnboardingOptions = {
  tours,
  router: {
    getPath: () => router.state.location.pathname,
    navigate: (path) => router.navigate(path),
    subscribe: (listener) => router.subscribe(() => listener()),
  },
};

function App() {
  return (
    <OnboardingProvider options={options}>
      <RouterProvider router={router} />
    </OnboardingProvider>
  );
}
```

Create `router` and `options` once, outside your components. The provider sits above the routed content, so changing pages does not unmount the tour.

## Next.js App Router

Keep the provider and tour setup in a `'use client'` component in `app/layout.tsx`. Bridge `useRouter().push` and `usePathname()` using a stable adapter; notify subscribers after pathname changes. A client provider stays mounted across layouts and pages. Do not start tours on the server or call the vanilla history router in Next.js. The complete example is in `examples/nextjs`.

This complete provider includes a two-page `onboarding` tour. Replace those steps with your own targets and use `<Providers>{children}</Providers>` in your root layout.

<<< @/../examples/nextjs/app/providers.tsx

The refs keep the adapter stable while the current router/path change. The effect notifies subscribers **after a route commits**, including Back/Forward. `start('onboarding')` then navigates and waits for the relevant target.

For Pages Router, adapt `router.pathname` or `router.asPath` consistently and subscribe/unsubscribe using `router.events.on/off('routeChangeComplete')`.

## Vue Router and Angular Router

Use the adapter helpers exported by their packages. Vue listens for completed navigation, Angular listens for `NavigationEnd`; both release subscriptions when the core unmounts. See `packages/vue/README.md` and `packages/angular/README.md` and the runnable examples.

With your existing Vue `app`, `router`, and tour definitions:

```ts
import { createOnboardingPlugin, createVueRouterAdapter } from '@onboarding/vue';

app.use(router);
app.use(
  createOnboardingPlugin({
    tours,
    router: createVueRouterAdapter(router),
  }),
);
await router.isReady();
app.mount('#app');
```

In Angular, add this provider alongside your existing `provideRouter(routes)`:

```ts
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { createAngularRouter, provideOnboarding } from '@onboarding/angular';

provideOnboarding(() => ({
  tours,
  router: createAngularRouter(inject(Router)),
}));
```

The factory runs in Angular's injection context. Use pathname-only `route` values for these helpers, such as `/settings`, without query strings or fragments.
