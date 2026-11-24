# Small changes, useful results

Get a basic tour working first. These focused recipes add one capability at a time; pass the shown options to your framework provider or `createOnboarding`.

## Match your brand

Import the default CSS once, then override variables in your application stylesheet:

```css
:root {
  --onboarding-primary: #087f8c;
  --onboarding-primary-text: white;
  --onboarding-radius: 12px;
  --onboarding-font: inherit;
}
```

No theme provider or CSS framework is required. [All styling options](/theming).

## Resume or replay

Progress is persisted automatically. An in-progress tour resumes at its last step:

```ts
await kit.start('welcome');
```

Start from the beginning without clearing other tours:

```ts
await kit.start('welcome', { resume: false });
```

Clear a saved record, including completed/skipped status:

```ts
kit.reset('welcome');
```

Use memory-only storage for ephemeral tours:

```ts
import { memoryStorage } from '@zero-lab/onboarding';

const options = {
  tours,
  storage: memoryStorage(),
};
```

## Show it once

Add a first-visit trigger to a tour:

```ts
const tours = [
  {
    id: 'welcome',
    version: 1,
    trigger: { type: 'firstVisit' as const },
    steps: [
      {
        id: 'workspace',
        target: '[data-onboarding="workspace"]',
        title: 'Welcome',
        content: 'Your workspace starts here.',
      },
    ],
  },
];
```

Completed or skipped tours do not automatically start again. Increment `version` when a changed tour should invalidate old progress. Mount only when your application is ready; [trigger behavior](/api#triggers).

## Start after a real action

Use a named trigger rather than guessing when a framework has finished rendering:

```ts
// On the tour definition:
trigger: { type: 'event', name: 'project-created' }

// After your own application creates a project:
kit.trigger('project-created');
```

A step can also wait for lazy content with `target` or async `beforeShow`. Starting another tour, skipping, or unmounting cancels pending onboarding preparation. [Step options](/api#configuration).

## Record analytics

```ts
import type { OnboardingOptions } from '@zero-lab/onboarding';

const options: OnboardingOptions = {
  tours,
  onEvent(event) {
    console.log(event.type, event.tourId, event.stepId);
  },
};
```

Replace the log with your own analytics client; Onboarding Kit sends nothing over the network itself.

## Use your own React UI

```tsx
<OnboardingProvider
  options={options}
  renderStep={({ state, kit, labels }) => (
    <aside aria-label={state.step?.title}>
      <h2>{state.step?.title}</h2>
      <p>{state.step?.content}</p>
      <button onClick={() => kit.skip()}>{labels.skip}</button>
      <button onClick={() => void kit.next()}>{labels.next}</button>
    </aside>
  )}
>
  <YourApplication />
</OnboardingProvider>
```

This replaces the entire default UI, not just its text. You own positioning, focus, and accessibility. Vue offers a `#step` slot; Angular offers `OnboardingOutletComponent`. For a fully headless integration, use `renderer: 'none'` and render from reactive state. [Custom rendering responsibilities](/theming#custom-renderer).

## Continue on another page

Add `route` to steps and provide an adapter for your real router. The engine navigates, waits for the committed route, then finds the target.

```ts
{
  id: 'settings',
  route: '/settings',
  target: '[data-onboarding="settings"]',
  title: 'Make it yours',
  content: 'Adjust your preferences here.',
}
```

Do not use the vanilla history adapter inside a framework router. Follow the [routing guide](/routing) for React Router, Next.js, Vue Router or Angular Router.
