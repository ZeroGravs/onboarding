# Angular example

Standalone Angular 18 application using the default Onboarding Kit renderer, Angular
Router, and browser-local progress (`example-angular`). The two-step `onboarding`
tour starts on `/` and navigates to `/settings`.

From the monorepo root, after the workspace owner installs dependencies:

```sh
pnpm --filter @zero-lab/onboarding build
pnpm --filter @zero-lab/onboarding-angular build
pnpm --filter @onboarding/example-angular dev --host 127.0.0.1 --port 4177
```

Open http://127.0.0.1:4177 and choose **Start onboarding**. Use Next to visit settings,
Back to return, or Escape/Skip to dismiss. Start onboarding resumes an unfinished
tour after a reload; completed and skipped tours start again from the first step.
The launcher remains mounted across both routes so focus can return to it.

```sh
pnpm --filter @onboarding/example-angular typecheck
pnpm --filter @onboarding/example-angular build
```

The CLI includes `@zero-lab/onboarding/styles.css` as a global stylesheet. No custom
renderer or template outlet is required for this default-renderer example.
