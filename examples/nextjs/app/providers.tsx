'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { localStorageAdapter, type OnboardingOptions } from '@zero-lab/onboarding';
import { OnboardingProvider } from '@zero-lab/onboarding-react';

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentPath = useRef(pathname ?? '/');
  const currentRouter = useRef(router);
  const listeners = useRef(new Set<() => void>());
  const [options] = useState<OnboardingOptions>(() => ({
    storage: localStorageAdapter('example-nextjs'),
    router: {
      getPath: () => currentPath.current,
      navigate: (path) => currentRouter.current.push(path),
      subscribe(listener) {
        listeners.current.add(listener);
        return () => {
          listeners.current.delete(listener);
        };
      },
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

  useEffect(() => {
    currentRouter.current = router;
  }, [router]);
  // App Router has no router.events. Notify after pathname commits, including Back/Forward.
  useEffect(() => {
    const path = pathname ?? '/';
    if (path === currentPath.current) return;
    currentPath.current = path;
    listeners.current.forEach((listener) => listener());
  }, [pathname]);

  return <OnboardingProvider options={options}>{children}</OnboardingProvider>;
}
