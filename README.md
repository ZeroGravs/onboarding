# Onboarding Kit

Framework-independent, accessible product tours for **React, Next.js, Vue, Angular, and plain JavaScript**. Add spotlighted walkthroughs across routes, resume saved progress, and bring your own UI when you need it.

> **Experimental `0.1` preview.** The packages are **not yet published**, and APIs may change before `1.0`. The `@onboarding` npm scope must belong to you before publishing.

## Packages

| Package               | Use                                                                         |
| --------------------- | --------------------------------------------------------------------------- |
| `@onboarding/core`    | Engine, default UI, CSS, vanilla JS and CDN bundle                          |
| `@onboarding/react`   | React provider, hooks and anchors; Next.js client components                |
| `@onboarding/vue`     | Vue plugin, composable, directive and slotted provider                      |
| `@onboarding/angular` | Angular 21.2.26+ (21.x) providers, signals, directive and template renderer |

All packages are MIT licensed. Core has no framework dependency. React and Vue provide ESM, CommonJS, and TypeScript declarations; Angular uses the Angular Package Format (ESM).

## Install

After publishing, consumers can use either package manager:

```sh
pnpm add @onboarding/react @onboarding/core
# or
npm install @onboarding/react @onboarding/core
# or
yarn add @onboarding/react @onboarding/core
```

Replace `react` with `vue` or `angular` as needed. Plain JavaScript only needs `@onboarding/core`. In this workspace, the examples use local `workspace:*` dependencies.

## Start with plain JavaScript

```ts
import { createOnboarding } from '@onboarding/core';
import '@onboarding/core/styles.css';

const kit = createOnboarding({
  tours: [
    {
      id: 'welcome',
      version: 1,
      steps: [
        {
          id: 'create',
          target: '[data-onboarding="create"]',
          title: 'Create your first project',
          content: 'Everything starts with one idea.',
          placement: 'bottom',
        },
        {
          id: 'finish',
          title: 'You are ready',
          content: 'Steps without a target appear in the center.',
        },
      ],
    },
  ],
  onEvent: (event) => console.log(event.type, event.stepId),
});

const unmount = kit.mount();
document.querySelector('#help')?.addEventListener('click', () => {
  void kit.start('welcome');
});

// When your application unmounts:
// unmount();       // can mount again, keeps persisted progress
// kit.destroy();  // permanent disposal
```

`content` and `title` are **plain text**, never HTML. A selector or a function returning an element can be used as `target`. Targets can appear asynchronously. A missing target or failed `beforeShow` emits `step:error` and shows a centered, navigable fallback rather than leaving the tour stuck.

Framework-specific quick starts: [React / Next.js](packages/react/README.md), [Vue](packages/vue/README.md), [Angular](packages/angular/README.md). See the [API](docs/api.md), [routing](docs/routing.md), and [theming](docs/theming.md) guides.

## Features

- SVG spotlight with Floating UI positioning, flipping and viewport-aware shifting.
- Multi-page tours through an explicit router adapter.
- Versioned progress persistence with browser-storage and in-memory adapters.
- Manual, first-visit, route, visible-element and named-event triggers.
- Keyboard navigation, focus restoration, focus trapping and reduced-motion support.
- Typed analytics events, localization labels, and headless/custom rendering.
- SSR-safe imports. No browser globals are accessed until mounting or running a tour.

The default spotlight is visual: it does not prevent interacting with the highlighted element or the surrounding application. Default focus trapping can be disabled; see [accessibility](docs/theming.md#accessibility).

## Compatibility and security

See the [tested framework matrix](docs/compatibility.md) and [security boundaries](docs/security.md).
The initial Angular 18–21 preview range has been replaced with a patched Angular 21 baseline.
Packages are still unpublished; this release has no hosted service or uptime SLA.

## Contributing

Bug reports, small real-application reproductions, documentation improvements, and
focused pull requests are welcome. Read the [contribution guide](CONTRIBUTING.md)
for the workflow, local setup, verification, and release policy. Those development
commands are not required to install or use Onboarding Kit.

Participation follows the [code of conduct](CODE_OF_CONDUCT.md). Report potential
vulnerabilities privately using the [security policy](SECURITY.md), not public issues.

## Scope

Hotspot beacons, checklists, Svelte, visual editors, shadow-root targets and iframe targets are not part of this initial release.
