import { useState } from 'react';
import { Dialog } from './Dialog';
import { buttonBaseStyle } from '../../styles';
import type { AdminPlayer } from '../../types/admin';

type ResetTodayDialogProps = {
  open: boolean;
  player: AdminPlayer | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function ResetTodayDialog({ open, player, onClose, onConfirm }: ResetTodayDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ezin izan da partida berrezarri.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} title="Berrezarri gaurko partida" onClose={onClose}>
      <p className="font-bold mb-4">
        Gaurko partida eta haren erantzunak ezabatuko dira. Jokalariak gaurko erronka berriro egin
        ahal izango du.
      </p>
      <p className="font-bold mb-4 text-neutral-700">Jokalaria: {player?.username}</p>
      {error && (
        <div className="bg-red-100 border-4 border-red-900 p-3 mb-4 font-bold text-sm" role="alert">
          {error}
        </div>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className={`${buttonBaseStyle} flex-1`}>
          Utzi
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={loading}
          className={`${buttonBaseStyle} bg-yellow-300 flex-1 disabled:opacity-60`}
        >
          {loading ? 'BERREZARTZEN...' : 'Berretsi berrezarpena'}
        </button>
      </div>
    </Dialog>
  );
}
