export function shouldBypassServiceWorker(input: {
  method: string;
  url: string;
  authorization?: string | null;
}): boolean {
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
