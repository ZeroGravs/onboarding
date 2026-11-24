import type { Target } from './types';

export function resolveTarget(target: Target): Element | null {
  const element = typeof target === 'string' ? document.querySelector(target) : target();
  return element?.isConnected ? element : null;
}

export function abortError(): DOMException {
  return new DOMException('Onboarding transition cancelled', 'AbortError');
}

export function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function abortable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      reject(abortError());
    };
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
    operation.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

export function waitForTarget(
  target: Target,
  timeout: number,
  signal: AbortSignal,
): Promise<Element> {
  if (signal.aborted) return Promise.reject(abortError());
  try {
    const found = resolveTarget(target);
    if (found) return Promise.resolve(found);
  } catch (error) {
    return Promise.reject(error);
  }
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    const cleanup = () => {
      observer.disconnect();
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    };
    const abort = () => {
      cleanup();
      reject(abortError());
    };
    const check = () => {
      try {
        const found = resolveTarget(target);
        if (found) {
          cleanup();
          resolve(found);
          return true;
        }
      } catch (error) {
        cleanup();
        reject(error);
        return true;
      }
      return false;
    };
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    signal.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Onboarding target not found after ${timeout}ms`));
    }, timeout);
  });
}
