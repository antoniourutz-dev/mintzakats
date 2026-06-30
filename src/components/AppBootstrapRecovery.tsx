import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  RECOVERY_ATTEMPT_KEY,
  recoverMintzakatsClient,
} from '../utils/recoverClient';
import { buttonBaseStyle } from '../styles';

type AppBootstrapRecoveryProps = {
  onRequestSignIn: () => void;
};

export function AppBootstrapRecovery({ onRequestSignIn }: AppBootstrapRecoveryProps) {
  const { bootstrapError, localSignOut } = useAuth();
  const [recovering, setRecovering] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [recoverError, setRecoverError] = useState<string | null>(null);

  const handleRecover = useCallback(async () => {
    setRecoverError(null);
    setRecovering(true);

    try {
      await recoverMintzakatsClient();
    } catch (error) {
      console.log('[RECOVERY] bootstrap failed', error);
      setRecoverError(
        error instanceof Error ? error.message : 'Ezin izan da aplikazioa berreskuratu.',
      );
      setRecovering(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setRecoverError(null);
    setSigningOut(true);

    try {
      await localSignOut();
      onRequestSignIn();
    } finally {
      setSigningOut(false);
    }
  }, [localSignOut, onRequestSignIn]);

  useEffect(() => {
    if (sessionStorage.getItem(RECOVERY_ATTEMPT_KEY) === '1') {
      return;
    }

    const timer = window.setTimeout(() => {
      void handleRecover();
    }, 1_000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [handleRecover]);

  const busy = recovering || signingOut;

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="bg-red-100 border-4 border-red-900 p-6 max-w-lg w-full text-center space-y-4">
        <p className="font-bold">Ezin izan da aplikazioa kargatu.</p>
        {import.meta.env.DEV && bootstrapError && (
          <p className="text-xs font-mono text-left break-all">{bootstrapError}</p>
        )}
        {recoverError && <p className="text-sm">{recoverError}</p>}
        <button
          type="button"
          onClick={() => void handleRecover()}
          disabled={busy}
          className={`${buttonBaseStyle} w-full disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {recovering ? 'Berreskuratzen...' : 'Saiatu berriro'}
        </button>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={busy}
          className={`${buttonBaseStyle} w-full bg-white disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {signingOut ? 'Itxitzen...' : 'Saioa itxi'}
        </button>
      </div>
    </div>
  );
}
