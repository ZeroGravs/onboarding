import '@angular/compiler';
import {
  Component,
  EnvironmentInjector,
  PLATFORM_ID,
  createEnvironmentInjector,
  inject,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed, getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { memoryStorage, type OnboardingOptions } from '@onboarding/core';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAngularRouter,
  OnboardingOutletComponent,
  OnboardingStepDirective,
  provideOnboarding,
  OnboardingService,
} from './index';

@Component({
  standalone: true,
  imports: [OnboardingStepDirective, OnboardingOutletComponent],
  template: `
    <div [onboardingStep]="target()">Welcome target</div>
    <button onboardingStep="settings">Settings target</button>
    <onboarding-outlet>
      <ng-template let-state let-kit="kit">
        <section role="dialog" aria-labelledby="test-title">
          <h2 id="test-title">{{ state.step?.title }}</h2>
          <button type="button" class="continue" (click)="kit.next()">Continue</button>
          <button type="button" class="skip" (click)="kit.skip()">Skip</button>
        </section>
      </ng-template>
    </onboarding-outlet>
  `,
})
class TestHost {
  readonly target = signal('welcome');
}

@Component({
  standalone: true,
  imports: [OnboardingStepDirective],
  template: '<h1 onboardingStep="route-home">Home</h1>',
})
class HomePage {}

@Component({
  standalone: true,
  imports: [OnboardingStepDirective],
  template: '<h1 onboardingStep="route-settings">Settings</h1>',
})
class SettingsPage {}

const tours: OnboardingOptions['tours'] = [
  {
    id: 'test',
    steps: [
      { id: 'one', title: 'Welcome', content: 'First step', target: '[data-onboarding="welcome"]' },
      {
        id: 'two',
        title: 'Settings',
        content: 'Second step',
        target: '[data-onboarding="settings"]',
      },
    ],
  },
];

beforeAll(() => {
  if (!getTestBed().platform) {
    TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
  }
});

beforeEach(() => {
  // Keep Happy DOM's MutationObserver unpatched by Zone.js.
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
});

afterEach(() => {
  TestBed.resetTestingModule();
});

describe('provideOnboarding / OnboardingService', () => {
  it('auto-mounts once, updates signals, and releases renderer/router resources on injector destruction', async () => {
    const cleanup = vi.fn();
    const renderer = vi.fn(() => cleanup);
    const unsubscribeRouter = vi.fn();
    const subscribeRouter = vi.fn(() => unsubscribeRouter);
    const mount = vi.spyOn(OnboardingService.prototype, 'mount');
    TestBed.configureTestingModule({
      imports: [TestHost],
      providers: [
        provideOnboarding({
          tours,
          storage: memoryStorage(),
          renderer,
          router: { getPath: () => '/', navigate: () => {}, subscribe: subscribeRouter },
        }),
      ],
    });
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const onboarding = TestBed.inject(OnboardingService);
    const destroy = vi.spyOn(onboarding.kit, 'destroy');
    const redundantMount = vi.spyOn(onboarding.kit, 'mount');

    expect(mount).toHaveBeenCalledOnce();
    expect(subscribeRouter).toHaveBeenCalledOnce();
    onboarding.mount();
    onboarding.mount();
    expect(redundantMount).not.toHaveBeenCalled();

    await onboarding.start('test');
    expect(onboarding.state().status).toBe('running');
    expect(onboarding.state().target).toBe(
      fixture.nativeElement.querySelector('[data-onboarding="welcome"]'),
    );
    expect(renderer).toHaveBeenCalledOnce();
    await onboarding.next();
    expect(onboarding.state().step?.id).toBe('two');
    expect(cleanup).toHaveBeenCalledOnce();

    TestBed.resetTestingModule();
    expect(destroy).toHaveBeenCalledOnce();
    expect(cleanup).toHaveBeenCalledTimes(2);
    expect(unsubscribeRouter).toHaveBeenCalledOnce();
  });

  it('does not mount or start on the server and still destroys the SSR-safe kit', async () => {
    const subscribeRouter = vi.fn(() => vi.fn());
    const injector = createEnvironmentInjector(
      [
        { provide: PLATFORM_ID, useValue: 'server' },
        provideOnboarding({
          tours,
          renderer: 'none',
          storage: memoryStorage(),
          router: { getPath: () => '/', navigate: () => {}, subscribe: subscribeRouter },
        }),
      ],
      TestBed.inject(EnvironmentInjector),
    );
    const onboarding = injector.get(OnboardingService);
    const mount = vi.spyOn(onboarding.kit, 'mount');
    const start = vi.spyOn(onboarding.kit, 'start');
    const destroy = vi.spyOn(onboarding.kit, 'destroy');
    onboarding.mount();
    await onboarding.start('test');
    expect(mount).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
    expect(subscribeRouter).not.toHaveBeenCalled();
    expect(onboarding.state().status).toBe('idle');
    injector.destroy();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it('forwards events/actions and unsubscribes event handlers', async () => {
    TestBed.configureTestingModule({
      imports: [TestHost],
      providers: [provideOnboarding({ tours, renderer: 'none', storage: memoryStorage() })],
    });
    TestBed.createComponent(TestHost).detectChanges();
    const onboarding = TestBed.inject(OnboardingService);
    const shown = vi.fn();
    const off = onboarding.on('step:shown', shown);
    await onboarding.start('test', { resume: false });
    await onboarding.next();
    await onboarding.prev();
    expect(onboarding.state().stepIndex).toBe(0);
    expect(shown).toHaveBeenCalledTimes(3);
    off();
    await onboarding.next();
    expect(shown).toHaveBeenCalledTimes(3);
    onboarding.skip();
    expect(onboarding.state().status).toBe('skipped');
    onboarding.reset('test');
    expect(onboarding.state().status).toBe('idle');
  });
});

describe('standalone templates', () => {
  it('sets, updates, and removes the target attribute without registering a tour', () => {
    TestBed.configureTestingModule({
      imports: [HomePage],
    });
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').getAttribute('data-onboarding')).toBe(
      'route-home',
    );
    // A directive-only application needs no OnboardingService provider.
    expect(TestBed.inject(OnboardingService, null)).toBeNull();
  });

  it('reacts to input changes and only renders the template while a step is running', async () => {
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    TestBed.configureTestingModule({
      imports: [TestHost],
      providers: [
        provideOnboarding({
          renderer: 'none',
          storage: memoryStorage(),
          tours: [
            {
              ...tours[0],
              steps: [tours[0].steps[0], { ...tours[0].steps[1], beforeShow: () => waiting }],
            },
          ],
        }),
      ],
    });
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const target = element.querySelector('div')!;
    expect(target.getAttribute('data-onboarding')).toBe('welcome');
    fixture.componentInstance.target.set('renamed');
    fixture.detectChanges();
    expect(target.getAttribute('data-onboarding')).toBe('renamed');
    fixture.componentInstance.target.set('');
    fixture.detectChanges();
    expect(target.hasAttribute('data-onboarding')).toBe(false);
    fixture.componentInstance.target.set('welcome');
    fixture.detectChanges();

    const onboarding = TestBed.inject(OnboardingService);
    expect(element.querySelector('[role="dialog"]')).toBeNull();
    await onboarding.start('test');
    fixture.detectChanges();
    expect(element.querySelector('h2')?.textContent).toBe('Welcome');
    // The outlet supplies the real kit, so template actions run the state machine.
    element.querySelector<HTMLButtonElement>('.continue')!.click();
    fixture.detectChanges();
    expect(onboarding.state().status).toBe('waiting');
    expect(element.querySelector('[role="dialog"]')).toBeNull();
    release();
    await vi.waitFor(() => expect(onboarding.state().status).toBe('running'));
    fixture.detectChanges();
    expect(element.querySelector('h2')?.textContent).toBe('Settings');
    element.querySelector<HTMLButtonElement>('.skip')!.click();
    fixture.detectChanges();
    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });
});

describe('createAngularRouter', () => {
  function configureRouter(withOnboarding = false) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: HomePage },
          { path: 'settings', component: SettingsPage },
          { path: 'blocked', component: SettingsPage, canActivate: [() => false] },
        ]),
        ...(withOnboarding
          ? [
              provideOnboarding(() => ({
                router: createAngularRouter(inject(Router)),
                renderer: 'none',
                storage: memoryStorage(),
                tours: [
                  {
                    id: 'routes',
                    steps: [
                      {
                        id: 'home',
                        title: 'Home',
                        content: '',
                        route: '/',
                        target: '[data-onboarding="route-home"]',
                      },
                      {
                        id: 'settings',
                        title: 'Settings',
                        content: '',
                        route: '/settings',
                        target: '[data-onboarding="route-settings"]',
                      },
                    ],
                  },
                ],
              })),
            ]
          : []),
      ],
    });
  }

  it('notifies only on completed navigation and tears down subscriptions', async () => {
    configureRouter();
    const harness = await RouterTestingHarness.create('/');
    const adapter = createAngularRouter(TestBed.inject(Router));
    const listener = vi.fn();
    const unsubscribe = adapter.subscribe(listener);
    await adapter.navigate('/settings?tab=profile#heading');
    harness.detectChanges();
    expect(adapter.getPath()).toBe('/settings');
    expect(harness.routeNativeElement?.textContent).toBe('Settings');
    expect(listener).toHaveBeenCalledOnce();
    await expect(adapter.navigate('/blocked')).rejects.toThrow('cancelled');
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    await adapter.navigate('/');
    expect(listener).toHaveBeenCalledOnce();
  });

  it('supports real cross-route steps and stops listening when the provider is destroyed', async () => {
    configureRouter(true);
    const harness = await RouterTestingHarness.create('/');
    const router = TestBed.inject(Router);
    const onboarding = TestBed.inject(OnboardingService);
    await onboarding.start('routes');
    expect(onboarding.state().target?.textContent).toBe('Home');
    const next = onboarding.next();
    await vi.waitFor(() => {
      // Unlike a bootstrapped application, the harness needs explicit detection
      // when navigation is initiated by the adapter instead of the harness.
      harness.detectChanges();
      expect(onboarding.state().target?.textContent).toBe('Settings');
    });
    await next;
    expect(router.url).toBe('/settings');
    expect(onboarding.state().target?.textContent).toBe('Settings');
    const prev = onboarding.prev();
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(onboarding.state().target?.textContent).toBe('Home');
    });
    await prev;
    expect(router.url).toBe('/');
    expect(onboarding.state().target?.textContent).toBe('Home');
    const destroy = vi.spyOn(onboarding.kit, 'destroy');
    TestBed.resetTestingModule();
    expect(destroy).toHaveBeenCalledOnce();
  });
});
