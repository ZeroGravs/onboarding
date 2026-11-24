import type { Routes } from '@angular/router';
import { SettingsComponent, WelcomeComponent } from './pages';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: WelcomeComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: '' },
];
