import { defineConfig } from 'vitepress';

const base = process.env.DOCS_BASE ?? '/';

export default defineConfig({
  title: 'Onboarding Kit',
  description:
    'A working product tour in five minutes. React, Next.js, Vue, Angular, or vanilla JavaScript.',
  lang: 'en-US',
  base,
  cleanUrls: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}mark.svg` }],
    ['meta', { name: 'theme-color', content: '#6554d9' }],
  ],
  markdown: { lineNumbers: true },
  themeConfig: {
    logo: '/mark.svg',
    siteTitle: 'Onboarding Kit',
    nav: [
      { text: 'Quickstarts', link: '/getting-started/', activeMatch: '/getting-started/' },
      { text: 'Live example', link: '/playground' },
      { text: 'API', link: '/api' },
    ],
    sidebar: [
      {
        text: 'Your first tour',
        items: [
          { text: 'Start here', link: '/getting-started/' },
          { text: 'React', link: '/getting-started/react' },
          { text: 'Next.js', link: '/getting-started/nextjs' },
          { text: 'Vue', link: '/getting-started/vue' },
          { text: 'Angular', link: '/getting-started/angular' },
          { text: 'Vanilla JavaScript', link: '/getting-started/vanilla' },
        ],
      },
      {
        text: 'Make it yours',
        items: [
          { text: 'Live example', link: '/playground' },
          { text: 'Common recipes', link: '/recipes' },
          { text: 'Theming and custom UI', link: '/theming' },
          { text: 'Multi-page tours', link: '/routing' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Core API', link: '/api' },
          { text: 'Compatibility', link: '/compatibility' },
          { text: 'Security', link: '/security' },
        ],
      },
    ],
    search: { provider: 'local' },
    outline: [2, 3],
    footer: { message: 'MIT licensed. No tracking. Just useful onboarding.' },
  },
});
