# Theming and rendering

Import `@zero-lab/onboarding/styles.css` once at the application entry point. Framework packages do not silently inject CSS.

```css
:root {
  --onboarding-primary: #006f72;
  --onboarding-primary-text: white;
  --onboarding-background: white;
  --onboarding-text: #17252a;
  --onboarding-muted: #52686d;
  --onboarding-overlay: rgb(0 20 24 / 65%);
  --onboarding-radius: 12px;
  --onboarding-font: 'Your app font', system-ui, sans-serif;
  --onboarding-z-index: 2147483000;
}
```

Default CSS lives in `@layer onboarding`; your unlayered CSS overrides it. The root element's `data-onboarding-theme="light"` or `"dark"` overrides system preference. Custom colors should meet contrast requirements.

## Headless

`renderer: 'none'` disables the spotlight and popover. Read `kit.subscribe` or the framework adapter's reactive state and render your own UI for `state.status === 'running'`. Lifecycle, targets, routing, progress, keyboard navigation, and analytics still work.

## Custom renderer

```ts
const kit = createOnboarding({
  tours,
  renderer({ state, kit, labels }) {
    const panel = document.createElement('section');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', state.step!.title);
    panel.tabIndex = -1;
    const next = document.createElement('button');
    next.textContent = labels.next;
    next.onclick = () => {
      void kit.next();
    };
    panel.append(next);
    document.body.append(panel);
    panel.focus();
    return () => panel.remove();
  },
});
```

The engine invokes the renderer only for prepared/running steps and runs returned cleanup before every transition or unmount. React's `renderStep` and Vue/Angular templates provide framework-native rendering instead. Your renderer is responsible for rich content sanitization, positioning, semantics, focus management and any custom focus trap.

## Accessibility

The default renderer provides labeled/described `role="dialog"`, initial focus, focus restoration to the tour launcher, a polite progress announcement, Escape to skip, Left/Right to navigate, and a Tab focus trap. Editable controls retain their arrow keys. Escape remains available in editable controls. UI animations respect `prefers-reduced-motion`; scrolling is immediate.

The spotlight is visual, not an interaction blocker. The default dialog is not marked `aria-modal`, since surrounding content remains interactable. When a step requires typing in the application, use `trapFocus: false` so keyboard users can reach the target. Avoid launching a onboarding over another focus-trapping modal. Test your complete flows with keyboard and assistive technology; the library cannot infer semantics for arbitrary application content.
