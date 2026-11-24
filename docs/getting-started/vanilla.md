# Vanilla JavaScript: your first tour

For an existing **Vite or similar bundled application**. No framework adapter is required. The example uses TypeScript, but the same API works in JavaScript.

<!--@include: ../.vitepress/partials/package-status.md-->

## 1. Install

::: code-group

```sh [pnpm]
pnpm add @zero-lab/onboarding
```

```sh [npm]
npm install @zero-lab/onboarding
```

:::

## 2. Mark your targets

```html [index.html]
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Your workspace</title>
  </head>
  <body>
    <main>
      <h1 data-onboarding="workspace">Your workspace</h1>
      <button data-onboarding="create">Create project</button>
      <button id="show-tour">Show me around</button>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

The `data-onboarding` values are stable anchors. They do not change your markup's appearance, unlike wrapping elements solely for positioning.

## 3. Create and start the tour

```ts [src/main.ts]
import { createOnboarding } from '@zero-lab/onboarding';
import '@zero-lab/onboarding/styles.css';

const kit = createOnboarding({
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
});

kit.mount();
document.querySelector('#show-tour')?.addEventListener('click', () => {
  void kit.start('welcome');
});
```

Run your normal dev command and choose **Show me around**. Core finds each target, positions the default UI, handles controls, and persists progress.

In an application with a managed lifecycle, call `kit.destroy()` when permanently removing the integration. If you only need temporary unmounting, save and call the cleanup returned by `mount()`; it can mount again later.

## No bundler?

After publication, use the standalone bundle without npm or a build tool. It exposes the `Onboarding` browser global:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@zero-lab/onboarding@0.1.0/dist/styles.css"
/>
<script src="https://cdn.jsdelivr.net/npm/@zero-lab/onboarding@0.1.0/dist/cdn.global.js"></script>
<script>
  const kit = Onboarding.createOnboarding({
    tours: [
      {
        id: 'welcome',
        steps: [{ id: 'hello', title: 'Welcome', content: 'Your tour starts here.' }],
      },
    ],
  });
  document.querySelector('#show-tour')?.addEventListener('click', () => {
    void kit.start('welcome');
  });
</script>
```

Pin a specific package version rather than `latest`. Keep your application's Content Security Policy; use an allowed external script or a nonce for the initialization code when required.

## Make it yours

[Style the popover](/theming), [connect your page renderer](/routing#vanilla-javascript), or [listen for analytics events](/api#analytics).
