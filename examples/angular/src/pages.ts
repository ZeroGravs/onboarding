import { Component } from '@angular/core';
import { OnboardingStepDirective } from '@onboarding/angular';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [OnboardingStepDirective],
  template: `
    <section class="card" onboardingStep="welcome" aria-labelledby="welcome-title">
      <p class="eyebrow">Your workspace</p>
      <h2 id="welcome-title">Welcome aboard</h2>
      <p>Keep your projects and preferences in one place.</p>
      <p>Start the onboarding to explore this page and your settings, one step at a time.</p>
    </section>
  `,
})
export class WelcomeComponent {}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [OnboardingStepDirective],
  template: `
    <section class="card" onboardingStep="settings" aria-labelledby="settings-title">
      <p class="eyebrow">Your preferences</p>
      <h2 id="settings-title">Settings</h2>
      <p>Personalize how your workspace looks and feels.</p>
      <label class="preference">
        <input type="checkbox" checked />
        Receive a weekly project summary
      </label>
      <p class="hint">This demo preference stays on this page and does not send any data.</p>
    </section>
  `,
})
export class SettingsComponent {}
