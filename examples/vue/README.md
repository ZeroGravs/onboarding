# Vue + Vite

A render-function Vue app (no SFC compiler needed) with Vue Router and Onboarding Kit.

```sh
# From the monorepo root
pnpm install
pnpm --filter @onboarding/core build
pnpm --filter @onboarding/vue build
pnpm --filter @onboarding/example-vue dev --host 127.0.0.1 --port 5174
```

For a standalone npm app, `npm install @onboarding/core @onboarding/vue vue vue-router`
and install the Vite/TypeScript dev dependencies in `package.json`.
The checked-in workspace manifests require pnpm.

Click **Start onboarding**. The `onboarding` tour goes from the `welcome` target
on `/` to `settings` on `/settings`, using
`localStorageAdapter('example-vue')`. The optional structural router helper
uses Vue Router's real `afterEach` subscription, not a no-op.

```sh
pnpm --filter @onboarding/example-vue typecheck
pnpm --filter @onboarding/example-vue build
```

`src/main.ts` imports core CSS separately and installs the app-wide plugin.
`vOnboardingStep` adds the target attributes. The plugin unmounts listeners with
the app without destroying a reusable kit. For scoped rich UI, replace the
plugin with `OnboardingProvider` and a `#step="{ state, kit, labels }"` slot.
See `packages/vue/README.md` for slots, focus ownership, and per-request SSR rules.
