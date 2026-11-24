import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, NavLink, Outlet, RouterProvider } from 'react-router-dom';
import { localStorageAdapter, type OnboardingOptions } from '@onboarding/core';
import { OnboardingProvider, useOnboarding } from '@onboarding/react';
import '@onboarding/core/styles.css';
import './styles.css';

function StartButton() {
  const { kit } = useOnboarding();
  return (
    <button className="primary" onClick={() => void kit.start('onboarding')}>
      Start onboarding
    </button>
  );
}

function Layout() {
  const [options] = useState<OnboardingOptions>(() => ({
    storage: localStorageAdapter('example-react'),
    router: {
      getPath: () => router.state.location.pathname,
      navigate: (path) => router.navigate(path),
      subscribe: (listener) => router.subscribe(() => listener()),
    },
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
  }));
  return (
    <OnboardingProvider options={options}>
      <div className="shell">
        <header>
          <a className="brand" href="/">
            ◈ Orbit <small>REACT</small>
          </a>
          <nav aria-label="Main navigation">
            <NavLink to="/">Overview</NavLink>
            <NavLink to="/settings">Settings</NavLink>
          </nav>
          <StartButton />
        </header>
        <main>
          <Outlet />
        </main>
        <footer>Built with Onboarding Kit · Small steps. Great first impressions.</footer>
      </div>
    </OnboardingProvider>
  );
}

function Home() {
  return (
    <>
      <p className="eyebrow">YOUR WORKSPACE, REIMAGINED</p>
      <h1>
        Less figuring out.
        <br />
        <span>More getting started.</span>
      </h1>
      <p className="intro">
        A little guidance goes a long way. Take a two-step tour of your new home for good ideas.
      </p>
      <section className="card featured" data-onboarding="welcome">
        <span className="badge">WELCOME ABOARD</span>
        <h2>One place for your next chapter</h2>
        <p>Your workspace is ready. Bring your ideas; we’ll help with the first steps.</p>
        <div className="metrics">
          <div>
            <strong>12</strong>
            <span>Open projects</span>
          </div>
          <div>
            <strong>04</strong>
            <span>Teammates</span>
          </div>
          <div>
            <strong>∞</strong>
            <span>Possibilities</span>
          </div>
        </div>
      </section>
      <div className="grid">
        <article className="card">
          <h3>Find your focus</h3>
          <p>A calm space to plan what matters next.</p>
        </article>
        <article className="card">
          <h3>Keep moving</h3>
          <p>Your next milestone is closer than you think.</p>
        </article>
      </div>
    </>
  );
}

function Settings() {
  const [saved, setSaved] = useState(false);
  return (
    <>
      <p className="eyebrow">A SPACE THAT FEELS LIKE YOU</p>
      <h1>
        Your workspace.
        <br />
        <span>Your way.</span>
      </h1>
      <p className="intro">Small preferences make a big difference.</p>
      <section className="card featured" data-onboarding="settings">
        <span className="badge">WORKSPACE PREFERENCES</span>
        <h2>The details are yours</h2>
        <label className="field">
          Workspace name
          <input defaultValue="My Orbit" />
        </label>
        <label className="check">
          <input type="checkbox" defaultChecked /> Send me a weekly progress digest
        </label>
        <button className="primary" onClick={() => setSaved(true)}>
          Save changes
        </button>
        <p role="status">
          {saved ? 'Preferences saved. Looking good!' : 'You can change these anytime.'}
        </p>
      </section>
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
