'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import {
  createOnboarding,
  type Labels,
  type RendererContext,
  type Onboarding,
  type OnboardingOptions,
  type OnboardingState,
} from '@zero-lab/onboarding';

export interface OnboardingContextValue {
  kit: Onboarding;
  state: OnboardingState;
}

export type OnboardingProviderProps = (
  { options: OnboardingOptions; kit?: never } | { kit: Onboarding; options?: never }
) & {
  children?: ReactNode;
  /** Replaces the default renderer for an owned kit. Only called while running. */
  renderStep?: (context: RendererContext) => ReactNode;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// Hydration always starts idle, even if an external store changed before hydration.
const serverSnapshot: OnboardingState = {
  status: 'idle',
  tourId: null,
  stepIndex: 0,
  step: null,
  totalSteps: 0,
  target: null,
};
const getServerSnapshot = () => serverSnapshot;

const defaultLabels: Labels = {
  next: 'Next',
  back: 'Back',
  skip: 'Skip',
  done: 'Done',
  stepOf: (current, total) => `Step ${current} of ${total}`,
};

/** Options/kit are captured once. Use a React key to deliberately replace a kit. */
export function OnboardingProvider({ children, renderStep, ...props }: OnboardingProviderProps) {
  const [instance] = useState(() => {
    const kit =
      props.kit ??
      createOnboarding({
        ...props.options!,
        ...(renderStep ? { renderer: 'none' as const } : {}),
      });
    return {
      kit,
      labels: { ...defaultLabels, ...props.options?.labels },
    };
  });
  const { kit } = instance;
  const subscribe = useCallback((notify: () => void) => kit.subscribe(notify), [kit]);
  const state = useSyncExternalStore(subscribe, kit.getState, getServerSnapshot);
  const value = useMemo(() => ({ kit, state }), [kit, state]);

  // mount cleanup is reversible, unlike destroy(). This supports StrictMode replay.
  useEffect(() => kit.mount(), [kit]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {state.status === 'running' && renderStep?.({ kit, state, labels: instance.labels })}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used within a OnboardingProvider.');
  return context;
}

export interface OnboardingStepProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
}

/** An inline anchor. Its children are preserved, not cloned or replaced. */
export function OnboardingStep({ name, children, ...props }: OnboardingStepProps) {
  return (
    <span {...props} data-onboarding={name}>
      {children}
    </span>
  );
}
