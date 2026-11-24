import type { OnboardingState } from './types';

export const initialState: OnboardingState = {
  status: 'idle',
  tourId: null,
  stepIndex: 0,
  step: null,
  totalSteps: 0,
  target: null,
};

export type StateAction = { type: 'patch'; value: Partial<OnboardingState> } | { type: 'reset' };

export function reducer(state: OnboardingState, action: StateAction): OnboardingState {
  return action.type === 'reset' ? { ...initialState } : { ...state, ...action.value };
}
