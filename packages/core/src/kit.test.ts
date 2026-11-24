import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOnboarding } from './kit';
import { createHistoryRouter } from './router';
import { localStorageAdapter, memoryStorage } from './storage';
import type { RouterAdapter, Tour, Onboarding } from './types';

const kits: Onboarding[] = [];
const tour: Tour = {
  id: 'welcome',
  steps: [
    { id: 'first', title: 'Welcome', content: 'Start here' },
    { id: 'second', title: 'Finish', content: 'All done' },
  ],
};
function create(options: Parameters<typeof createOnboarding>[0] = { tours: [tour] }) {
  const kit = createOnboarding({ storage: memoryStorage(), renderer: 'none', ...options });
  kits.push(kit);
  return kit;
}

afterEach(() => {
  for (const kit of kits) kit.destroy();
  kits.length = 0;
  vi.useRealTimers();
});

describe('tour lifecycle', () => {
  it('emits ordered analytics, completes, and does not advance twice', async () => {
    const events: string[] = [];
    const states: string[] = [];
    const kit = create({ tours: [tour], onEvent: (event) => events.push(event.type) });
    const unsubscribe = kit.subscribe((state) => states.push(state.status));
    await kit.start(tour.id);
    await kit.next();
    await kit.prev();
    await kit.next();
    await Promise.all([kit.next(), kit.next()]);
    expect(kit.getState().status).toBe('completed');
    expect(events[0]).toBe('tour:started');
    expect(events[1]).toBe('step:shown');
    expect(events.filter((event) => event === 'tour:completed')).toHaveLength(1);
    expect(states).toContain('waiting');
    unsubscribe();
  });

  it('persists progress across remounts, resets versions and remembers skipped tours', async () => {
    const storage = memoryStorage();
    const first = create({ tours: [tour], storage });
    await first.start(tour.id);
    await first.next();
    const unmount = first.mount();
    // mount is idempotent: a redundant mount must not own the original lifecycle.
    unmount();
    expect(first.getState().status).toBe('running');
    first.destroy();
    const second = create({ tours: [tour], storage });
    await second.start(tour.id);
    expect(second.getState().stepIndex).toBe(1);
    second.skip();
    const automatic = create({ tours: [{ ...tour, trigger: { type: 'firstVisit' } }], storage });
    automatic.mount();
    await Promise.resolve();
    expect(automatic.getState().status).toBe('idle');
    const updated = create({ tours: [{ ...tour, version: 2 }], storage });
    await updated.start(tour.id);
    expect(updated.getState().stepIndex).toBe(0);
    updated.reset();
    expect(storage.get(tour.id)).toBeNull();
    expect(updated.getState().status).toBe('idle');
  });

  it('restarts from the beginning with resume:false', async () => {
    const kit = create();
    await kit.start(tour.id);
    await kit.next();
    await kit.start(tour.id, { resume: false });
    expect(kit.getState().stepIndex).toBe(0);
  });

  it('cancels a pending beforeShow when skipped or superseded', async () => {
    let release!: () => void;
    let aborted = false;
    const delayed: Tour = {
      ...tour,
      id: 'delayed',
      steps: [
        {
          ...tour.steps[0],
          beforeShow: (signal) => {
            signal.addEventListener('abort', () => {
              aborted = true;
            });
            return new Promise<void>((resolve) => {
              release = resolve;
            });
          },
        },
      ],
    };
    const kit = create({ tours: [delayed, tour] });
    const pending = kit.start('delayed');
    await kit.start(tour.id);
    await pending;
    expect(aborted).toBe(true);
    release();
    await Promise.resolve();
    expect(kit.getState().tourId).toBe(tour.id);
    expect(kit.getState().status).toBe('running');
  });

  it('unmounts waiting observers and can remount with persisted progress', async () => {
    const delayed = { ...tour, steps: [{ ...tour.steps[0], target: '#later' }] };
    const kit = create({ tours: [delayed] });
    const unmount = kit.mount();
    const start = kit.start(tour.id);
    unmount();
    await start;
    document.body.innerHTML = '<div id="later"></div>';
    kit.mount();
    await kit.start(tour.id);
    expect(kit.getState().target?.id).toBe('later');
  });

  it('rejects invalid IDs and malformed definitions', async () => {
    expect(() => create({ tours: [tour, tour] })).toThrow(/Duplicate/);
    expect(() => create({ tours: [{ ...tour, steps: [] }] })).toThrow(/at least one/);
    const kit = create();
    await expect(kit.start('missing')).rejects.toThrow(/Unknown tour/);
  });
});

describe('async targets and routing', () => {
  it('waits for lazy content and delegates advanceOn events', async () => {
    const kit = create({
      tours: [
        {
          ...tour,
          steps: [
            { ...tour.steps[0], target: '#lazy', advanceOn: { selector: '#go', event: 'click' } },
            tour.steps[1],
          ],
        },
      ],
    });
    const pending = kit.start(tour.id);
    expect(kit.getState().status).toBe('waiting');
    document.body.innerHTML =
      '<section id="lazy"><button id="go"><span>Continue</span></button></section>';
    await pending;
    expect(kit.getState().target?.id).toBe('lazy');
    document.querySelector<HTMLElement>('span')!.click();
    await vi.waitFor(() => expect(kit.getState().stepIndex).toBe(1));
  });

  it('shows a centered fallback and error event when the target never arrives', async () => {
    vi.useFakeTimers();
    const onEvent = vi.fn();
    const kit = create({
      tours: [{ ...tour, steps: [{ ...tour.steps[0], target: '#missing' }] }],
      targetTimeout: 20,
      onEvent,
    });
    const pending = kit.start(tour.id);
    await vi.advanceTimersByTimeAsync(21);
    await pending;
    expect(kit.getState()).toMatchObject({ status: 'running', target: null });
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'step:error' }));
  });

  it('does not show an old target after a newer tour has started', async () => {
    const kit = create({
      tours: [tour, { ...tour, id: 'slow', steps: [{ ...tour.steps[0], target: '#late' }] }],
    });
    const pending = kit.start('slow');
    await kit.start(tour.id);
    document.body.innerHTML = '<div id="late"></div>';
    await pending;
    expect(kit.getState().tourId).toBe(tour.id);
  });

  it('waits for a router subscription before resolving the next target', async () => {
    let path = '/';
    const subscriptions = new Set<() => void>();
    const router: RouterAdapter = {
      getPath: () => path,
      navigate: vi.fn(),
      subscribe: (listener) => {
        subscriptions.add(listener);
        return () => {
          subscriptions.delete(listener);
        };
      },
    };
    const kit = create({
      tours: [
        {
          ...tour,
          steps: [tour.steps[0], { ...tour.steps[1], route: '/settings', target: '#settings' }],
        },
      ],
      router,
    });
    await kit.start(tour.id);
    const next = kit.next();
    await Promise.resolve();
    expect(kit.getState().status).toBe('navigating');
    path = '/settings';
    for (const listener of subscriptions) listener();
    document.body.innerHTML = '<h1 id="settings">Settings</h1>';
    await next;
    expect(kit.getState()).toMatchObject({ status: 'running', stepIndex: 1 });
    expect(kit.getState().target?.id).toBe('settings');
  });
});

describe('triggers and keyboard', () => {
  it('honors first-visit storage, named events, and conditional triggers', async () => {
    let eligible = false;
    const kit = create({
      tours: [{ ...tour, trigger: { type: 'event', name: 'ready', when: () => eligible } }],
    });
    kit.mount();
    kit.trigger('ready');
    expect(kit.getState().status).toBe('idle');
    eligible = true;
    kit.trigger('other');
    expect(kit.getState().status).toBe('idle');
    kit.trigger('ready');
    expect(kit.getState().status).toBe('running');
    kit.skip();
    kit.trigger('ready');
    expect(kit.getState().status).toBe('skipped');
  });

  it('starts on the configured route and unsubscribes on unmount', async () => {
    const router = createHistoryRouter();
    router.navigate('/');
    const kit = create({
      tours: [{ ...tour, trigger: { type: 'route', path: '/settings' } }],
      router,
    });
    const unmount = kit.mount();
    router.navigate('/settings');
    expect(kit.getState().status).toBe('running');
    unmount();
    router.navigate('/');
    router.navigate('/settings');
    expect(kit.getState().status).toBe('idle');
    router.navigate('/');
  });

  it('starts when a visible target enters the viewport', async () => {
    const target = document.createElement('button');
    target.id = 'visible';
    document.body.append(target);
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      x: 10,
      y: 10,
      width: 30,
      height: 30,
      top: 10,
      left: 10,
      right: 40,
      bottom: 40,
      toJSON: () => ({}),
    });
    const kit = create({
      tours: [{ ...tour, trigger: { type: 'elementVisible', selector: '#visible' } }],
    });
    kit.mount();
    await Promise.resolve();
    expect(kit.getState().status).toBe('running');
  });

  it('supports arrow navigation and Escape without hijacking editable controls', async () => {
    const kit = create();
    await kit.start(tour.id);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(kit.getState().stepIndex).toBe(1);
    const input = document.createElement('input');
    document.body.append(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(kit.getState().stepIndex).toBe(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(kit.getState().status).toBe('skipped');
  });
});

describe('default renderer', () => {
  it('renders safe text, traps focus, cleans up and restores the launcher', async () => {
    const launcher = document.createElement('button');
    document.body.append(launcher);
    launcher.focus();
    const kit = create({
      tours: [{ ...tour, steps: [{ ...tour.steps[0], content: '<img src=x onerror=alert(1)>' }] }],
      renderer: 'default',
    });
    await kit.start(tour.id);
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(dialog.querySelector('img')).toBeNull();
    expect(document.activeElement).toBe(dialog);
    const buttons = dialog.querySelectorAll('button');
    buttons[buttons.length - 1].focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(buttons[0]);
    kit.skip();
    expect(document.querySelector('[data-onboarding-kit]')).toBeNull();
    expect(document.activeElement).toBe(launcher);
  });

  it('cleans up custom renderer resources on every transition and unmount', async () => {
    const cleanup = vi.fn();
    const renderer = vi.fn(() => cleanup);
    const kit = create({ tours: [tour], renderer });
    const unmount = kit.mount();
    await kit.start(tour.id);
    await kit.next();
    expect(cleanup).toHaveBeenCalledTimes(1);
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(2);
  });
});

describe('storage resilience', () => {
  it('ignores malformed browser records and still works when storage is blocked', () => {
    localStorage.setItem('test:welcome', '{"status":"running","stepIndex":-1}');
    const storage = localStorageAdapter('test');
    expect(storage.get('welcome')).toBeNull();
    vi.spyOn(Object.getPrototypeOf(localStorage), 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const value = { status: 'running' as const, stepIndex: 1, version: 1, updatedAt: 12 };
    storage.set('welcome', value);
    expect(storage.get('welcome')).toEqual(value);
    storage.remove('welcome');
    expect(storage.get('welcome')).toBeNull();
  });

  it('does not resume stale browser data after a failed write or reset', () => {
    const storage = localStorageAdapter('quota');
    const initial = { status: 'running' as const, stepIndex: 0, version: 1, updatedAt: 1 };
    storage.set('welcome', initial);
    vi.spyOn(Object.getPrototypeOf(localStorage), 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    storage.set('welcome', { ...initial, stepIndex: 1 });
    expect(storage.get('welcome')?.stepIndex).toBe(1);
    storage.remove('welcome');
    expect(storage.get('welcome')).toBeNull();
  });
});
