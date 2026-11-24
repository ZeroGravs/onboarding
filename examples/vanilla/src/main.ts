import { createHistoryRouter, createOnboarding, localStorageAdapter } from '@zero-lab/onboarding';
import '@zero-lab/onboarding/styles.css';
import './style.css';

const router = createHistoryRouter();
const page = document.querySelector('#page')!;
function renderPage() {
  if (router.getPath() === '/settings') {
    page.innerHTML =
      '<h1 data-onboarding="settings">Make it yours.</h1><p>Your workspace preferences live here.</p><label>Workspace name <input value="My workspace" /></label>';
  } else {
    page.innerHTML =
      '<h1 data-onboarding="welcome">Welcome to your workspace.</h1><p>Guide people to their first great moment, right inside your product.</p><article><h2>Your next big idea starts here.</h2><p>No framework required. A few lines of TypeScript is all it takes.</p></article>';
  }
}
renderPage();
const stopRouting = router.subscribe(renderPage);
const kit = createOnboarding({
  router,
  storage: localStorageAdapter('example-vanilla'),
  tours: [
    {
      id: 'onboarding',
      steps: [
        {
          id: 'welcome',
          route: '/',
          target: '[data-onboarding="welcome"]',
          title: 'Your dashboard',
          content: 'Start your journey here. Next, let us personalize your workspace.',
        },
        {
          id: 'settings',
          route: '/settings',
          target: '[data-onboarding="settings"]',
          title: 'Your preferences',
          content: 'The tour followed you to another page. You are ready to go!',
        },
      ],
    },
  ],
  onEvent: (event) => {
    document.querySelector('#status')!.textContent = event.type;
  },
});
const unmount = kit.mount();
document.querySelector('#start')!.addEventListener('click', () => {
  void kit.start('onboarding');
});
document.querySelector('#reset')!.addEventListener('click', () => kit.reset());
document.querySelectorAll<HTMLAnchorElement>('[data-route]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    router.navigate(link.dataset.route!);
  });
});
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    unmount();
    stopRouting();
    kit.destroy();
  });
