# Next.js: your first tour

For an existing **Next.js App Router** application. The validated integration uses Next.js 16 with React 19. Your root layout can remain a Server Component; the onboarding provider lives in a small client boundary.

<!--@include: ../.vitepress/partials/package-status.md-->

## 1. Install

::: code-group

```sh [pnpm]
pnpm add @zero-lab/onboarding-react @zero-lab/onboarding
```

```sh [npm]
npm install @zero-lab/onboarding-react @zero-lab/onboarding
```

:::

## 2. Create the client provider

```tsx [app/onboarding-provider.tsx]
'use client';

import type { ReactNode } from 'react';
import { OnboardingProvider } from '@zero-lab/onboarding-react';
import type { OnboardingOptions } from '@zero-lab/onboarding';

const options: OnboardingOptions = {
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
          title: 'Create a project',
          content: 'Turn your next idea into something real.',
        },
      ],
    },
  ],
};

export default function AppOnboardings({ children }: { children: ReactNode }) {
  return <OnboardingProvider options={options}>{children}</OnboardingProvider>;
}
```

The configuration is plain data, so it is safe during server rendering. Do not start a tour during render or create a browser/router singleton at module scope.

## 3. Wrap the root layout

```tsx [app/layout.tsx]
import type { ReactNode } from 'react';
import AppOnboardings from './onboarding-provider';
import '@zero-lab/onboarding/styles.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppOnboardings>{children}</AppOnboardings>
      </body>
    </html>
  );
}
```

Only the provider is a client boundary; server-rendered children can still pass through it. Keeping the provider in the layout lets it stay mounted across pages.

## 4. Mark the targets and start

```tsx [app/page.tsx]
'use client';

import { useOnboarding } from '@zero-lab/onboarding-react';

export default function Page() {
  const { kit } = useOnboarding();

  return (
    <main>
      <h1 data-onboarding="workspace">Your workspace</h1>
      <button data-onboarding="create">Create project</button>
      <button onClick={() => void kit.start('welcome')}>Show me around</button>
    </main>
  );
}
```

Run your app and choose **Show me around**. The first client effect mounts the engine after hydration; the button starts it only in the browser.

## Across multiple pages

The example above needs no router integration. When you add a step with `route`, connect an adapter using `useRouter()` and `usePathname()`; a no-op route subscription is not enough. See the [complete Next.js routing example](/routing#next-js-app-router).
