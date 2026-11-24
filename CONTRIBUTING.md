# Maintaining Onboarding Kit

This guide is for package contributors, not applications installing Onboarding Kit.
Consumer documentation lives in `docs/`.

## Contributing

Follow the [code of conduct](CODE_OF_CONDUCT.md). For potential vulnerabilities,
use the [security policy](SECURITY.md), not a public issue or pull request.

Use the bug-report form for reproducible failures and the feature-request form
for proposed capabilities. Search existing issues first. Include the package and
framework versions, expected behavior, and a minimal reproduction you are allowed
to share. Never upload secrets, private application code, or personal account data.

For a contribution:

1. Discuss substantial API or architectural changes in an issue before implementing them. Small fixes and documentation improvements do not need a separate proposal.
2. Fork the repository and work on a focused branch. Keep unrelated refactors out of the pull request.
3. Follow the existing TypeScript, formatting, lifecycle, accessibility, and plain-text rendering conventions. Add focused regression coverage for behavior you change.
4. Run `pnpm verify` for code changes. Run `pnpm test:consumers` and `pnpm test:e2e` for package, framework, or public API changes. Website changes also need `pnpm test:docs`; community-document-only edits need `pnpm format:check`.
5. Add a Changeset with `pnpm changeset` when published behavior, public APIs, or compatibility changes. Explain why no Changeset is needed for documentation-only or development-tool-only changes.
6. Open a pull request describing the problem, approach, compatibility impact, and verification performed. Include screenshots for visual changes.

Feedback and maintenance are best effort. A proposal or pull request does not
guarantee acceptance, a delivery date, or ongoing support for a new integration.

## Version and support policy

The project is an experimental `0.1` preview, not a stable `1.0` API. Before `1.0`,
compatible fixes use patch releases and breaking public changes increment the minor
version. Document breaking changes and migration steps in the Changeset and release
notes. The four public packages share a fixed version group.

Support only framework ranges exercised by the consumer and browser checks; do
not widen peer ranges based on an untested future release. Follow the supported
release policy in [SECURITY.md](SECURITY.md) for security fixes.

## Local documentation and examples

Workspace development requires Node.js **22.18+**, **24.11+**, or **26+**, and pnpm 10.
These are development-tool requirements, not compiler or package-manager requirements
imposed on consuming applications.

```sh
pnpm install
pnpm docs:dev
```

Open `http://localhost:5174`. To run an example instead:

```sh
pnpm build
pnpm --filter @onboarding/example-react dev --port 5173
```

Replace `example-react` with `example-nextjs`, `example-vue`, `example-angular`, or
`example-vanilla` as needed. Do not copy these workspace commands into consumer quickstarts.

For a static build and local preview:

```sh
pnpm docs:build
pnpm docs:preview
```

Output is `docs/.vitepress/dist`; set `DOCS_BASE=/onboarding/` for subpath hosting.
No deployment or hosting provider is configured. The private site pins VitePress
2.0.0-alpha.21 on Vite 8 rather than stable VitePress 1's Vite 5 dependency.
The workspace compiler is TypeScript 5.9, independent of consumers' compilers.
Next.js regenerates `next-env.d.ts` and route types before typechecking; these
environment declarations are generated, not committed source.

## Verification and release policy

```sh
pnpm verify
pnpm exec playwright install chromium firefox webkit
pnpm verify:release
```

`verify` includes the full workspace dependency audit at every severity level, with
no advisory suppression. `verify:release` adds real tarball installs with npm and
pnpm, production application tests across Chromium/Firefox/WebKit, and the static
documentation browser tests. It never publishes. Individual consumer checks:

```sh
pnpm test:consumers
node scripts/check-consumers.mjs --pm npm --profile react18,vue33
pnpm test:e2e
pnpm test:docs
```

The consumer harness uses disposable directories outside the workspace, ignores
dependency install scripts, checks peer dependencies strictly, compiles without
`skipLibCheck`, and removes its own temporary files. Package installation requires
registry access, even though Onboarding Kit itself comes from local tarballs.

Browser verification uses production builds on ports 4173–4177. Next.js uses
`.next-verification`, leaving the normal `.next/dev` lock and developer server
alone. Documentation preview uses port 4180. The suite owns and stops its helpers.

The verification workflow runs read-only jobs for pull requests, main, manual runs,
and a weekly scheduled audit. Actions use immutable commit references; checkout
does not persist credentials, and installs disable lifecycle scripts. Dependabot
proposes npm and action updates; it does not merge or publish them. Set the checks
as required in your repository's branch protection before relying on them.

The patched Angular baseline is 21.2.26 within major 21, not the initial Angular
18–21 preview range. Angular 22 currently requires a newer Node baseline than the
local development environment and has not been validated. Public peer ranges and
the compatibility guide must follow actual consumer tests.

Six targeted pnpm overrides patch `glob`/`minimatch` under private formatting
and CLI tooling. Remove them when those parents adopt patched majors, and rerun
the full gate. Do not add blanket overrides or audit allowlists to hide failures.

Before a public release, configure a private vulnerability-reporting channel in
the eventual repository, registry ownership, and appropriate publication
authentication. None of those account-level settings are provisioned here.

### Public-launch checklist

The community files do not create a GitHub repository or enable hosted settings.
Before inviting public users:

- Set the actual repository URL in all four package manifests. Use `repository.type: "git"`, its HTTPS Git URL, and `repository.directory: "packages/<name>"`; set `homepage` to the real documentation or repository README and `bugs.url` to the repository's issues page. Do not publish placeholder owner names or URLs.
- Enable GitHub private vulnerability reporting and confirm that **Security > Report a vulnerability** is available. The private-reporting fallback in `SECURITY.md` is not a substitute for enabling this channel.
- Publish a private maintainer contact for project-specific conduct reports when one is available. The platform abuse-reporting route in `CODE_OF_CONDUCT.md` reaches GitHub, not project maintainers.
- Run the verification workflow on GitHub and make the relevant checks required. Configure branch/review protections appropriate to the maintainer team; require review for workflow and release changes.
- Enable GitHub secret scanning and push protection where available. Review intended tracked files with an offline secret scanner before the first push; never send repository contents to an external scanning service without authorization.
- Keep credentials out of `.env.example` files and committed package-manager configuration. Shared `.npmrc` configuration may use environment-variable references, never literal tokens. Ignore rules do not protect files that were already tracked; rotate any exposed credential.
- Review third-party redistribution notices, including dependencies included in the CDN bundle, and retain required license and attribution information.
- Confirm registry scope ownership and secure publication authentication separately. The repository can be public while npm packages remain unpublished.

### Angular packaging

ng-packagr writes APF output to `packages/angular/dist`. The build copies the MIT
license and rewrites core's workspace range to the release version; README is an
ng-packagr asset. `pnpm pack` uses `publishConfig.directory: "dist"`.
Package checks target that directory and use an ESM-only ATTW profile.
Tests use the real core and Angular TestBed with JIT and zoneless change detection.

## Publishing

Consumers can install with pnpm, npm or another npm-compatible package manager. pnpm is only required to work on this monorepo.

1. Confirm ownership of the `@onboarding` npm scope or rename all `@onboarding/*` references, workspace dependencies, imports, Changesets configuration, and documentation together. The unscoped names `onboarding` and `onboarding-kit` already belong to other packages. This workspace has not reserved a scope; a 404 for a scoped package does not prove its scope is available.
2. Set your registry with `.npmrc` or package `publishConfig.registry`. Never commit tokens; use your package manager's credential configuration or trusted publishing.
3. Use `pnpm install --frozen-lockfile` and run `pnpm verify:release` after installing the three Playwright browsers.
4. Use `pnpm changeset` for changes, `pnpm version-packages` to apply versions, and inspect generated changelogs.
5. Inspect `pnpm pack` output before publishing. Core, React and Vue publish from their package roots; Angular publishes compiled APF output from `packages/angular/dist`.

`publishConfig.access` is public. Change it for a private registry if needed. The Angular package's publish directory is configured separately so decorators, declarations and metadata come from ng-packagr, never raw TypeScript.

`pnpm release` runs `verify:release` before Changesets publishing. It requires intentional registry authentication and will attempt to publish. CI only verifies; it has no publishing job, token, or write permission. No command makes a Git commit on your behalf.

## Documentation icons

The framework marks come from the pinned `simple-icons` package (CC0-1.0), bundled
locally as SVG paths, not fetched from an icon CDN. Brand names and marks belong to
their respective owners and do not imply endorsement. Keep visible framework
labels; the accompanying marks are decorative for assistive technology.

## CDN

After publishing, load a pinned core version's `dist/cdn.global.js` and `dist/styles.css` from your preferred npm CDN. The browser global is `Onboarding`:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@onboarding/core@0.1.0/dist/styles.css" />
<script src="https://cdn.jsdelivr.net/npm/@onboarding/core@0.1.0/dist/cdn.global.js"></script>
<script>
  const kit = Onboarding.createOnboarding({
    tours: [
      {
        id: 'hello',
        steps: [{ id: 'welcome', title: 'Welcome', content: 'Your tour starts here.' }],
      },
    ],
  });
  kit.mount();
  // Call kit.start('hello') from a user action.
</script>
```

These URLs are examples for after publication, not currently hosted assets. The CDN bundle includes Floating UI; ESM/CommonJS builds declare it as an npm dependency. Pin versions instead of using `latest` in production.
