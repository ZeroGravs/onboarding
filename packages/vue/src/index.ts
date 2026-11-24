import {
  computed,
  defineComponent,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  readonly,
  shallowRef,
  type AllowedComponentProps,
  type ComponentCustomProps,
  type ComponentPublicInstance,
  type ComputedRef,
  type DeepReadonly,
  type Directive,
  type InjectionKey,
  type Plugin,
  type PropType,
  type SlotsType,
  type VNode,
  type VNodeProps,
} from 'vue';
import {
  createOnboarding,
  type Labels,
  type RendererContext,
  type RouterAdapter,
  type Onboarding,
  type OnboardingOptions,
  type OnboardingState,
} from '@zero-lab/onboarding';

export interface OnboardingContextValue {
  kit: Onboarding;
  /** Read-only ref; the core owns its state snapshots. */
  state: ComputedRef<DeepReadonly<OnboardingState>>;
}

const onboardingKey: InjectionKey<OnboardingContextValue> = Symbol('onboarding');

function createBinding(kit: Onboarding) {
  const snapshot = shallowRef(kit.getState());
  const context: OnboardingContextValue = { kit, state: computed(() => readonly(snapshot.value)) };
  let release: (() => void) | undefined;
  return {
    context,
    snapshot,
    mount() {
      if (release) return;
      const unsubscribe = kit.subscribe((state) => {
        snapshot.value = state;
      });
      snapshot.value = kit.getState();
      const unmount = kit.mount();
      release = () => {
        unsubscribe();
        unmount();
        release = undefined;
      };
    },
    unmount() {
      release?.();
    },
  };
}

/** Can also be imported locally as vOnboardingStep in script setup. */
export const vOnboardingStep: Directive<HTMLElement, string> = {
  mounted: (element, binding) => element.setAttribute('data-onboarding', binding.value),
  updated: (element, binding) => element.setAttribute('data-onboarding', binding.value),
  unmounted: (element) => element.removeAttribute('data-onboarding'),
  getSSRProps: (binding) => ({ 'data-onboarding': binding.value }),
};

export function useOnboarding(): OnboardingContextValue {
  const context = inject(onboardingKey, null);
  if (!context)
    throw new Error(
      'useOnboarding must be used within a OnboardingProvider or createOnboardingPlugin.',
    );
  return context;
}

const defaultLabels: Labels = {
  next: 'Next',
  back: 'Back',
  skip: 'Skip',
  done: 'Done',
  stepOf: (current, total) => `Step ${current} of ${total}`,
};

export interface OnboardingProviderProps {
  options?: OnboardingOptions;
  kit?: Onboarding;
}

export interface OnboardingProviderSlots {
  default?: (context: RendererContext) => VNode[];
  step?: (context: RendererContext) => VNode[];
}

/**
 * Create a provider per SSR request. The explicit public type also supports Vue 3.3.
 */
export const OnboardingProvider: new () => ComponentPublicInstance<
  OnboardingProviderProps & AllowedComponentProps & VNodeProps & ComponentCustomProps
> & {
  $slots: OnboardingProviderSlots;
} = defineComponent({
  name: 'OnboardingProvider',
  props: {
    options: Object as PropType<OnboardingOptions>,
    kit: Object as PropType<Onboarding>,
  },
  slots: Object as SlotsType<OnboardingProviderSlots>,
  setup(props, { slots }) {
    if (!props.kit && !props.options)
      throw new Error('OnboardingProvider requires options or kit.');
    const kit =
      props.kit ??
      createOnboarding({
        ...props.options!,
        ...(slots.step ? { renderer: 'none' as const } : {}),
      });
    const binding = createBinding(kit);
    const labels = { ...defaultLabels, ...props.options?.labels };
    provide(onboardingKey, binding.context);
    onMounted(binding.mount);
    onBeforeUnmount(binding.unmount);
    return () => {
      const context: RendererContext = { kit, state: binding.snapshot.value, labels };
      return [
        slots.default?.(context),
        context.state.status === 'running' ? slots.step?.(context) : null,
      ];
    };
  },
});

/** Optional app-wide provider; instantiate once per app/request, not as an SSR singleton. */
export function createOnboardingPlugin(options: OnboardingOptions): Plugin {
  return {
    install(app) {
      const binding = createBinding(createOnboarding(options));
      app.provide(onboardingKey, binding.context);
      app.directive('onboarding-step', vOnboardingStep);
      // Vue 3.3-compatible root lifecycle: no browser work during SSR.
      app.mixin({
        mounted() {
          if (this === this.$root) binding.mount();
        },
        beforeUnmount() {
          if (this === this.$root) binding.unmount();
        },
      });
    },
  };
}

/** Structural interface: importing this adapter never imports vue-router. */
export interface VueRouterLike {
  currentRoute: { readonly value: { readonly path: string } };
  push(path: string): unknown;
  afterEach(listener: () => void): () => void;
}

export function createVueRouterAdapter(router: VueRouterLike): RouterAdapter {
  return {
    getPath: () => router.currentRoute.value.path,
    navigate: async (path) => {
      await router.push(path);
    },
    subscribe: (listener) => router.afterEach(listener),
  };
}
