# Angular: your first tour

For an existing **standalone Angular 21.2.26+ (21.x)** application. You need one application provider and an injected service. Angular 18–20 and 22 are not currently supported.

<!--@include: ../.vitepress/partials/package-status.md-->

## 1. Install and import the styles

::: code-group

```sh [pnpm]
pnpm add @onboarding/angular @onboarding/core
```

```sh [npm]
npm install @onboarding/angular @onboarding/core
```

:::

Keep Angular packages on matching versions. The adapter uses Angular's common, core, and router packages, plus RxJS 7.8.2+ within major 7.

```css [src/styles.css]
@import '@onboarding/core/styles.css';
```

## 2. Provide the tour

```ts [src/app/app.config.ts]
import type { ApplicationConfig } from '@angular/core';
import { provideOnboarding } from '@onboarding/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideOnboarding({
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
    }),
  ],
};
```

Keep your existing providers alongside `provideOnboarding`. The provider owns the engine's browser lifecycle; it does not mount during SSR.

## 3. Inject the service

```ts [src/app/app.component.ts]
import { Component, inject } from '@angular/core';
import { OnboardingService } from '@onboarding/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <main>
      <h1 data-onboarding="workspace">Your workspace</h1>
      <button data-onboarding="create">Create project</button>
      <button type="button" (click)="onboarding.start('welcome')">Show me around</button>
      <p aria-live="polite">{{ onboarding.state().status }}</p>
    </main>
  `,
})
export class AppComponent {
  readonly onboarding = inject(OnboardingService);
}
```

Your normal bootstrap must use the application configuration:

```ts [src/main.ts]
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig).catch(console.error);
```

Run your app and choose **Show me around**. `state()` is a read-only Angular signal, so progress updates participate in change detection.

## Make it yours

Literal `data-onboarding` attributes need no directive import. You can also use `OnboardingStepDirective` with `onboardingStep="workspace"`.

Use [CSS variables](/theming) for the default UI. Connect `createAngularRouter` when adding [steps on other routes](/routing#vue-router-and-angular-router). A custom `OnboardingOutletComponent` template is available for headless rendering; then you own the UI and accessibility.
