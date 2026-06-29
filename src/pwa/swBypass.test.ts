import { describe, expect, it } from 'vitest';

function shouldBypassServiceWorker(input: {
  method: string;
  url: string;
  authorization?: string | null;
}) {
  if (input.method !== 'GET') {
    return true;
  }

  if (input.authorization) {
    return true;
  }

  const url = new URL(input.url);

  if (url.hostname.endsWith('.supabase.co')) {
    return true;
  }

  if (
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/auth/v1/') ||
    url.pathname.includes('/functions/v1/') ||
    url.pathname.includes('/realtime/v1/')
  ) {
    return true;
  }

  return false;
}

describe('service worker bypass rules', () => {
  it('bypassean du Supabase REST eta Auth', () => {
    expect(
      shouldBypassServiceWorker({
        method: 'GET',
        url: 'https://abc.supabase.co/rest/v1/profiles',
      }),
    ).toBe(true);

    expect(
      shouldBypassServiceWorker({
        method: 'POST',
        url: 'https://abc.supabase.co/auth/v1/token',
      }),
    ).toBe(true);
  });

  it('bypassean du POST eta Authorization', () => {
    expect(
      shouldBypassServiceWorker({
        method: 'POST',
        url: 'https://mintzakats.app/api',
      }),
    ).toBe(true);

    expect(
      shouldBypassServiceWorker({
        method: 'GET',
        url: 'https://mintzakats.app/',
        authorization: 'Bearer token',
      }),
    ).toBe(true);
  });

  it('ez bypass egiten du asset estatikoak', () => {
    expect(
      shouldBypassServiceWorker({
        method: 'GET',
        url: 'https://mintzakats.app/assets/index-abc123.js',
      }),
    ).toBe(false);
  });
});
