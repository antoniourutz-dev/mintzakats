import { useEffect, useState } from 'react';
import { applyPwaUpdate, onPwaUpdateAvailable } from '../pwa/registerServiceWorker';
import { APP_VERSION } from '../utils/buildInfo';
import { buttonBaseStyle } from '../styles';

export function PwaUpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => onPwaUpdateAvailable(() => setUpdateAvailable(true)), []);

  if (!updateAvailable) {
    if (!import.meta.env.DEV) {
      return null;
    }

    return (
      <p className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-2 z-30 text-[10px] font-mono bg-neutral-200 border-2 border-neutral-900 px-2 py-1">
        build {APP_VERSION}
      </p>
    );
  }

  return (
    <div
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-2 right-2 z-50 max-w-lg mx-auto"
      role="status"
    >
      <div className="bg-indigo-100 border-4 border-neutral-900 p-4 shadow-[6px_6px_0_0_rgba(23,23,23,1)] flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <p className="font-bold text-sm">Bertsio berria prest dago.</p>
        <button
          type="button"
          disabled={applying}
          onClick={() => {
            setApplying(true);
            void applyPwaUpdate();
          }}
          className={`${buttonBaseStyle} bg-indigo-500 text-sm py-2 px-4 whitespace-nowrap disabled:opacity-60`}
        >
          {applying ? 'Eguneratzen...' : 'Eguneratu'}
        </button>
      </div>
    </div>
  );
}
