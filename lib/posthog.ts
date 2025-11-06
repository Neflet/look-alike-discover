// lib/posthog.ts
import posthog from 'posthog-js';

declare global {
  interface Window { __PH_INITIALIZED__?: boolean; posthog?: typeof posthog }
}

const isBrowser = typeof window !== 'undefined';
const isProd = process.env.NODE_ENV === 'production';
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com';

export function initPostHog() {
  if (!isBrowser) return;
  if (!isProd) return;                  // disable in dev
  if (!key) return;                     // no key → no-op
  if (window.__PH_INITIALIZED__) return;

  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    capture_pageleave: true,
    person_profiles: 'identified_only',
    autocapture: false,                 // we'll track explicitly
  });

  window.__PH_INITIALIZED__ = true;
}

export function track(event: string, props?: Record<string, any>) {
  if (!isBrowser) return;
  try {
    posthog.capture(event, props);
  } catch {
    // swallow errors to avoid impacting UX
  }
}

