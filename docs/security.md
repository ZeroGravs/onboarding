# Security

Onboarding Kit runs inside your application. It is not an authorization layer, a sandbox, or a way to prove a user completed a business action.

## Text and configuration

The default renderer treats step titles, content, and labels as **plain text**, never HTML. You can show a text value without turning embedded markup into executable content.

Tour configuration is trusted application code. Selectors, routes, callbacks, `beforeShow`, and custom renderers can interact with your page and router. Do not accept arbitrary configuration from users or a remote CMS without validating it against a small application-owned schema. Map approved action IDs to your own callbacks instead of evaluating code.

With headless or custom UI, your application owns rendering, rich-content sanitization, focus management, and accessibility. Do not pass untrusted HTML to `innerHTML`, `v-html`, or similar escape hatches.

## Progress and privacy

Progress is stored in the browser's localStorage by default. It contains tour identifiers, version, status, step index, and update time. It is not encrypted or tamper-proof; users and same-origin scripts can change or remove it.

- Never put secrets, access tokens, personal data, or sensitive account information in tour IDs, step IDs, or storage keys.
- Do not use onboarding completion to unlock protected actions. Enforce permissions on your server.
- For a shared browser, use an account-scoped storage adapter or clear progress when changing accounts.
- Use `memoryStorage()` when progress should not persist.

```ts
import { createOnboarding, memoryStorage } from '@zero-lab/onboarding';

const kit = createOnboarding({
  storage: memoryStorage(),
  tours: [
    {
      id: 'welcome',
      steps: [{ id: 'intro', title: 'Welcome', content: 'Let us show you around.' }],
    },
  ],
});
```

Onboarding Kit does not send analytics to a service. `onEvent` only invokes your callback. Decide what to collect, obtain any necessary consent, and allowlist event fields before forwarding telemetry. Keep logging failures from interrupting your application.

## Server rendering and lifecycle

Create a provider or kit **per application instance or SSR request**, not a shared server singleton. Importing and constructing the kit is server-safe; mounting and starting a tour are browser operations. Framework adapters own their mount cleanup. Plain JavaScript integrations must call the returned unmount function or `destroy()` when appropriate.

Routes must be application-owned. A router adapter should notify the engine after navigation commits, so a tour does not act on a previous page. Keep your application's authentication and navigation guards.

## Application policy

Keep your framework and dependencies patched within the [supported compatibility range](/compatibility). Pin CDN package versions and retain your application's Content Security Policy. Test the default or custom renderer under that policy instead of disabling it for a tour.

A passing audit is a point-in-time dependency check, not a guarantee of security. Validate your own configuration, custom UI, and application integration before release.
