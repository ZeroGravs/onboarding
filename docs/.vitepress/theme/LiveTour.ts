import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { createOnboarding, defaultRenderer, memoryStorage } from '@onboarding/core';
import type { Onboarding, OnboardingState } from '@onboarding/core';

const themes = {
  violet: {
    label: 'Violet',
    primary: '#6554d9',
    background: '#ffffff',
    text: '#202138',
    muted: '#62677c',
    radius: '14px',
  },
  ocean: {
    label: 'Ocean',
    primary: '#087f8c',
    background: '#f5ffff',
    text: '#15393d',
    muted: '#496c70',
    radius: '6px',
  },
  midnight: {
    label: 'Midnight',
    primary: '#a99bff',
    background: '#202235',
    text: '#f4f2ff',
    muted: '#b7b7cd',
    radius: '20px',
  },
};

export default defineComponent({
  name: 'LiveTour',
  setup() {
    const welcome = ref<HTMLElement | null>(null);
    const create = ref<HTMLElement | null>(null);
    const progress = ref<HTMLElement | null>(null);
    const selected = ref<keyof typeof themes>('violet');
    const ready = ref(false);
    const projectCreated = ref(false);
    const state = shallowRef<OnboardingState | null>(null);
    const active = computed(() =>
      ['waiting', 'navigating', 'running'].includes(state.value?.status ?? ''),
    );
    let kit: Onboarding | undefined;
    let unsubscribe: (() => void) | undefined;

    onMounted(() => {
      kit = createOnboarding({
        storage: memoryStorage(),
        trapFocus: false,
        tours: [
          {
            id: 'docs-demo',
            steps: [
              {
                id: 'welcome',
                target: () => welcome.value,
                title: 'Meet people inside your product',
                content:
                  'Point to real elements with a spotlight and a short explanation. No separate onboarding screen.',
              },
              {
                id: 'create',
                target: () => create.value,
                title: 'Turn guidance into action',
                content:
                  'Click Create project to continue, or choose Next. Steps can advance on real application events.',
                advanceOn: { selector: '[data-demo-create]', event: 'click' },
              },
              {
                id: 'progress',
                target: () => progress.value,
                title: 'Small steps. A better first visit.',
                content:
                  'That is a real Onboarding Kit tour. Choose your framework and add one to your application.',
              },
            ],
          },
        ],
        renderer(context) {
          const cleanup = defaultRenderer(context);
          const root = Array.from(
            document.querySelectorAll<HTMLElement>('[data-onboarding-kit]'),
          ).at(-1);
          if (root) {
            const theme = themes[selected.value];
            root.dataset.docsDemo = '';
            for (const [name, value] of Object.entries({
              primary: theme.primary,
              'primary-text': selected.value === 'midnight' ? '#171526' : '#ffffff',
              background: theme.background,
              text: theme.text,
              muted: theme.muted,
              radius: theme.radius,
            }))
              root.style.setProperty(`--onboarding-${name}`, value);
          }
          return cleanup;
        },
      });
      unsubscribe = kit.subscribe((value) => {
        state.value = value;
      });
      kit.mount();
      ready.value = true;
    });

    onBeforeUnmount(() => {
      unsubscribe?.();
      kit?.destroy();
    });

    function reset() {
      kit?.reset('docs-demo');
      projectCreated.value = false;
    }

    const status = computed(() => {
      if (state.value?.status === 'completed') return 'Tour completed. Ready to make it yours?';
      if (state.value?.status === 'skipped') return 'Skipped. You can replay whenever you like.';
      if (active.value)
        return `Step ${(state.value?.stepIndex ?? 0) + 1} of 3. Escape skips the tour.`;
      return 'Three steps. Your real UI. No account needed.';
    });

    return () =>
      h('section', { class: 'live-tour', 'aria-label': 'Interactive onboarding example' }, [
        h('div', { class: 'demo-toolbar' }, [
          h('div', [
            h('span', { class: 'demo-label' }, 'LIVE EXAMPLE'),
            h('p', 'Not a video. Try the actual thing.'),
          ]),
          h(
            'div',
            { class: 'demo-themes', role: 'group', 'aria-label': 'Tour theme' },
            (
              Object.entries(themes) as [
                keyof typeof themes,
                (typeof themes)[keyof typeof themes],
              ][]
            ).map(([id, theme]) =>
              h(
                'button',
                {
                  type: 'button',
                  'aria-pressed': selected.value === id,
                  disabled: active.value,
                  onClick: () => {
                    selected.value = id;
                  },
                },
                [
                  h('span', {
                    class: 'theme-dot',
                    style: { backgroundColor: theme.primary },
                    'aria-hidden': 'true',
                  }),
                  theme.label,
                ],
              ),
            ),
          ),
        ]),
        h('div', { class: 'demo-board' }, [
          h('div', { class: 'demo-appbar' }, [
            h('span', { class: 'demo-app-name' }, [
              h('span', { class: 'demo-app-mark', 'aria-hidden': 'true' }, 'W'),
              'Workspace',
            ]),
            h('span', { class: 'demo-plan' }, 'Your application'),
          ]),
          h('div', { class: 'demo-canvas' }, [
            h('div', { class: 'demo-welcome', ref: welcome }, [
              h('p', { class: 'demo-eyebrow' }, 'A FRESH START'),
              h('h3', 'Your next big idea starts here.'),
              h('p', 'Help people discover what they can do, one useful step at a time.'),
            ]),
            h('div', { class: 'demo-bottom' }, [
              h(
                'button',
                {
                  type: 'button',
                  class: 'demo-create',
                  ref: create,
                  'data-demo-create': '',
                  onClick: () => {
                    projectCreated.value = true;
                  },
                },
                projectCreated.value ? 'Project created' : 'Create project',
              ),
              h('div', { class: 'demo-stat', ref: progress }, [
                h('strong', projectCreated.value ? '1' : '0'),
                h('span', 'ideas brought to life'),
              ]),
            ]),
          ]),
        ]),
        h('div', { class: 'demo-controls' }, [
          h(
            'button',
            {
              type: 'button',
              class: 'demo-start',
              disabled: !ready.value,
              onClick: () => {
                projectCreated.value = false;
                void kit?.start('docs-demo', { resume: false });
              },
            },
            active.value
              ? 'Restart demo'
              : state.value?.status === 'completed' || state.value?.status === 'skipped'
                ? 'Replay demo'
                : 'Start the demo',
          ),
          h(
            'button',
            { type: 'button', class: 'demo-reset', disabled: !ready.value, onClick: reset },
            'Reset demo',
          ),
          h('output', { class: 'demo-status', 'aria-live': 'polite' }, status.value),
        ]),
      ]);
  },
});
