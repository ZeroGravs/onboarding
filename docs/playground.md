---
aside: false
---

# Try a real tour

This is the actual core engine, not a recording. Choose a theme, start the demo, then interact with the highlighted UI.

<LiveTour />

The example uses memory storage, so it does not save demo progress in your browser. **Reset demo** clears it. Leaving the page removes the tour and its listeners.

## Three CSS variables, three different moods

::: code-group

```css [Violet]
:root {
  --onboarding-primary: #6554d9;
  --onboarding-background: #fff;
  --onboarding-radius: 14px;
}
```

```css [Ocean]
:root {
  --onboarding-primary: #087f8c;
  --onboarding-background: #f5ffff;
  --onboarding-radius: 6px;
}
```

```css [Midnight]
:root {
  --onboarding-primary: #a99bff;
  --onboarding-primary-text: #171526;
  --onboarding-background: #202235;
  --onboarding-text: #f4f2ff;
  --onboarding-muted: #b7b7cd;
  --onboarding-radius: 20px;
}
```

:::

The demo applies these values only to its own popover. In your application, set the variables at the root or use the [theming guide](/theming) for more control.

## How the interaction works

The second step can advance when someone clicks the actual application button:

```ts
{
  id: 'create',
  target: '[data-onboarding="create"]',
  title: 'Turn guidance into action',
  content: 'Click Create project to continue.',
  advanceOn: { selector: '[data-onboarding="create"]', event: 'click' },
}
```

The demo sets `trapFocus: false` so keyboard users can leave the popover and reach that button. Choose the focus behavior that matches your own interaction; the default UI otherwise traps focus within its controls.

## Copy the first working version

<FrameworkLinks />
