import { defineComponent, h } from 'vue';
import { withBase } from 'vitepress';
import { siAngular, siJavascript, siNextdotjs, siReact, siVuedotjs } from 'simple-icons';

const frameworks = [
  { slug: 'react', name: 'React', detail: 'A provider, a hook, your UI.', icon: siReact },
  { slug: 'nextjs', name: 'Next.js', detail: 'App Router. Server-safe.', icon: siNextdotjs },
  { slug: 'vue', name: 'Vue', detail: 'A plugin and a composable.', icon: siVuedotjs },
  { slug: 'angular', name: 'Angular', detail: 'Standalone, with signals.', icon: siAngular },
  { slug: 'vanilla', name: 'Vanilla JS', detail: 'No framework required.', icon: siJavascript },
];

export default defineComponent({
  name: 'FrameworkLinks',
  setup() {
    return () =>
      h(
        'div',
        { class: 'framework-grid', 'aria-label': 'Framework quickstarts' },
        frameworks.map((framework) =>
          h(
            'a',
            {
              class: 'framework-card',
              href: withBase(`/getting-started/${framework.slug}`),
              'aria-label': `${framework.name} quickstart`,
            },
            [
              h(
                'span',
                { class: `framework-mark framework-${framework.slug}`, 'aria-hidden': 'true' },
                [
                  h('svg', { viewBox: '0 0 24 24', fill: 'currentColor', focusable: 'false' }, [
                    h('path', { d: framework.icon.path }),
                  ]),
                ],
              ),
              h('strong', framework.name),
              h('span', framework.detail),
              h('span', { class: 'framework-link-label' }, 'Get started'),
            ],
          ),
        ),
      );
  },
});
