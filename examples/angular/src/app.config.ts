import { inject, type ApplicationConfig } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { createAngularRouter, provideOnboarding } from '@zero-lab/onboarding-angular';
import { localStorageAdapter } from '@zero-lab/onboarding';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideOnboarding(() => ({
      router: createAngularRouter(inject(Router)),
      storage: localStorageAdapter('example-angular'),
      tours: [
        {
          id: 'onboarding',
          steps: [
            {
              id: 'welcome',
              route: '/',
              target: '[data-onboarding="welcome"]',
              title: 'Welcome to your workspace',
              content: 'This is your overview. Next, we will visit settings together.',
              placement: 'bottom',
            },
            {
              id: 'settings',
              route: '/settings',
              target: '[data-onboarding="settings"]',
              title: 'Make it yours',
              content: 'Manage your preferences here. You have completed the tour!',
              placement: 'bottom',
            },
          ],
        },
      ],
    })),
  ],
};
