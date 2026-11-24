import type { Placement } from '@floating-ui/dom';

export type Target = string | (() => Element | null);
export type Status = 'idle' | 'navigating' | 'waiting' | 'running' | 'completed' | 'skipped';

export interface OnboardingStep {
  id: string;
  target?: Target;
  title: string;
  /** Plain text, never interpreted as HTML. Use a custom renderer for rich content. */
  content: string;
  placement?: Placement;
  route?: string;
  beforeShow?: (signal: AbortSignal) => void | Promise<void>;
  advanceOn?: { selector: string; event: string };
}

export type Trigger = (
  | { type: 'manual' }
  | { type: 'firstVisit' }
  | { type: 'route'; path: string }
  | { type: 'elementVisible'; selector: string }
  | { type: 'event'; name: string }
) & { when?: () => boolean };

export interface Tour {
  id: string;
  version?: number;
  steps: readonly OnboardingStep[];
  trigger?: Trigger;
}

export interface OnboardingState {
  status: Status;
  tourId: string | null;
  stepIndex: number;
  step: OnboardingStep | null;
  totalSteps: number;
  target: Element | null;
}

export interface Progress {
  status: 'running' | 'completed' | 'skipped';
  stepIndex: number;
  version: number;
  updatedAt: number;
}

export interface StorageAdapter {
  get(key: string): Progress | null;
  set(key: string, value: Progress): void;
  remove(key: string): void;
}

export interface RouterAdapter {
  getPath(): string;
  navigate(path: string): void | Promise<void>;
  subscribe(listener: () => void): () => void;
}

export type OnboardingEventType =
  | 'tour:started'
  | 'step:shown'
  | 'step:completed'
  | 'tour:completed'
  | 'tour:skipped'
  | 'step:error';

export interface OnboardingEvent {
  type: OnboardingEventType;
  tourId: string;
  stepId: string;
  stepIndex: number;
  timestamp: number;
  error?: unknown;
}

export interface Labels {
  next: string;
  back: string;
  skip: string;
  done: string;
  stepOf: (current: number, total: number) => string;
}

export interface RendererContext {
  state: OnboardingState;
  kit: Onboarding;
  labels: Labels;
}

/** Return a cleanup function; called before rendering another state or unmounting. */
export type Renderer = (context: RendererContext) => void | (() => void);

export interface OnboardingOptions {
  tours: readonly Tour[];
  storage?: StorageAdapter;
  router?: RouterAdapter;
  renderer?: 'default' | 'none' | Renderer;
  labels?: Partial<Labels>;
  onEvent?: (event: OnboardingEvent) => void;
  targetTimeout?: number;
  trapFocus?: boolean;
}

export interface Onboarding {
  /** Attach browser listeners/renderers. Safe to mount again after unmounting. */
  mount(): () => void;
  getState(): OnboardingState;
  subscribe(listener: (state: OnboardingState) => void): () => void;
  start(tourId: string, options?: { resume?: boolean }): Promise<void>;
  next(): Promise<void>;
  prev(): Promise<void>;
  skip(): void;
  reset(tourId?: string): void;
  /** Dispatch a named custom trigger without using browser globals. */
  trigger(name: string): void;
  on(type: OnboardingEventType, listener: (event: OnboardingEvent) => void): () => void;
  destroy(): void;
}
