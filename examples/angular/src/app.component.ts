import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { OnboardingService } from '@onboarding/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="shell">
      <header>
        <p class="eyebrow">Onboarding Kit / Angular</p>
        <h1>A helpful first visit</h1>
        <p>A small standalone app with a onboarding that follows you between routes.</p>
        <nav aria-label="Main navigation">
          <a
            routerLink="/"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            ariaCurrentWhenActive="page"
            >Overview</a
          >
          <a routerLink="/settings" routerLinkActive="active" ariaCurrentWhenActive="page">
            Settings
          </a>
        </nav>
      </header>
      <main id="main-content">
        <div class="toolbar">
          <button type="button" (click)="start()" [disabled]="busy()">Start onboarding</button>
          <p aria-live="polite" role="status">
            @if (onboarding.state().status === 'completed') {
              All done! You can start again at any time.
            } @else if (onboarding.state().status === 'running') {
              Step {{ onboarding.state().stepIndex + 1 }} of {{ onboarding.state().totalSteps }}
            } @else {
              {{ error() || 'Use Next and Back in the onboarding, or Escape to dismiss it.' }}
            }
          </p>
        </div>
        <router-outlet />
      </main>
      <footer>
        Progress is stored only in this browser. Start again to resume an unfinished tour.
      </footer>
    </div>
  `,
})
export class AppComponent {
  readonly onboarding = inject(OnboardingService);
  readonly busy = signal(false);
  readonly error = signal('');

  async start(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.onboarding.start('onboarding');
    } catch {
      this.error.set('The onboarding could not start. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
