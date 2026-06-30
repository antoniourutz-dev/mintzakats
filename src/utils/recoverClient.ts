export const RECOVERY_ATTEMPT_KEY = 'mintzakats-client-recovery-attempted';

export async function recoverMintzakatsClient(): Promise<void> {
  const recoveryKey = RECOVERY_ATTEMPT_KEY;

  if (sessionStorage.getItem(recoveryKey) === '1') {
    throw new Error('Berreskuratze automatikoak ez du arazoa konpondu.');
  }

  sessionStorage.setItem(recoveryKey, '1');

  if ('serviceWorker' in navigator) {
    console.log('[RECOVERY] unregistering service workers');
    const registrations = await navigator.serviceWorker.getRegistrations();

    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    console.log('[RECOVERY] deleting app caches');
    const cacheKeys = await caches.keys();

    await Promise.all(
      cacheKeys
        .filter((key) => /mintzakats|workbox|vite-pwa/i.test(key))
        .map((key) => caches.delete(key)),
    );
  }

  console.log('[RECOVERY] reloading');
  const url = new URL(window.location.href);
  url.searchParams.set('recovered', Date.now().toString());

  window.location.replace(url.toString());
}

export function clearRecoveryFlag(): void {
  sessionStorage.removeItem(RECOVERY_ATTEMPT_KEY);
}
