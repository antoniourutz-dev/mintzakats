import { useEffect, useState, type FormEvent } from 'react';
import { Dialog } from './Dialog';
import { inputStyle, buttonBaseStyle } from '../../styles';
import { isValidUsername } from '../../utils/username';
import type { AdminPlayer } from '../../types/admin';

type PlayerFormDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  player?: AdminPlayer | null;
  onClose: () => void;
  onSubmit: (values: {
    username: string;
    displayName?: string;
    temporaryPassword?: string;
    leaderboardOptIn?: boolean;
  }) => Promise<void>;
};

export function PlayerFormDialog({
  open,
  mode,
  player,
  onClose,
  onSubmit,
}: PlayerFormDialogProps) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUsername(player?.username ?? '');
    setDisplayName(player?.display_name ?? '');
    setPassword('');
    setLeaderboardOptIn(player?.leaderboard_opt_in ?? true);
    setError(null);
  }, [open, player]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValidUsername(username)) {
      setError('Erabiltzaile-izenak 3-24 karaktere izan behar ditu (A-Z, 0-9, _, -).');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit({
        username,
        displayName,
        temporaryPassword: mode === 'create' ? password : undefined,
        leaderboardOptIn,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore bat gertatu da.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      title={mode === 'create' ? 'Sortu jokalaria' : 'Editatu jokalaria'}
      onClose={onClose}
    >
      {error && (
        <div className="bg-red-100 border-4 border-red-900 p-3 mb-4 font-bold text-sm" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <label className="block font-bold">
          Erabiltzaile-izena
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={`${inputStyle} mt-2`}
            placeholder="adib. ikasle006"
            pattern="[A-Za-z0-9_-]{3,24}"
            required
          />
        </label>
        <label className="block font-bold">
          Izena (aukerakoa)
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className={`${inputStyle} mt-2`}
          />
        </label>
        {mode === 'create' && (
          <label className="block font-bold">
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
        )}
        {mode === 'edit' && (
          <label className="flex items-center gap-3 font-bold">
            <input
              type="checkbox"
              checked={leaderboardOptIn}
              onChange={(event) => setLeaderboardOptIn(event.target.checked)}
              className="w-5 h-5 border-4 border-neutral-900"
            />
            Sailkapen publikoan agertu
          </label>
        )}
        <button
          type="submit"
          disabled={loading}
          className={`${buttonBaseStyle} bg-indigo-500 w-full disabled:opacity-60`}
        >
          {loading ? 'GORDETZEN...' : 'Gorde'}
        </button>
      </form>
    </Dialog>
  );
}
