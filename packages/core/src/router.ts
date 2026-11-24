import { abortError } from './dom';
import type { RouterAdapter } from './types';

/** For vanilla apps. Framework apps should supply their own router adapter. */
export function createHistoryRouter(): RouterAdapter {
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  return {
    getPath: () => (typeof window === 'undefined' ? '/' : window.location.pathname),
    navigate(path) {
      if (typeof window === 'undefined') return;
      window.history.pushState(null, '', path);
      notify();
    },
    subscribe(listener) {
      if (!listeners.size && typeof window !== 'undefined')
        window.addEventListener('popstate', notify);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size && typeof window !== 'undefined')
          window.removeEventListener('popstate', notify);
      };
    },
  };
}

export function waitForRoute(
  router: RouterAdapter,
  path: string,
  timeout: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    if (router.getPath() === path) {
      resolve();
      return;
    }
    let unsubscribe = () => {};
    const cleanup = () => {
      unsubscribe();
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    };
    const abort = () => {
      cleanup();
      reject(abortError());
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Onboarding route "${path}" not reached after ${timeout}ms`));
    }, timeout);
    signal.addEventListener('abort', abort, { once: true });
    unsubscribe = router.subscribe(() => {
      if (router.getPath() === path) {
        cleanup();
        resolve();
      }
    });
    if (router.getPath() === path) {
      cleanup();
      resolve();
    }
  });
}
