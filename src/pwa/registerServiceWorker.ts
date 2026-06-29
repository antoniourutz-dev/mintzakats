type PwaUpdateListener = () => void;

const updateListeners = new Set<PwaUpdateListener>();

export function onPwaUpdateAvailable(listener: PwaUpdateListener): () => void {
  updateListeners.add(listener);
  return () => updateListeners.delete(listener);
}

function notifyUpdateAvailable() {
  updateListeners.forEach((listener) => listener());
}

export async function applyPwaUpdate(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration();
  const waiting = registration?.waiting;
  if (!waiting) {
    window.location.reload();
    return;
  }

  waiting.postMessage({ type: 'SKIP_WAITING' });
}

export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      updateViaCache: 'none',
    });

    console.log('[PWA] Service worker registered', {
      scope: registration.scope,
      version: import.meta.env.VITE_BUILD_VERSION,
    });

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) {
        return;
      }

      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[PWA] Update available');
          notifyUpdateAvailable();
        }

        if (installing.state === 'activated') {
          console.log('[PWA] New service worker activated');
        }
      });
    });

    if (registration.waiting && navigator.serviceWorker.controller) {
      console.log('[PWA] Update available');
      notifyUpdateAvailable();
    }

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SW_ACTIVATED') {
        console.log('[PWA] New service worker activated');
      }
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) {
        return;
      }
      refreshing = true;
      window.location.reload();
    });

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
  } catch (error) {
    console.error('[PWA] Service worker registration failed', error);
  }
}
