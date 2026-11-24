import { createApp, defineComponent, h, ref, withDirectives } from 'vue';
import { createRouter, createWebHistory, RouterLink, RouterView } from 'vue-router';
import { localStorageAdapter } from '@onboarding/core';
import {
  createOnboardingPlugin,
  createVueRouterAdapter,
  useOnboarding,
  vOnboardingStep,
} from '@onboarding/vue';
import '@onboarding/core/styles.css';
import './styles.css';

const Home = defineComponent({
  setup: () => () => [
    h('p', { class: 'eyebrow' }, 'YOUR WORKSPACE, REIMAGINED'),
    h('h1', ['Less figuring out.', h('br'), h('span', 'More getting started.')]),
    h(
      'p',
      { class: 'intro' },
      'A little guidance goes a long way. Take a two-step tour of your new home for good ideas.',
    ),
    withDirectives(
      h('section', { class: 'card featured' }, [
        h('span', { class: 'badge' }, 'WELCOME ABOARD'),
        h('h2', 'One place for your next chapter'),
        h('p', 'Your workspace is ready. Bring your ideas; we’ll help with the first steps.'),
        h(
          'div',
          { class: 'metrics' },
          [
            ['12', 'Open projects'],
            ['04', 'Teammates'],
            ['∞', 'Possibilities'],
          ].map(([value, label]) => h('div', [h('strong', value), h('span', label)])),
        ),
      ]),
      [[vOnboardingStep, 'welcome']],
    ),
    h('div', { class: 'grid' }, [
      h('article', { class: 'card' }, [
        h('h3', 'Find your focus'),
        h('p', 'A calm space to plan what matters next.'),
      ]),
      h('article', { class: 'card' }, [
        h('h3', 'Keep moving'),
        h('p', 'Your next milestone is closer than you think.'),
      ]),
    ]),
  ],
});

const Settings = defineComponent({
  setup() {
    const saved = ref(false);
    return () => [
      h('p', { class: 'eyebrow' }, 'A SPACE THAT FEELS LIKE YOU'),
      h('h1', ['Your workspace.', h('br'), h('span', 'Your way.')]),
      h('p', { class: 'intro' }, 'Small preferences make a big difference.'),
      withDirectives(
        h('section', { class: 'card featured' }, [
          h('span', { class: 'badge' }, 'WORKSPACE PREFERENCES'),
          h('h2', 'The details are yours'),
          h('label', { class: 'field' }, ['Workspace name', h('input', { value: 'My Orbit' })]),
          h('label', { class: 'check' }, [
            h('input', { type: 'checkbox', checked: true }),
            ' Send me a weekly progress digest',
          ]),
          h(
            'button',
            {
              class: 'primary',
              onClick: () => {
                saved.value = true;
              },
            },
            'Save changes',
          ),
          h(
            'p',
            { role: 'status' },
            saved.value ? 'Preferences saved. Looking good!' : 'You can change these anytime.',
          ),
        ]),
        [[vOnboardingStep, 'settings']],
      ),
    ];
  },
});

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/settings', component: Settings },
  ],
});

const Shell = defineComponent({
  setup() {
    const { kit } = useOnboarding();
    return () =>
      h('div', { class: 'shell' }, [
        h('header', [
          h(
            RouterLink,
            { class: 'brand', to: '/' },
            { default: () => ['◈ Orbit ', h('small', 'VUE')] },
          ),
          h('nav', { 'aria-label': 'Main navigation' }, [
            h(RouterLink, { to: '/' }, { default: () => 'Overview' }),
            h(RouterLink, { to: '/settings' }, { default: () => 'Settings' }),
          ]),
          h(
            'button',
            { class: 'primary', onClick: () => void kit.start('onboarding') },
            'Start onboarding',
          ),
        ]),
        h('main', [h(RouterView)]),
        h('footer', 'Built with Onboarding Kit · Small steps. Great first impressions.'),
      ]);
  },
});

const app = createApp(Shell);
app.use(router);
app.use(
  createOnboardingPlugin({
    storage: localStorageAdapter('example-vue'),
    router: createVueRouterAdapter(router),
    tours: [
      {
        id: 'onboarding',
        steps: [
          {
            id: 'welcome',
            target: '[data-onboarding="welcome"]',
            route: '/',
            title: 'Your next big idea starts here',
            content: 'This is your workspace. Keep projects, teammates, and progress in one place.',
          },
          {
            id: 'settings',
            target: '[data-onboarding="settings"]',
            route: '/settings',
            title: 'Make yourself at home',
            content: 'Fine-tune your workspace here. The onboarding followed you across routes.',
          },
        ],
      },
    ],
  }),
);
void router.isReady().then(() => app.mount('#app'));
