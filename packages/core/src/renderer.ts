import { arrow, autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
import type { Renderer } from './types';

let sequence = 0;
const svgNS = 'http://www.w3.org/2000/svg';

/** Default text-only UI; content is never inserted as HTML. */
export const defaultRenderer: Renderer = ({ state, kit, labels }) => {
  if (state.status !== 'running' || !state.step) return;
  const id = `onboarding-${++sequence}`;
  const root = document.createElement('div');
  root.className = 'onboarding-root';
  root.dataset.onboardingKit = '';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.classList.add('onboarding-overlay');
  svg.setAttribute('aria-hidden', 'true');
  const defs = document.createElementNS(svgNS, 'defs');
  const mask = document.createElementNS(svgNS, 'mask');
  mask.id = `${id}-mask`;
  const background = document.createElementNS(svgNS, 'rect');
  background.setAttribute('width', '100%');
  background.setAttribute('height', '100%');
  background.setAttribute('fill', 'white');
  const hole = document.createElementNS(svgNS, 'rect');
  hole.setAttribute('fill', 'black');
  hole.setAttribute('rx', '8');
  mask.append(background, hole);
  defs.append(mask);
  const shade = document.createElementNS(svgNS, 'rect');
  shade.setAttribute('width', '100%');
  shade.setAttribute('height', '100%');
  shade.setAttribute('mask', `url(#${mask.id})`);
  shade.classList.add('onboarding-shade');
  svg.append(defs, shade);
  const panel = document.createElement('section');
  panel.className = 'onboarding-popover';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', `${id}-title`);
  panel.setAttribute('aria-describedby', `${id}-progress ${id}-content`);
  panel.tabIndex = -1;
  const title = document.createElement('h2');
  title.id = `${id}-title`;
  title.textContent = state.step.title;
  const content = document.createElement('p');
  content.id = `${id}-content`;
  content.textContent = state.step.content;
  const progress = document.createElement('p');
  progress.id = `${id}-progress`;
  progress.className = 'onboarding-progress';
  progress.setAttribute('aria-live', 'polite');
  progress.setAttribute('aria-atomic', 'true');
  progress.textContent = labels.stepOf(state.stepIndex + 1, state.totalSteps);
  const actions = document.createElement('div');
  actions.className = 'onboarding-actions';
  function button(label: string, action: () => void, className = '') {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `onboarding-button ${className}`;
    element.textContent = label;
    element.addEventListener('click', action);
    return element;
  }
  const skip = button(labels.skip, () => kit.skip(), 'onboarding-skip');
  actions.append(skip);
  if (state.stepIndex > 0)
    actions.append(
      button(labels.back, () => {
        void kit.prev();
      }),
    );
  actions.append(
    button(
      state.stepIndex === state.totalSteps - 1 ? labels.done : labels.next,
      () => {
        void kit.next();
      },
      'onboarding-primary',
    ),
  );
  const caret = document.createElement('div');
  caret.className = 'onboarding-arrow';
  caret.setAttribute('aria-hidden', 'true');
  const positionArrow = arrow(() => ({
    element: caret,
    // The rotated square extends past its layout box along the popover edge.
    padding: (Number.parseFloat(getComputedStyle(panel).borderTopLeftRadius) || 0) + 3,
  }));
  panel.append(progress, title, content, actions, caret);
  root.append(svg, panel);
  document.body.append(root);
  let disposed = false;
  const update = () => {
    if (disposed) return;
    const target = state.target?.isConnected ? state.target : null;
    if (!target) {
      hole.setAttribute('width', '0');
      hole.setAttribute('height', '0');
      panel.classList.add('onboarding-centered');
      caret.hidden = true;
      return;
    }
    panel.classList.remove('onboarding-centered');
    const rect = target.getBoundingClientRect();
    hole.setAttribute('x', String(rect.left - 6));
    hole.setAttribute('y', String(rect.top - 6));
    hole.setAttribute('width', String(rect.width + 12));
    hole.setAttribute('height', String(rect.height + 12));
    void computePosition(target, panel, {
      strategy: 'fixed',
      placement: state.step?.placement ?? 'bottom',
      middleware: [offset(14), flip(), shift({ padding: 12, crossAxis: true }), positionArrow],
    }).then(({ x, y, placement, middlewareData }) => {
      if (disposed) return;
      panel.style.left = `${x}px`;
      panel.style.top = `${y}px`;
      const side = placement.split('-')[0];
      caret.style.cssText = '';
      if (middlewareData.arrow?.x != null) caret.style.left = `${middlewareData.arrow.x}px`;
      if (middlewareData.arrow?.y != null) caret.style.top = `${middlewareData.arrow.y}px`;
      const staticSide = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' }[side]!;
      caret.style.setProperty(staticSide, '-5px');
    });
  };
  const stop = state.target
    ? autoUpdate(state.target, panel, update)
    : (() => {
        update();
        return () => {};
      })();
  panel.focus({ preventScroll: true });
  return () => {
    disposed = true;
    stop();
    root.remove();
  };
};
