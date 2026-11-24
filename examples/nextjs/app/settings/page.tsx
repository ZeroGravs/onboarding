'use client';

import { useState } from 'react';

export default function Settings() {
  const [saved, setSaved] = useState(false);
  return (
    <>
      <p className="eyebrow">A SPACE THAT FEELS LIKE YOU</p>
      <h1>
        Your workspace.
        <br />
        <span>Your way.</span>
      </h1>
      <p className="intro">Small preferences make a big difference.</p>
      <section className="card featured" data-onboarding="settings">
        <span className="badge">WORKSPACE PREFERENCES</span>
        <h2>The details are yours</h2>
        <label className="field">
          Workspace name
          <input defaultValue="My Orbit" />
        </label>
        <label className="check">
          <input type="checkbox" defaultChecked /> Send me a weekly progress digest
        </label>
        <button className="primary" onClick={() => setSaved(true)}>
          Save changes
        </button>
        <p role="status">
          {saved ? 'Preferences saved. Looking good!' : 'You can change these anytime.'}
        </p>
      </section>
    </>
  );
}
