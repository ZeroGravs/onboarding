# Next.js App Router

Next.js 16 + React 19.2, with server-rendered pages and a small client provider.

```sh
# From the monorepo root
pnpm install
pnpm --filter @zero-lab/onboarding build
pnpm --filter @zero-lab/onboarding-react build
pnpm --filter @onboarding/example-nextjs dev --hostname 127.0.0.1 --port 3000
```

For a standalone npm app, `npm install next@^16.1 @zero-lab/onboarding @zero-lab/onboarding-react react@^19.2 react-dom@^19.2`
and add the TypeScript/type dev dependencies in `package.json`.
The workspace manifests themselves require pnpm.

Click **Start onboarding** on either page. The `onboarding` tour visits the
`welcome` target at `/` and the `settings` target at `/settings`. Storage is
`localStorageAdapter('example-nextjs')`.

```sh
pnpm --filter @onboarding/example-nextjs typecheck
pnpm --filter @onboarding/example-nextjs build
pnpm --filter @onboarding/example-nextjs start --hostname 127.0.0.1 --port 3000
```

## Hydration and routing recipe

`app/providers.tsx` is a `'use client'` boundary:

- It captures SSR-safe options once with `useState`. No browser access occurs
  during construction, and initial markup is idle on server and client.
- Its stable adapter reads a current-path ref and calls `router.push`.
  A `usePathname` effect updates that ref and notifies all subscribers **after
  navigation commits**, including Back/Forward. App Router has no `router.events`.
- The root layout keeps the provider mounted across both routes. Page targets
  can remain Server Components; only onboarding controls need the client hook.
- Mounting happens after hydration and uses reversible cleanup, making React
  StrictMode safe. Do not start a tour during server render or call destroy
  during effect cleanup.

Core CSS is imported separately in `app/layout.tsx`. The adapter's built ESM
and CJS entrypoints preserve `'use client'`.

For rich rendering, provide `renderStep={({ state, kit, labels }) => ...}`
on the inner `OnboardingProvider`. This disables default DOM for an owned kit;
you own accessible positioning/focus/dialog semantics (core supplies headless
keyboard shortcuts). See `packages/react/README.md` for the full API.
