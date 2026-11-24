import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Providers } from './providers';
import { StartButton } from './start-button';
import '@zero-lab/onboarding/styles.css';
import './styles.css';

export const metadata: Metadata = {
  title: 'Orbit · Next.js + Onboarding Kit',
  description: 'A two-step, route-aware onboarding with Next.js App Router.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="shell">
            <header>
              <Link className="brand" href="/">
                ◈ Orbit <small>NEXT.JS</small>
              </Link>
              <nav aria-label="Main navigation">
                <Link href="/">Overview</Link>
                <Link href="/settings">Settings</Link>
              </nav>
              <StartButton />
            </header>
            <main>{children}</main>
            <footer>Built with Onboarding Kit · Small steps. Great first impressions.</footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
