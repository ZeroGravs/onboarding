import {
  createSSRApp,
  defineComponent,
  h,
  isReadonly,
  nextTick,
  ref,
  resolveDirective,
  withDirectives,
} from 'vue';
import { renderToString } from 'vue/server-renderer';
import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOnboarding, type Onboarding, type OnboardingOptions } from '@zero-lab/onboarding';
import {
  createOnboardingPlugin,
  createVueRouterAdapter,
  OnboardingProvider,
  useOnboarding,
  vOnboardingStep,
  type OnboardingContextValue,
} from './index';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

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

describe('Vue adapter', () => {
  it('exposes read-only reactive snapshots rather than writable core state', async () => {
    let onboarding!: OnboardingContextValue;
    const Consumer = defineComponent({
      setup() {
        onboarding = useOnboarding();
        return () => h('output', onboarding.state.value.status);
      },
    });
    const wrapper = mount(OnboardingProvider, {
      props: { options },
      slots: { default: () => h(Consumer) },
    });
    wrappers.push(wrapper);
    await onboarding.kit.start('onboarding');
    await nextTick();
    expect(isReadonly(onboarding.state)).toBe(true);
    expect(isReadonly(onboarding.state.value)).toBe(true);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    Reflect.set(onboarding.state.value, 'status', 'skipped');
    expect(onboarding.state.value.status).toBe('running');
    expect(onboarding.kit.getState().status).toBe('running');
  });

  it('provides reactive state and a rich step slot without default DOM', async () => {
    const kit = createOnboarding(options);
    const Consumer = defineComponent({
      setup() {
        const { state, kit: providedKit } = useOnboarding();
        expect(providedKit).toBe(kit);
        return () => h('output', state.value.status);
      },
    });
    const wrapper = mount(OnboardingProvider, {
      props: { kit },
      slots: {
        default: () => h(Consumer),
        step: ({ state, kit, labels }) =>
          h('aside', [
            h('h2', state.step?.title),
            h('button', { onClick: () => kit.next() }, labels.next),
          ]),
      },
    });
    wrappers.push(wrapper);
    expect(wrapper.find('aside').exists()).toBe(false);
    await kit.start('onboarding');
    await nextTick();
    expect(wrapper.find('output').text()).toBe('running');
    expect(wrapper.find('h2').text()).toBe('Welcome');
    await wrapper.find('button').trigger('click');
    await nextTick();
    expect(wrapper.find('h2').text()).toBe('Settings');
    kit.skip();
    await nextTick();
    expect(wrapper.find('aside').exists()).toBe(false);
    expect(wrapper.find('output').text()).toBe('skipped');
  });

  it('automatically disables the default renderer for an owned kit with a step slot', async () => {
    let kit!: Onboarding;
    const Consumer = defineComponent({
      setup() {
        kit = useOnboarding().kit;
        return () => h('span', 'Content');
      },
    });
    const wrapper = mount(OnboardingProvider, {
      attachTo: document.body,
      props: { options: { ...options, renderer: 'default' } },
      slots: { default: () => h(Consumer), step: ({ state }) => h('aside', state.step?.title) },
    });
    wrappers.push(wrapper);
    await kit.start('onboarding');
    await nextTick();
    expect(wrapper.find('aside').text()).toBe('Welcome');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('cleans up subscriptions and mount without destroying a reusable kit', async () => {
    const kit = createOnboarding(options);
    const release = vi.fn();
    const mountSpy = vi.spyOn(kit, 'mount').mockReturnValue(release);
    const unsubscribe = vi.fn();
    vi.spyOn(kit, 'subscribe').mockReturnValue(unsubscribe);
    const destroy = vi.spyOn(kit, 'destroy');
    const first = mount(OnboardingProvider, { props: { kit } });
    first.unmount();
    expect(release).toHaveBeenCalledOnce();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(destroy).not.toHaveBeenCalled();
    const second = mount(OnboardingProvider, { props: { kit } });
    wrappers.push(second);
    expect(mountSpy).toHaveBeenCalledTimes(2);
  });

  it('supports app-wide plugin lifecycle and directive registration', async () => {
    let kit!: Onboarding;
    const Consumer = defineComponent({
      setup() {
        const context = useOnboarding();
        kit = context.kit;
        const directive = resolveDirective('onboarding-step')!;
        return () =>
          withDirectives(h('output', context.state.value.status), [[directive, 'welcome']]);
      },
    });
    const wrapper = mount(Consumer, { global: { plugins: [createOnboardingPlugin(options)] } });
    wrappers.push(wrapper);
    expect(wrapper.attributes('data-onboarding')).toBe('welcome');
    await kit.start('onboarding');
    await nextTick();
    expect(wrapper.text()).toBe('running');
  });

  it('updates directive anchors without replacing children', async () => {
    const name = ref('welcome');
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          withDirectives(h('button', 'Preserved child'), [[vOnboardingStep, name.value]]),
      }),
    );
    wrappers.push(wrapper);
    const element = wrapper.element;
    expect(wrapper.attributes('data-onboarding')).toBe('welcome');
    name.value = 'settings';
    await nextTick();
    expect(wrapper.element).toBe(element);
    expect(wrapper.attributes('data-onboarding')).toBe('settings');
    expect(wrapper.text()).toBe('Preserved child');
  });

  it('explains a missing provider', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() =>
      mount(
        defineComponent({
          setup: () => {
            useOnboarding();
            return () => null;
          },
        }),
      ),
    ).toThrow('within a OnboardingProvider or createOnboardingPlugin');
  });

  it('does not mount or subscribe during SSR', async () => {
    const kit = createOnboarding(options);
    const mountSpy = vi.spyOn(kit, 'mount');
    const subscribe = vi.spyOn(kit, 'subscribe');
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(
            OnboardingProvider,
            { kit },
            { default: ({ state }: { state: { status: string } }) => h('p', state.status) },
          ),
      }),
    );
    expect(html).toContain('idle');
    expect(mountSpy).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('adapts real router notifications and removes listeners', async () => {
    const route = ref({ path: '/' });
    const listeners = new Set<() => void>();
    const adapter = createVueRouterAdapter({
      currentRoute: route,
      push: async (path) => {
        route.value = { path };
        listeners.forEach((listener) => listener());
      },
      afterEach: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    });
    const notify = vi.fn();
    const unsubscribe = adapter.subscribe(notify);
    expect(adapter.getPath()).toBe('/');
    await adapter.navigate('/settings');
    expect(adapter.getPath()).toBe('/settings');
    expect(notify).toHaveBeenCalledOnce();
    unsubscribe();
    await adapter.navigate('/');
    expect(notify).toHaveBeenCalledOnce();
  });
});
