# Compatibility and reliability

Install Onboarding Kit into your existing application with **npm, pnpm, or Yarn**. You do not need pnpm to consume the packages, and the compiler used to build the library does not select your application's TypeScript version.

## Framework support

| Integration                     | Supported range                                | Release validation                                                                                      |
| ------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Vanilla JavaScript / TypeScript | Modern browsers with ES2022 and DOM APIs       | ESM and CommonJS package imports, CSS export, SSR-safe construction, browser tour                       |
| React                           | React 18 and 19                                | React 18.0.0 and 19.3.1: independent installs, strict TypeScript and provider/hook SSR                  |
| Next.js                         | React adapter in an App Router client boundary | Next.js 16.4.6 with React 19.3.1: production build, SSR and multi-route browser tour                    |
| Vue                             | Vue 3.3+                                       | Vue 3.3.0 and 3.5.46: independent installs, strict TypeScript, provider/plugin SSR and directive output |
| Angular                         | Angular **21.2.26+ within 21.x**, RxJS 7       | Angular 21.2.26: independent installs, strict TypeScript, provider injection, production browser tour   |

These are tested baselines, not a promise that every future framework release works automatically. Use patched framework releases and your framework's supported Node.js and TypeScript versions. Angular 18–20 are no longer supported; Angular 22 is not yet validated or in the peer range. This replaces the initial preview's broad Angular 18–21 claim.

React, Vue, and core provide ESM, CommonJS, and declarations. Angular is ESM-only in the Angular Package Format. CSS is a separate `@onboarding/core/styles.css` import.

The Angular adapter requires RxJS 7.8.2+ within major 7. Older 7.4 packages do not resolve declarations correctly under the strict modern module-resolution check. TypeScript applications need DOM library types for the public browser APIs, even when compiling SSR code; server execution itself does not need DOM globals.

## Yarn compatibility

Packed-consumer checks also passed with Yarn Classic **1.22.22** and Yarn **4.19.0**, using both `node_modules` and strict Plug'n'Play. These checks cover core, React 19.3.1, Vue 3.5.46, and Angular 21.2.26 with strict TypeScript, CSS resolution, and server-side execution. They are additional local checks; the repeatable release gate below currently runs npm and pnpm.

Vue 3.5.46's compiler declarations reference `@babel/types` without declaring it directly. With Yarn Plug'n'Play and `skipLibCheck: false`, add this narrowly scoped upstream workaround to your application's `.yarnrc.yml`:

```yaml
packageExtensions:
  '@vue/compiler-core@3.5.46':
    dependencies:
      '@babel/types': '^7.29.11'
```

Then run `yarn install`. Remove the extension when upgrading to a Vue compiler that declares this dependency. Yarn's `nodeLinker: node-modules` mode does not need the workaround. No extension is needed for the tested core, React, or Angular consumers.

## What release validation covers

Each package is packed and installed into independent temporary applications using npm and pnpm, without workspace links. This catches missing files, unrewritten workspace dependencies, peer conflicts, and declaration incompatibilities that monorepo examples can hide.

Production examples exercise all five integrations in Chromium, Firefox, and WebKit:

- Navigation across routes and waiting for the destination target.
- Saved progress after reload and replay from the beginning.
- Keyboard controls, focus restoration, and cleanup on exit.
- Small-screen spotlight geometry and viewport-clamped popovers.

The documentation live example is also checked after static production rendering. Test coverage is not an uptime SLA or proof of conformance to every accessibility requirement.

## Before using it in your application

Start with one small tour in a non-production environment. Test your own navigation guards, delayed content, nested scroll containers, modals, account switching, and Content Security Policy. Custom renderers own their positioning, focus, and accessibility.

Keep the provider mounted above routes for a multi-page tour. Use stable `data-onboarding` attributes rather than visual classes or translated labels. Version a tour when an existing saved step no longer means the same thing.

Shadow-root targets, iframe targets, and a visual tour builder are outside this release's scope. See [security boundaries](/security) and [routing requirements](/routing).
