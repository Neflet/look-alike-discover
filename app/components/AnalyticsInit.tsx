// components/AnalyticsInit.tsx
'use client';

import { useEffect } from 'react';
import { initPostHog, track } from '@/lib/posthog';

export default function AnalyticsInit() {
  useEffect(() => {
    initPostHog();
    track('app_open', { env: 'production' });  // first event
  }, []);
  return null;
}

