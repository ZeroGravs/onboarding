import type { NextConfig } from 'next';

const config: NextConfig = {
  distDir: process.env.ONBOARDING_VERIFY === '1' ? '.next-verification' : '.next',
};

export default config;
