# React + Vite

Two routes, a persistent provider, and a real React Router subscription.

From the monorepo root, install dependencies and build the libraries first:

```sh
pnpm install
pnpm --filter @onboarding/core build
pnpm --filter @onboarding/react build
pnpm --filter @onboarding/example-react dev --host 127.0.0.1 --port 5173
```

For an npm-based standalone app, install `@onboarding/core`,
`@onboarding/react`, `react`, `react-dom`, and `react-router-dom` with
`npm install`, plus the Vite/TypeScript dev dependencies listed in `package.json`.
Workspace manifests themselves require pnpm.

Click **Start onboarding** on either route. The `onboarding` tour visits `/`
(`data-onboarding="welcome"`) then `/settings` (`data-onboarding="settings"`).
Progress uses `localStorageAdapter('example-react')`.
`router.subscribe` tracks actual navigations, including browser history.

```sh
pnpm --filter @onboarding/example-react typecheck
pnpm --filter @onboarding/example-react build
```

Core CSS is imported separately in `src/main.tsx`. The provider stays above
the outlet and uses mount cleanup, not destroy, so StrictMode is safe.
For custom React UI, add a `renderStep={({ state, kit, labels }) => ...}`
callback to the provider; it selects headless rendering automatically.
See `packages/react/README.md` for focus/keyboard ownership and Next hydration.
