import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOnboarding, type OnboardingOptions } from '@onboarding/core';
import { OnboardingProvider, OnboardingStep, useOnboarding } from './index';

afterEach(cleanup);

const options: OnboardingOptions = {
  renderer: 'none',
  tours: [
    {
      id: 'onboarding',
      steps: [
        { id: 'welcome', title: 'Welcome', content: 'First step' },
        { id: 'settings', title: 'Settings', content: 'Second step' },
      ],
    },
  ],
};

function Controls() {
  const { kit, state } = useOnboarding();
  return (
    <>
      <output>
        {state.status}:{state.step?.id}
      </output>
      <button onClick={() => void kit.start('onboarding')}>Start onboarding</button>
      <button onClick={() => void kit.next()}>Continue</button>
    </>
  );
}

describe('React adapter', () => {
  it('updates subscribers and renders rich steps without the default renderer', async () => {
    render(
      <OnboardingProvider
        options={{ ...options, renderer: 'default', labels: { next: 'Forward' } }}
        renderStep={({ state, kit, labels }) => (
          <aside aria-label="Custom onboarding">
            <h2>{state.step?.title}</h2>
            <button onClick={() => void kit.next()}>{labels.next}</button>
          </aside>
        )}
      >
        <Controls />
      </OnboardingProvider>,
    );
    expect(screen.queryByRole('complementary')).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByText('Start onboarding'));
    });
    expect(screen.getByRole('status').textContent).toBe('running:welcome');
    expect(screen.getByRole('heading').textContent).toBe('Welcome');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByText('Forward'));
    });
    expect(screen.getByRole('heading').textContent).toBe('Settings');
    await act(async () => {
      fireEvent.click(screen.getByText('Forward'));
    });
    expect(screen.getByRole('status').textContent).toBe('completed:settings');
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('uses reversible cleanup during StrictMode replay and supports remounting', async () => {
    const kit = createOnboarding(options);
    const originalMount = kit.mount;
    const releases: ReturnType<typeof vi.fn>[] = [];
    const mount = vi.spyOn(kit, 'mount').mockImplementation(() => {
      const release = vi.fn(originalMount());
      releases.push(release);
      return release;
    });
    const destroy = vi.spyOn(kit, 'destroy');
    const first = render(
      <StrictMode>
        <OnboardingProvider kit={kit}>
          <Controls />
        </OnboardingProvider>
      </StrictMode>,
    );
    expect(mount).toHaveBeenCalledTimes(2);
    expect(releases[0]).toHaveBeenCalledTimes(1);
    await act(async () => {
      await kit.start('onboarding');
    });
    expect(screen.getByRole('status').textContent).toContain('running');
    first.unmount();
    expect(releases[1]).toHaveBeenCalledTimes(1);
    expect(destroy).not.toHaveBeenCalled();

    render(
      <OnboardingProvider kit={kit}>
        <Controls />
      </OnboardingProvider>,
    );
    await act(async () => {
      await kit.start('onboarding');
    });
    expect(screen.getByRole('status').textContent).toBe('running:welcome');
  });

  it('keeps an owned kit stable across parent rerenders', () => {
    const seen = new Set();
    function Probe() {
      seen.add(useOnboarding().kit);
      return null;
    }
    const view = render(
      <OnboardingProvider options={options}>
        <Probe />
      </OnboardingProvider>,
    );
    view.rerender(
      <OnboardingProvider options={{ ...options }}>
        <Probe />
      </OnboardingProvider>,
    );
    expect(seen.size).toBe(1);
  });

  it('preserves anchor children, attributes and events', () => {
    const onClick = vi.fn();
    render(
      <OnboardingStep name="welcome" className="anchor">
        <button onClick={onClick}>Child</button>
      </OnboardingStep>,
    );
    const child = screen.getByText('Child');
    expect(child.parentElement?.dataset.onboarding).toBe('welcome');
    expect(child.parentElement?.className).toBe('anchor');
    fireEvent.click(child);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('explains a missing provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Controls />)).toThrow('within a OnboardingProvider');
  });

  it('renders a stable initial snapshot on the server without mounting', () => {
    const kit = createOnboarding(options);
    const mount = vi.spyOn(kit, 'mount');
    const subscribe = vi.spyOn(kit, 'subscribe');
    const html = renderToString(
      <OnboardingProvider kit={kit}>
        <Controls />
      </OnboardingProvider>,
    );
    expect(html).toContain('idle');
    expect(mount).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('hydrates with the idle snapshot before reading a changed external store', async () => {
    const kit = createOnboarding(options);
    const element = (
      <OnboardingProvider kit={kit}>
        <Controls />
      </OnboardingProvider>
    );
    const container = document.createElement('div');
    container.innerHTML = renderToString(element);
    document.body.append(container);
    const release = kit.mount();
    await kit.start('onboarding');
    const recover = vi.fn();
    let root!: ReturnType<typeof hydrateRoot>;
    try {
      await act(async () => {
        root = hydrateRoot(container, element, { onRecoverableError: recover });
      });
      expect(recover).not.toHaveBeenCalled();
      expect(container.querySelector('output')?.textContent).toBe('running:welcome');
    } finally {
      if (root)
        await act(async () => {
          root.unmount();
        });
      release();
    }
  });
});
