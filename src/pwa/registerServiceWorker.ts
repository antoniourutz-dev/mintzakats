import { registerSW } from 'virtual:pwa-register';

type PwaUpdateListener = () => void;

const updateListeners = new Set<PwaUpdateListener>();

/** Bump when a one-shot rescue is required for clients with a broken SW. */
const PWA_RESCUE_VERSION = 'v3-index-html-precache';

let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null;

export function onPwaUpdateAvailable(listener: PwaUpdateListener): () => void {
  updateListeners.add(listener);
  return () => updateListeners.delete(listener);
}

function notifyUpdateAvailable() {
  updateListeners.forEach((listener) => listener());
}

function logPwaDiagnostics() {
  console.log('[PWA] build version', import.meta.env.VITE_APP_VERSION);
  console.log('[PWA] controller', navigator.serviceWorker?.controller?.scriptURL ?? null);
}

async function runPwaRescueIfNeeded(): Promise<boolean> {
  const rescueKey = `mintzakats_pwa_rescue_${PWA_RESCUE_VERSION}`;
  if (localStorage.getItem(rescueKey)) {
    return false;
  }

  const hadController = Boolean(navigator.serviceWorker?.controller);
  console.log('[PWA] Running one-shot rescue for broken service worker state');

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => /workbox|mintzakats|precache/i.test(name))
          .map((name) => caches.delete(name)),
      );
    }

    localStorage.setItem(rescueKey, '1');
    console.log('[PWA] Rescue completed');

    if (hadController) {
      const lastRescueReload = sessionStorage.getItem('pwa_rescue_reload');
      const now = Date.now();
      if (!lastRescueReload || now - Number.parseInt(lastRescueReload, 10) > 10_000) {
        sessionStorage.setItem('pwa_rescue_reload', now.toString());
        window.location.reload();
        return true;
      }
    }
  } catch (error) {
    console.warn('[PWA] Rescue failed', error);
    localStorage.setItem(rescueKey, '1');
  }

  return false;
}

export async function applyPwaUpdate(): Promise<void> {
  if (!updateServiceWorker) {
    return;
  }

  sessionStorage.setItem('pwa_user_confirmed_update', '1');
  await updateServiceWorker(true);
}

export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  if (await runPwaRescueIfNeeded()) {
    return;
  }

  logPwaDiagnostics();

  updateServiceWorker = registerSW({
    immediate: true,
    onRegistered(registration) {
      console.log('[PWA] Service worker registered', {
        scope: registration?.scope,
        version: import.meta.env.VITE_APP_VERSION,
      });
      logPwaDiagnostics();

      if (!registration) {
        return;
      }

      const checkForUpdates = () => {
        void registration.update().catch((error) => {
          console.warn('[PWA] Update check failed', error);
        });
      };

      window.addEventListener('focus', checkForUpdates);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkForUpdates();
        }
      });

      window.setInterval(checkForUpdates, 60 * 60 * 1000);
    },
    onNeedRefresh() {
      console.log('[PWA] Update available');
      notifyUpdateAvailable();
    },
    onOfflineReady() {
      console.log('[PWA] Offline ready');
    },
    onRegisterError(error) {
      console.error('[PWA] Service worker registration failed', error);
    },
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const userConfirmed = sessionStorage.getItem('pwa_user_confirmed_update');
    if (!userConfirmed) {
      return;
    }

    const lastReload = sessionStorage.getItem('pwa_update_reload');
    const now = Date.now();
    if (lastReload && now - Number.parseInt(lastReload, 10) < 10_000) {
      return;
    }

    sessionStorage.setItem('pwa_update_reload', now.toString());
    sessionStorage.removeItem('pwa_user_confirmed_update');
    window.location.reload();
  });
}
