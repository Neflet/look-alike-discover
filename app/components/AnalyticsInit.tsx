// components/AnalyticsInit.tsx
'use client';

import { useEffect } from 'react';
import { initPostHog } from '@/lib/posthog';

export default function AnalyticsInit() {
  useEffect(() => {
    initPostHog();
  }, []);
  return null;
}

