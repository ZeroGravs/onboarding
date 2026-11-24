# Core API

## Configuration

`createOnboarding(options)` does not attach browser listeners until `mount()` or `start()`. Create one instance per application provider. Do not start tours during server rendering.

| Option          | Default                 | Description                                                      |
| --------------- | ----------------------- | ---------------------------------------------------------------- |
| `tours`         | Required                | Definitions with unique tour IDs and unique step IDs             |
| `storage`       | `localStorageAdapter()` | Synchronous `get`, `set`, `remove` adapter                       |
| `router`        | None                    | Required for steps with a `route`                                |
| `renderer`      | `'default'`             | `'none'` or a custom renderer function                           |
| `targetTimeout` | `5000`                  | Milliseconds to wait for each missing target or route            |
| `trapFocus`     | `true`                  | Default dialog focus trap                                        |
| `onEvent`       | None                    | Typed analytics callback                                         |
| `labels`        | English                 | Override `next`, `back`, `skip`, `done`, `stepOf(current,total)` |

A tour is `{ id, version?: number, steps, trigger? }`. Its default version is `1`.

A step is `{ id, title, content, target?, placement?, route?, beforeShow?, advanceOn? }`:

- `target`: CSS selector or `() => Element | null`; omitted for a centered dialog.
- `placement`: Floating UI placement, such as `'bottom-start'`.
- `beforeShow(signal)`: optional async preparation after navigation, before target lookup. Respect the abort signal if your preparation has side effects. Cancellation prevents stale onboarding rendering, but cannot undo your application-side effects.
- `advanceOn`: `{ selector: '#save', event: 'click' }`; delegated event matching also supports descendants.

## Lifecycle and control

```ts
const unmount = kit.mount(); // browser listeners; returns reversible cleanup
await kit.start('welcome'); // resumes an in-progress tour
await kit.start('welcome', { resume: false }); // starts at step 0
await kit.next();
await kit.prev();
kit.skip(); // saves skipped status
kit.reset('welcome'); // clears progress; cancels if currently active
kit.reset(); // clears every configured tour
unmount(); // cancels pending work, removes UI/listeners
kit.destroy(); // permanent disposal; no further mounting
```

`start()` automatically mounts in a browser if needed. Subsequent redundant `mount()` calls return a no-op cleanup: the original mount owns cleanup. Prefer framework adapters for managed lifecycles.

`next()` and `prev()` do nothing during navigation/target waits or after completion. `skip()`, `reset()`, `destroy()` and starting another tour cancel pending preparation and target waits. Route navigation already requested of your application router cannot be undone by this library.

```ts
const stop = kit.subscribe((state) => {
  // status: idle | navigating | waiting | running | completed | skipped
  // tourId, stepIndex (zero-based), totalSteps, step, target
});
const state = kit.getState();
stop();
```

`subscribe` notifies on changes; use `getState` for the current snapshot. `running` is the renderable state. Custom renderers receive it only after the step is prepared.

## Persistence

```ts
import { memoryStorage, localStorageAdapter } from '@onboarding/core';

const temporary = memoryStorage();
const persistent = localStorageAdapter('my-app:tours');
```

Records contain `{ status, stepIndex, version, updatedAt }`. Completing or skipping a tour suppresses automatic triggers. Manual `start` can replay it. In-progress tours resume at the last requested step. Increment a tour's version when changing its structure; outdated progress is discarded. `reset` clears persistence.

Browser storage is lazy, SSR-safe, and falls back to memory if unavailable, blocked, or full. Malformed stored values are ignored. A custom adapter must implement synchronous `get(id): Progress | null`, `set(id, value)` and `remove(id)` and should handle its own I/O failures. No user identity is included in storage keys; namespace or clear storage when your app switches accounts.

## Triggers

```ts
{ type: 'manual' }
{ type: 'firstVisit' }
{ type: 'route', path: '/dashboard' }
{ type: 'elementVisible', selector: '#publish' }
{ type: 'event', name: 'project-created', when: () => canShowOnboarding }

kit.trigger('project-created');
```

Triggers run only while mounted and while no tour is active. Only the first eligible tour in configuration order starts; there is no implicit queue. First-visit means no completed/skipped record (an in-progress record resumes). Route triggers require a router adapter. Visible-element triggers check the viewport on mount, DOM mutations, scrolling and resizing; they do not detect occlusion by other elements. Named events are dispatched through `kit.trigger`, not through DOM `dispatchEvent`. Conditions are synchronous and should be side-effect-free.

## Analytics

`onEvent(event)` or `kit.on(type, listener)` receives:

```ts
const unsubscribe = kit.on('step:shown', (event) => {
  // type, tourId, stepId, stepIndex, timestamp; error on step:error
});
unsubscribe();
```

Events: `tour:started`, `step:shown`, `step:completed`, `tour:completed`, `tour:skipped`, `step:error`. `step:completed` means advancing forward, not verifying a business action. Revisited steps can emit it again. The package has no network analytics client. Keep callbacks synchronous, non-throwing and fast.
