import { abortable, isAbort, resolveTarget, waitForTarget } from './dom';
import { defaultRenderer } from './renderer';
import { waitForRoute } from './router';
import { initialState, reducer } from './state';
import { localStorageAdapter } from './storage';
import type {
  Labels,
  Progress,
  Tour,
  OnboardingEvent,
  OnboardingEventType,
  Onboarding,
  OnboardingOptions,
  OnboardingState,
} from './types';

const activeStatuses = new Set(['running', 'waiting', 'navigating']);

export function createOnboarding(options: OnboardingOptions): Onboarding {
  const tours = new Map<string, Tour>();
  for (const tour of options.tours) {
    if (!tour.id || tours.has(tour.id)) throw new Error(`Duplicate or empty tour ID: "${tour.id}"`);
    if (!tour.steps.length) throw new Error(`Tour "${tour.id}" needs at least one step`);
    if (
      new Set(tour.steps.map((step) => step.id)).size !== tour.steps.length ||
      tour.steps.some((step) => !step.id)
    ) {
      throw new Error(`Tour "${tour.id}" needs unique, non-empty step IDs`);
    }
    tours.set(tour.id, tour);
  }
  const labels: Labels = {
    next: 'Next',
    back: 'Back',
    skip: 'Skip',
    done: 'Done',
    stepOf: (current, total) => `Step ${current} of ${total}`,
    ...options.labels,
  };
  const storage = options.storage ?? localStorageAdapter();
  const timeout = options.targetTimeout ?? 5000;
  let state: OnboardingState = { ...initialState };
  let mounted = false;
  let destroyed = false;
  let transition: AbortController | undefined;
  let renderCleanup: (() => void) | undefined;
  let advanceCleanup: (() => void) | undefined;
  let mountCleanup: (() => void) | undefined;
  let focusOrigin: HTMLElement | null = null;
  let transitionSequence = 0;
  const listeners = new Set<(state: OnboardingState) => void>();
  const eventListeners = new Map<OnboardingEventType, Set<(event: OnboardingEvent) => void>>();

  function emit(type: OnboardingEventType, error?: unknown) {
    if (!state.tourId || !state.step) return;
    const event: OnboardingEvent = {
      type,
      tourId: state.tourId,
      stepId: state.step.id,
      stepIndex: state.stepIndex,
      timestamp: Date.now(),
      ...(error === undefined ? {} : { error }),
    };
    options.onEvent?.(event);
    for (const listener of eventListeners.get(type) ?? []) listener(event);
  }
  function clearStep() {
    renderCleanup?.();
    renderCleanup = undefined;
    advanceCleanup?.();
    advanceCleanup = undefined;
  }
  function render() {
    clearStep();
    if (!mounted || state.status !== 'running') return;
    const renderer = options.renderer ?? 'default';
    if (renderer !== 'none') {
      renderCleanup =
        (renderer === 'default' ? defaultRenderer : renderer)({ state, kit, labels }) || undefined;
    }
    const advance = state.step?.advanceOn;
    if (advance) {
      const listener = (event: Event) => {
        if (event.target instanceof Element && event.target.closest(advance.selector))
          void kit.next();
      };
      document.addEventListener(advance.event, listener);
      advanceCleanup = () => document.removeEventListener(advance.event, listener);
    }
  }
  function update(value: Partial<OnboardingState>, reset = false) {
    state = reducer(state, reset ? { type: 'reset' } : { type: 'patch', value });
    render();
    for (const listener of listeners) listener(state);
  }
  function cancel() {
    transitionSequence++;
    transition?.abort();
    transition = undefined;
    clearStep();
  }
  function restoreFocus() {
    if (focusOrigin?.isConnected) focusOrigin.focus({ preventScroll: true });
    focusOrigin = null;
  }
  function readProgress(tour: Tour): Progress | null {
    const saved = storage.get(tour.id);
    if (!saved) return null;
    if (
      saved.version !== (tour.version ?? 1) ||
      saved.stepIndex < 0 ||
      saved.stepIndex >= tour.steps.length
    ) {
      storage.remove(tour.id);
      return null;
    }
    return saved;
  }
  function persist(status: Progress['status']) {
    const tour = state.tourId ? tours.get(state.tourId) : undefined;
    if (tour)
      storage.set(tour.id, {
        status,
        stepIndex: state.stepIndex,
        version: tour.version ?? 1,
        updatedAt: Date.now(),
      });
  }
  async function show(tour: Tour, index: number, starting = false) {
    cancel();
    const sequence = transitionSequence;
    const controller = new AbortController();
    transition = controller;
    const signal = controller.signal;
    const step = tour.steps[index];
    update({
      status: 'waiting',
      tourId: tour.id,
      stepIndex: index,
      step,
      totalSteps: tour.steps.length,
      target: null,
    });
    persist('running');
    if (starting) emit('tour:started');
    try {
      if (signal.aborted) return;
      if (step.route) {
        if (!options.router) throw new Error(`Step "${step.id}" requires a router adapter`);
        if (options.router.getPath() !== step.route) {
          update({ status: 'navigating' });
          await abortable(Promise.resolve(options.router.navigate(step.route)), signal);
          await waitForRoute(options.router, step.route, timeout, signal);
        }
      }
      if (step.beforeShow) await abortable(Promise.resolve(step.beforeShow(signal)), signal);
      const target = step.target ? await waitForTarget(step.target, timeout, signal) : null;
      if (sequence !== transitionSequence || signal.aborted || !mounted) return;
      if (target && 'scrollIntoView' in target) {
        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      }
      update({ status: 'running', target });
      emit('step:shown');
    } catch (error) {
      if (isAbort(error) || sequence !== transitionSequence || !mounted) return;
      emit('step:error', error);
      // Missing async targets must not leave the tour stuck behind an invisible UI.
      update({ status: 'running', target: null });
      emit('step:shown');
    }
  }
  function evaluateTriggers(eventName?: string) {
    if (!mounted || activeStatuses.has(state.status)) return;
    for (const tour of tours.values()) {
      const trigger = tour.trigger;
      if (!trigger || trigger.type === 'manual' || trigger.when?.() === false) continue;
      const progress = readProgress(tour);
      if (progress?.status === 'completed' || progress?.status === 'skipped') continue;
      let eligible = trigger.type === 'firstVisit';
      if (trigger.type === 'route') eligible = options.router?.getPath() === trigger.path;
      if (trigger.type === 'event') eligible = eventName === trigger.name;
      if (trigger.type === 'elementVisible') {
        const target = resolveTarget(trigger.selector);
        if (target) {
          const rect = target.getBoundingClientRect();
          const style = window.getComputedStyle(target);
          eligible =
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > 0 &&
            rect.right > 0 &&
            rect.top < window.innerHeight &&
            rect.left < window.innerWidth &&
            style.visibility !== 'hidden' &&
            style.display !== 'none';
        }
      }
      if (eligible) {
        void kit.start(tour.id);
        break;
      }
    }
  }
  function keyboard(event: KeyboardEvent) {
    if (event.defaultPrevented || state.status !== 'running') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      kit.skip();
      return;
    }
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))
    )
      return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      if (event.key !== 'Tab') return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      void kit.next();
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      void kit.prev();
    }
    if (
      event.key === 'Tab' &&
      options.trapFocus !== false &&
      (options.renderer ?? 'default') === 'default'
    ) {
      const dialog = document.querySelector<HTMLElement>('[data-onboarding-kit] [role="dialog"]');
      const focusable = dialog
        ? Array.from(
            dialog.querySelectorAll<HTMLElement>(
              'button:not([disabled]),a[href],input,select,textarea,[tabindex="0"]',
            ),
          )
        : [];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (
        first &&
        last &&
        (!dialog?.contains(document.activeElement) ||
          (event.shiftKey
            ? document.activeElement === first || document.activeElement === dialog
            : document.activeElement === last))
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
  }

  const kit: Onboarding = {
    mount() {
      if (destroyed) throw new Error('Cannot mount a destroyed onboarding kit');
      if (mounted) return () => {};
      if (typeof document === 'undefined') return () => {};
      mounted = true;
      document.addEventListener('keydown', keyboard);
      const check = () => evaluateTriggers();
      const observer = new MutationObserver(check);
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'hidden', 'style'],
      });
      const unsubscribe = options.router?.subscribe(check);
      window.addEventListener('scroll', check, true);
      window.addEventListener('resize', check);
      render();
      queueMicrotask(() => {
        if (mounted) evaluateTriggers();
      });
      const cleanup = () => {
        if (!mounted) return;
        mounted = false;
        cancel();
        observer.disconnect();
        unsubscribe?.();
        document.removeEventListener('keydown', keyboard);
        window.removeEventListener('scroll', check, true);
        window.removeEventListener('resize', check);
        restoreFocus();
        state = { ...initialState };
        for (const listener of listeners) listener(state);
        mountCleanup = undefined;
      };
      mountCleanup = cleanup;
      return cleanup;
    },
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async start(tourId, { resume = true } = {}) {
      if (destroyed) throw new Error('Cannot start a destroyed onboarding kit');
      const tour = tours.get(tourId);
      if (!tour) throw new Error(`Unknown tour "${tourId}"`);
      if (!mounted) kit.mount();
      if (!mounted) return;
      if (!focusOrigin)
        focusOrigin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const saved = resume ? readProgress(tour) : null;
      const index = saved?.status === 'running' ? saved.stepIndex : 0;
      await show(tour, index, true);
    },
    async next() {
      if (state.status !== 'running' || !state.tourId) return;
      emit('step:completed');
      const tour = tours.get(state.tourId)!;
      if (state.stepIndex + 1 < tour.steps.length) await show(tour, state.stepIndex + 1);
      else {
        cancel();
        persist('completed');
        update({ status: 'completed', target: null });
        restoreFocus();
        emit('tour:completed');
      }
    },
    async prev() {
      if (state.status !== 'running' || !state.tourId || state.stepIndex === 0) return;
      await show(tours.get(state.tourId)!, state.stepIndex - 1);
    },
    skip() {
      if (!activeStatuses.has(state.status)) return;
      cancel();
      persist('skipped');
      update({ status: 'skipped', target: null });
      restoreFocus();
      emit('tour:skipped');
    },
    reset(tourId) {
      if (tourId && !tours.has(tourId)) throw new Error(`Unknown tour "${tourId}"`);
      for (const tour of tours.values()) if (!tourId || tour.id === tourId) storage.remove(tour.id);
      if (!tourId || state.tourId === tourId) {
        cancel();
        update({}, true);
        restoreFocus();
      }
    },
    trigger(name) {
      evaluateTriggers(name);
    },
    on(type, listener) {
      let set = eventListeners.get(type);
      if (!set) {
        set = new Set();
        eventListeners.set(type, set);
      }
      set.add(listener);
      return () => {
        set.delete(listener);
      };
    },
    destroy() {
      mountCleanup?.();
      cancel();
      destroyed = true;
      listeners.clear();
      eventListeners.clear();
    },
  };
  return kit;
}
