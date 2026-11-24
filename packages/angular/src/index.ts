import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  DestroyRef,
  Directive,
  ENVIRONMENT_INITIALIZER,
  Injectable,
  InjectionToken,
  Input,
  NgZone,
  PLATFORM_ID,
  TemplateRef,
  inject,
  makeEnvironmentProviders,
  signal,
  type EnvironmentProviders,
} from '@angular/core';
import { NavigationEnd, type Router } from '@angular/router';
import {
  createOnboarding,
  type RouterAdapter,
  type OnboardingEvent,
  type OnboardingEventType,
  type Onboarding,
  type OnboardingOptions,
  type OnboardingState,
} from '@zero-lab/onboarding';

// Keep the small public surface in one entry file: ng-packagr 18 emits .mjs
// runtime files, while extensionless declaration re-exports fail Node ESM checks.
const ONBOARDING_OPTIONS = new InjectionToken<OnboardingOptions>('Onboarding Kit options');

/** One kit per environment injector. Provide it once in the application configuration. */
@Injectable()
export class OnboardingService {
  private readonly zone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  readonly kit = createOnboarding(inject(ONBOARDING_OPTIONS));
  private readonly currentState = signal(this.kit.getState());
  readonly state = this.currentState.asReadonly();
  private unmount?: () => void;

  constructor() {
    const unsubscribe = this.kit.subscribe((state) => {
      this.zone.run(() => this.currentState.set(state));
    });

    inject(DestroyRef).onDestroy(() => {
      unsubscribe();
      this.unmount?.();
      this.unmount = undefined;
      this.kit.destroy();
    });
  }

  /** Called automatically by provideOnboarding. No DOM work is done on the server. */
  mount(): void {
    if (isPlatformBrowser(this.platformId) && !this.unmount) {
      this.unmount = this.kit.mount();
    }
  }

  readonly start = (tourId: string, options?: { resume?: boolean }) =>
    isPlatformBrowser(this.platformId) ? this.kit.start(tourId, options) : Promise.resolve();
  readonly next = () => this.kit.next();
  readonly prev = () => this.kit.prev();
  readonly skip = () => this.kit.skip();
  readonly reset = (tourId?: string) => this.kit.reset(tourId);
  readonly trigger = (name: string) => this.kit.trigger(name);
  readonly on = (type: OnboardingEventType, listener: (event: OnboardingEvent) => void) =>
    this.kit.on(type, listener);
}

/** A factory may use inject(), for example to obtain Angular's Router. */
export function provideOnboarding(
  options: OnboardingOptions | (() => OnboardingOptions),
): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: ONBOARDING_OPTIONS,
      useFactory: typeof options === 'function' ? options : () => options,
    },
    OnboardingService,
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => inject(OnboardingService).mount(),
    },
  ]);
}

/** Exposes a stable data-onboarding target without registering or mutating a tour. */
@Directive({
  selector: '[onboardingStep]',
  standalone: true,
  host: { '[attr.data-onboarding]': 'onboardingStep || null' },
})
export class OnboardingStepDirective {
  @Input() onboardingStep = '';
}

export interface OnboardingTemplateContext {
  $implicit: OnboardingState;
  state: OnboardingState;
  kit: Onboarding;
}

/**
 * Reactive template rendering for renderer: 'none'. Positioning, focus management,
 * accessible markup, and styles are intentionally owned by the supplied template.
 */
@Component({
  selector: 'onboarding-outlet',
  standalone: true,
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (onboarding.state().status === 'running' && onboarding.state().step && template) {
      <ng-container
        [ngTemplateOutlet]="template"
        [ngTemplateOutletContext]="{
          $implicit: onboarding.state(),
          state: onboarding.state(),
          kit: onboarding.kit,
        }"
      />
    }
  `,
})
export class OnboardingOutletComponent {
  readonly onboarding = inject(OnboardingService);
  @ContentChild(TemplateRef) template?: TemplateRef<OnboardingTemplateContext>;
}

/** Adapts successful Angular navigations; query strings/fragments are not route paths. */
export function createAngularRouter(router: Router): RouterAdapter {
  return {
    getPath: () => router.url.split(/[?#]/, 1)[0] || '/',
    async navigate(path) {
      if (!(await router.navigateByUrl(path))) {
        throw new Error(`Onboarding navigation to "${path}" was cancelled.`);
      }
    },
    subscribe(listener) {
      const subscription = router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) listener();
      });
      return () => subscription.unsubscribe();
    },
  };
}
