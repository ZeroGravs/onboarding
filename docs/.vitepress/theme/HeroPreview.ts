import {
  computed,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

const steps = [
  {
    id: 'create',
    target: '#create-project',
    title: 'Create a project',
    content: 'Start your next idea here.',
  },
  {
    id: 'progress',
    target: '#project-progress',
    title: 'Track your progress',
    content: 'See what is moving forward.',
  },
  {
    id: 'help',
    target: '#project-help',
    title: 'Find a little help',
    content: 'Guidance is always close by.',
  },
];

const code = `import { createOnboarding } from '@onboarding/core';
import '@onboarding/core/styles.css';

const steps = [
${steps
  .map(
    (step) =>
      `  { id: ${JSON.stringify(step.id)}, target: ${JSON.stringify(step.target)},\n` +
      `    title: ${JSON.stringify(step.title)}, content: ${JSON.stringify(step.content)} }`,
  )
  .join(',\n')}
];
const kit = createOnboarding({
  tours: [{ id: 'welcome', steps }],
});
kit.start('welcome');`;

const tokens: { text: string; offset: number; kind: string }[] = [];
const pattern =
  /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|\b(?:import|from|const|createOnboarding|start)\b/g;
let offset = 0;
for (const match of code.matchAll(pattern)) {
  if (match.index > offset) {
    tokens.push({ text: code.slice(offset, match.index), offset, kind: 'plain' });
  }
  tokens.push({
    text: match[0],
    offset: match.index,
    kind: /^['"]/.test(match[0])
      ? 'string'
      : /^(createOnboarding|start)$/.test(match[0])
        ? 'function'
        : 'keyword',
  });
  offset = match.index + match[0].length;
}
tokens.push({ text: code.slice(offset), offset, kind: 'plain' });

const typingDuration = 5_200;
const stepDuration = 2_600;
const loopDuration = typingDuration + (steps.length + 1) * stepDuration;

export default defineComponent({
  name: 'HeroPreview',
  setup() {
    const root = ref<HTMLElement | null>(null);
    const editor = ref<HTMLElement | null>(null);
    const replayTour = ref<HTMLButtonElement | null>(null);
    const nextButton = ref<HTMLButtonElement | null>(null);
    const ready = ref(false);
    const paused = ref(false);
    const reducedMotion = ref(false);
    const elapsed = ref(0);
    const inView = ref(true);
    const manualStep = ref<number | null>(null);
    const skipped = ref(false);
    const staticPreview = computed(() => !ready.value || reducedMotion.value);
    const showing = computed(() => staticPreview.value || elapsed.value >= typingDuration);
    const stepIndex = computed(
      () =>
        manualStep.value ??
        (staticPreview.value
          ? 0
          : Math.max(0, Math.floor((elapsed.value - typingDuration) / stepDuration))),
    );
    const finished = computed(() => showing.value && stepIndex.value >= steps.length);
    const step = computed(() => steps[Math.min(stepIndex.value, steps.length - 1)]!);
    const visibleCharacters = computed(() =>
      staticPreview.value
        ? code.length
        : Math.floor(Math.min(1, elapsed.value / typingDuration) * code.length),
    );
    let timer: number | undefined;
    let observer: IntersectionObserver | undefined;
    let media: MediaQueryList | undefined;
    let disposed = false;

    watch(
      visibleCharacters,
      () => {
        if (!staticPreview.value && editor.value)
          editor.value.scrollTop = editor.value.scrollHeight;
      },
      { flush: 'post' },
    );

    function stopTimer() {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
    }

    function syncTimer() {
      stopTimer();
      if (disposed || paused.value || reducedMotion.value || !inView.value || document.hidden)
        return;
      timer = window.setInterval(() => {
        elapsed.value = (elapsed.value + 50) % loopDuration;
      }, 50);
    }

    function updateMotion() {
      reducedMotion.value = media?.matches ?? false;
      syncTimer();
    }

    function pause() {
      paused.value = true;
      syncTimer();
    }

    function navigate(index: number, skip = false) {
      manualStep.value = index;
      elapsed.value = typingDuration + index * stepDuration;
      skipped.value = skip;
      pause();
      if (index >= steps.length)
        void nextTick(() => replayTour.value?.focus({ preventScroll: true }));
    }

    function replay() {
      elapsed.value = 0;
      manualStep.value = null;
      skipped.value = false;
      paused.value = false;
      if (editor.value) editor.value.scrollTop = 0;
      syncTimer();
    }

    function targetClass(id: string) {
      return [
        'hero-app-target',
        { 'is-highlighted': showing.value && !finished.value && step.value.id === id },
      ];
    }

    onMounted(() => {
      media = window.matchMedia('(prefers-reduced-motion: reduce)');
      reducedMotion.value = media.matches;
      ready.value = true;
      media.addEventListener('change', updateMotion);
      document.addEventListener('visibilitychange', syncTimer);
      if ('IntersectionObserver' in window && root.value) {
        observer = new IntersectionObserver(
          ([entry]) => {
            if (!entry) return;
            inView.value = entry.isIntersecting;
            syncTimer();
          },
          { threshold: 0.1 },
        );
        observer.observe(root.value);
      }
      syncTimer();
    });

    onBeforeUnmount(() => {
      disposed = true;
      stopTimer();
      observer?.disconnect();
      media?.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', syncTimer);
    });

    return () =>
      h(
        'section',
        {
          ref: root,
          class: [
            'hero-preview',
            { 'is-showing': showing.value && !finished.value, 'is-paused': paused.value },
          ],
          'aria-label': 'From code to your first tour',
          'aria-describedby': 'hero-preview-description',
          'data-phase': finished.value ? 'finished' : showing.value ? 'preview' : 'typing',
        },
        [
          h(
            'p',
            { id: 'hero-preview-description', class: 'hero-sr-only' },
            'An illustrated three-step preview using the default tour styles. Next, Back, Skip and Done work here without moving focus automatically. The live example below runs the real engine.',
          ),
          h('div', { class: 'hero-editor-bar', 'aria-hidden': 'true' }, [
            h('span', { class: 'hero-window-dots' }, [h('i'), h('i'), h('i')]),
            h('span', 'welcome.ts'),
            h('span', { class: 'hero-editor-language' }, 'TypeScript'),
          ]),
          h(
            'div',
            {
              ref: editor,
              class: 'hero-code-scroll',
              tabindex: 0,
              role: 'region',
              'aria-label': 'Example tour code',
              onFocusin: pause,
              onWheel: pause,
            },
            [
              h('pre', { class: 'hero-sr-only' }, code),
              h('pre', { class: 'hero-code', 'aria-hidden': 'true' }, [
                h(
                  'code',
                  tokens.map((token) =>
                    h(
                      'span',
                      { class: `hero-token-${token.kind}` },
                      token.text.slice(0, Math.max(0, visibleCharacters.value - token.offset)),
                    ),
                  ),
                ),
                !showing.value ? h('span', { class: 'hero-code-caret' }) : null,
              ]),
            ],
          ),
          h('div', { class: 'hero-app', onFocusin: pause }, [
            h('div', { class: 'hero-app-bar' }, [
              h('span', { class: 'hero-app-status' }),
              h('span', 'Your application'),
              h('span', { class: 'hero-app-preview-label' }, 'Preview'),
              h(
                'span',
                { id: 'project-help', class: ['hero-app-help', targetClass('help')] },
                'Help',
              ),
            ]),
            h('div', { class: 'hero-app-content' }, [
              h('div', { class: 'hero-app-copy' }, [
                h('strong', 'Your workspace'),
                h('span', 'A little guidance. Right on time.'),
              ]),
              h(
                'span',
                { id: 'create-project', class: ['hero-app-create', targetClass('create')] },
                'Create project',
              ),
            ]),
            h(
              'span',
              { id: 'project-progress', class: ['hero-app-progress', targetClass('progress')] },
              '3 projects in progress',
            ),
            h('div', { class: 'hero-app-shade', 'aria-hidden': 'true' }),
            showing.value && !finished.value
              ? h(
                  'section',
                  {
                    class: 'onboarding-popover hero-app-tooltip',
                    role: 'group',
                    'aria-label': 'Onboarding tour preview',
                  },
                  [
                    h('p', { class: 'onboarding-progress' }, `Step ${stepIndex.value + 1} of 3`),
                    h('h2', step.value.title),
                    h('p', step.value.content),
                    h('div', { class: 'onboarding-actions' }, [
                      h(
                        'button',
                        {
                          type: 'button',
                          key: 'skip',
                          class: 'onboarding-button onboarding-skip',
                          onClick: () => navigate(steps.length, true),
                        },
                        'Skip',
                      ),
                      stepIndex.value > 0
                        ? h(
                            'button',
                            {
                              type: 'button',
                              key: 'back',
                              class: 'onboarding-button',
                              onClick: () => navigate(stepIndex.value - 1),
                            },
                            'Back',
                          )
                        : null,
                      h(
                        'button',
                        {
                          type: 'button',
                          key: 'next',
                          ref: nextButton,
                          class: 'onboarding-button onboarding-primary',
                          onClick: () => navigate(stepIndex.value + 1),
                        },
                        stepIndex.value === steps.length - 1 ? 'Done' : 'Next',
                      ),
                    ]),
                    h('div', {
                      class: 'onboarding-arrow',
                      'aria-hidden': 'true',
                      style:
                        step.value.id === 'progress'
                          ? { top: '-5px', left: '28px' }
                          : { top: '-5px', right: '26px' },
                    }),
                  ],
                )
              : null,
            finished.value
              ? h('div', { class: 'hero-app-finished' }, [
                  h(
                    'p',
                    skipped.value ? 'Tour skipped. Try it again?' : 'You are ready. Tour complete!',
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      ref: replayTour,
                      class: 'onboarding-button onboarding-primary',
                      onClick: () => {
                        navigate(0);
                        void nextTick(() => nextButton.value?.focus({ preventScroll: true }));
                      },
                    },
                    'Replay tour',
                  ),
                ])
              : null,
          ]),
          h('div', { class: 'hero-preview-footer' }, [
            h(
              'span',
              { class: 'hero-preview-caption' },
              reducedMotion.value
                ? 'A few lines. A little guidance.'
                : finished.value
                  ? '02 / Ready to make it yours'
                  : showing.value
                    ? `02 / Step ${stepIndex.value + 1} of 3`
                    : '01 / Define your tour',
            ),
            h('div', { class: 'hero-preview-controls' }, [
              h(
                'button',
                {
                  type: 'button',
                  disabled: !ready.value || reducedMotion.value,
                  'aria-label': paused.value ? 'Resume animation' : 'Pause animation',
                  onClick: () => {
                    if (paused.value) {
                      manualStep.value = null;
                      skipped.value = false;
                    }
                    paused.value = !paused.value;
                    syncTimer();
                  },
                },
                paused.value ? 'Resume' : 'Pause',
              ),
              h(
                'button',
                {
                  type: 'button',
                  disabled: !ready.value || reducedMotion.value,
                  'aria-label': 'Replay animation',
                  onClick: replay,
                },
                'Replay',
              ),
            ]),
          ]),
        ],
      );
  },
});
