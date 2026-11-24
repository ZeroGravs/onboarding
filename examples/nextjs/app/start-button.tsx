'use client';

import { useOnboarding } from '@zero-lab/onboarding-react';

export function StartButton() {
  const { kit } = useOnboarding();
  return (
    <button className="primary" onClick={() => void kit.start('onboarding')}>
      Start onboarding
    </button>
  );
}
