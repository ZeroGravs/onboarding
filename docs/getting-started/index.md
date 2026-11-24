# A working tour in five minutes

Start with your existing application. Add a provider, mark two elements, and start a tour. You do not need a dashboard, an account, or a new design system.

<FrameworkLinks />

::: info Preview documentation
Choose your framework below for installation instructions, or try the [live example](/playground) without installing anything.
:::

## Integrate into your application

Choose your framework above, install its adapter and core with npm or pnpm, and copy the explained example into your app. Each follows the same three ideas:

| Idea             | What you do                                                                  |
| ---------------- | ---------------------------------------------------------------------------- |
| Define a tour    | Give it an ID and a few steps with titles and plain-text content.            |
| Point at your UI | Add stable `data-onboarding` attributes to the elements you want to explain. |
| Start it         | Call `kit.start('welcome')` from a button or another user action.            |

The default UI handles positioning, a spotlight, next/back controls, keyboard navigation, and saved progress. Framework adapters manage the mount lifecycle.

## What should I learn next?

Get the first tour working before adding more configuration:

- [Change the colors and shape](/theming).
- [Continue across routes](/routing).
- [Resume, replay, and trigger tours](/recipes).
- [Use your own components](/theming#headless).
- [Check framework compatibility](/compatibility) and [security boundaries](/security).

Try the [interactive example](/playground) to see the engine in action.
