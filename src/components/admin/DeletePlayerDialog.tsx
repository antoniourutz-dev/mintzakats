import { useState } from 'react';
import { Dialog } from './Dialog';
import { buttonBaseStyle, inputStyle } from '../../styles';
import type { AdminPlayer } from '../../types/admin';

type DeletePlayerDialogProps = {
  open: boolean;
  player: AdminPlayer | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function DeletePlayerDialog({ open, player, onClose, onConfirm }: DeletePlayerDialogProps) {
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expected = player?.username ?? '';
  const canConfirm = confirmation.trim().toLowerCase() === expected.toLowerCase();

  const handleClose = () => {
    setConfirmation('');
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!canConfirm) {
      setError('Idatzi alias zehatza berresteko.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onConfirm();
      setConfirmation('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ezin izan da jokalaria ezabatu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} title="Ezabatu jokalaria" onClose={handleClose}>
      <p className="font-bold mb-4">
        <strong>{player?.username}</strong> ezabatuko da. Sarrera, profila eta lotutako aurrerapena
        kenduko dira.
      </p>
      <label className="block font-bold mb-4">
        Idatzi <strong>{expected}</strong> berresteko
        <input
          type="text"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className={`${inputStyle} mt-2`}
          autoComplete="off"
        />
      </label>
      {error && (
        <div className="bg-red-100 border-4 border-red-900 p-3 mb-4 font-bold text-sm" role="alert">
          {error}
        </div>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={handleClose} className={`${buttonBaseStyle} flex-1`}>
          Utzi
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={loading || !canConfirm}
          className={`${buttonBaseStyle} bg-red-400 flex-1 disabled:opacity-60`}
        >
          {loading ? 'EZABATZEN...' : 'Berretsi ezabaketa'}
        </button>
      </div>
    </Dialog>
  );
}

type ResetPasswordDialogProps = {
  open: boolean;
  player: AdminPlayer | null;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
};

export function ResetPasswordDialog({
  open,
  player,
  onClose,
  onConfirm,
}: ResetPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      await onConfirm(password);
      onClose();
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ezin izan da pasahitza berrezarri.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} title="Berrezarri pasahitza" onClose={onClose}>
      <p className="font-bold mb-4">{player?.username} erabiltzailearentzat</p>
      <label className="block font-bold mb-4">
        Aldi baterako pasahitza
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={`${inputStyle} mt-2`}
          minLength={8}
          required
        />
      </label>
      {error && (
        <div className="bg-red-100 border-4 border-red-900 p-3 mb-4 font-bold text-sm" role="alert">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={() => void handleConfirm()}
        disabled={loading || password.length < 8}
        className={`${buttonBaseStyle} bg-indigo-500 w-full disabled:opacity-60`}
      >
        {loading ? 'GORDETZEN...' : 'Berrezarri'}
      </button>
    </Dialog>
  );
}
