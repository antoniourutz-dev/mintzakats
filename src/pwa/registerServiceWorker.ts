type PwaUpdateListener = () => void;

/** PWA registration is disabled during the rescue release. */
export function onPwaUpdateAvailable(_listener: PwaUpdateListener): () => void {
  return () => {};
}

export async function applyPwaUpdate(): Promise<void> {
  return;
}

export async function registerServiceWorker(): Promise<void> {
  return;
}
