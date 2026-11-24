# @zero-lab/onboarding

Framework-independent, SSR-safe guided tours with a themeable default UI or custom/headless rendering.

```sh
pnpm add @zero-lab/onboarding
# npm install @zero-lab/onboarding
```

```ts
import { createOnboarding } from '@zero-lab/onboarding';
import '@zero-lab/onboarding/styles.css';

const kit = createOnboarding({
  tours: [
    {
      id: 'hello',
      steps: [
        {
          id: 'welcome',
          target: '#welcome',
          title: 'Welcome',
          content: 'This is your workspace.',
        },
      ],
    },
  ],
});
const unmount = kit.mount();
await kit.start('hello');
// unmount() on application teardown; kit.destroy() for permanent disposal.
```

Exports: `createOnboarding`, `memoryStorage`, `localStorageAdapter`, `createHistoryRouter`, `defaultRenderer`, and all public types. Importing the package never touches `window` or `document`. Browser work starts at `mount()` or `start()`.

Tours persist by default with a safe localStorage adapter. Use `memoryStorage()` for ephemeral sessions, or provide a synchronous custom adapter. Use `renderer: 'none'` for headless mode. The CDN build exposes `Onboarding` and includes its positioning dependency.

See the repository's API, routing, theming, compatibility, and security guides for full usage.
