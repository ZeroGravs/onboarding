# @onboarding/angular

Standalone Angular **21.2.26+ (21.x)** bindings for `@onboarding/core`. Built as an ESM-only
Angular Package Format library with partial compilation. Requires Angular common,
core, router, and RxJS 7.

## Installation

```sh
pnpm add @onboarding/angular @onboarding/core
```

Keep Angular packages on matching versions. Import the default renderer stylesheet
once, in a global stylesheet:

```css
@import '@onboarding/core/styles.css';
```

Alternatively add `@onboarding/core/styles.css` to Angular CLI's global `styles`
array. The adapter does not import CSS or access browser globals on the server.

## Standalone application and Angular Router

```ts
import { inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { createAngularRouter, provideOnboarding } from '@onboarding/angular';
import { localStorageAdapter } from '@onboarding/core';
import { AppComponent } from './app.component';
import { routes } from './app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideOnboarding(() => ({
      router: createAngularRouter(inject(Router)),
      storage: localStorageAdapter('my-app'),
      tours: [
        {
          id: 'onboarding',
          steps: [
            {
              id: 'welcome',
              route: '/',
              target: '[data-onboarding="welcome"]',
              title: 'Welcome',
              content: 'Your workspace starts here.',
            },
            {
              id: 'settings',
              route: '/settings',
              target: '[data-onboarding="settings"]',
              title: 'Settings',
              content: 'Adjust your preferences.',
            },
          ],
        },
      ],
    })),
  ],
});
```

`provideOnboarding(options)` also accepts a plain `OnboardingOptions` object.
The factory form runs in Angular's injection context. Provide it once at application
scope: its environment initializer creates and mounts the kit in the browser;
destroying that injector unsubscribes, unmounts, and destroys it. SSR creates the
state container but does not mount; the service's `start()` is a no-op on the server.
Start tours in browser interactions rather than server constructors. Direct calls
to `kit.start()` bypass this guard (core's `start()` can auto-mount).

`createAngularRouter(router)` uses Angular navigation, not browser history patches.
It reports successful `NavigationEnd` events, strips query strings/fragments from
`getPath()`, rejects cancelled navigations, and returns an unsubscribe function.
Use pathname-only step routes such as `/settings`.

## Targets and service

```ts
import { Component, inject } from '@angular/core';
import { OnboardingService, OnboardingStepDirective } from '@onboarding/angular';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [OnboardingStepDirective],
  template: `
    <h1 onboardingStep="welcome">Your workspace</h1>
    <button type="button" (click)="onboarding.start('onboarding')">Start onboarding</button>
    <p aria-live="polite">{{ onboarding.state().status }}</p>
  `,
})
export class WelcomeComponent {
  readonly onboarding = inject(OnboardingService);
}
```

`[onboardingStep]` writes `data-onboarding`; it does not register a step. Changing or
clearing its input updates or removes the attribute. A literal `data-onboarding`
attribute works equally well.

`OnboardingService` exposes:

- `state`: readonly Angular signal of the core `OnboardingState`.
- `kit`: the underlying core instance.
- `start(id, { resume? })`, `next()`, `prev()` (async).
- `skip()`, `reset(id?)`, `trigger(name)`, `on(type, listener)` (returns unsubscribe).

State may be `idle`, `waiting`, or `navigating` with no renderable target. Render a
step only when `status === 'running'`; `step` and `target` are nullable. Core defaults
to its accessible renderer. A custom core renderer function is passed through
unchanged and receives `{ state, kit, labels }`; return cleanup for each render.

## Angular ng-template renderer

Set `renderer: 'none'` in the provider and import `OnboardingOutletComponent` in your
standalone component. This disables the core DOM renderer; the outlet reacts to the
service signal and renders only a running, non-null step.

```html
<onboarding-outlet>
  <ng-template let-state let-kit="kit">
    <aside role="region" aria-labelledby="tour-title" aria-live="polite">
      <h2 id="tour-title">{{ state.step?.title }}</h2>
      <p>{{ state.step?.content }}</p>
      <p>Step {{ state.stepIndex + 1 }} of {{ state.totalSteps }}</p>
      <button type="button" (click)="kit.skip()">Skip</button>
      <button type="button" [disabled]="state.stepIndex === 0" (click)="kit.prev()">Back</button>
      <button type="button" (click)="kit.next()">
        {{ state.stepIndex + 1 === state.totalSteps ? 'Done' : 'Next' }}
      </button>
    </aside>
  </ng-template>
</onboarding-outlet>
```

The template's implicit value and `state` are the current state; `kit` is the core
instance. Alternatively use `OnboardingService.state()` directly in your own template.
The outlet supplies no overlay, positioning, labels, focus management, or focus trap.
You own those concerns, including accessible dialog behavior if you build a modal.
Core still handles Escape and arrow keys for headless onboardings; avoid duplicating
those listeners.
