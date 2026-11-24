import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { h } from 'vue';
import FrameworkLinks from './FrameworkLinks';
import HeroPreview from './HeroPreview';
import LiveTour from './LiveTour';
import '@onboarding/core/styles.css';
import './style.css';
import './hero.css';

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-image': () => h(HeroPreview),
    });
  },
  enhanceApp({ app }) {
    app.component('FrameworkLinks', FrameworkLinks);
    app.component('LiveTour', LiveTour);
  },
} satisfies Theme;
