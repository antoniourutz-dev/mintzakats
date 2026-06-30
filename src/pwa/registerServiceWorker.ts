import { registerSW } from 'virtual:pwa-register';

type PwaUpdateListener = () => void;

const updateListeners = new Set<PwaUpdateListener>();

let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null;

export function onPwaUpdateAvailable(listener: PwaUpdateListener): () => void {
  updateListeners.add(listener);
  return () => updateListeners.delete(listener);
}

function notifyUpdateAvailable() {
  updateListeners.forEach((listener) => listener());
}

function logPwaDiagnostics() {
  if (import.meta.env.DEV) {
    console.log('[PWA] build version', import.meta.env.VITE_APP_VERSION);
    console.log('[PWA] controller', navigator.serviceWorker?.controller?.scriptURL ?? null);
  }
}

export async function applyPwaUpdate(): Promise<void> {
  if (!updateServiceWorker) {
    return;
  }

  sessionStorage.setItem('pwa_user_confirmed_update', '1');
  await updateServiceWorker(true);
}

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) {
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
