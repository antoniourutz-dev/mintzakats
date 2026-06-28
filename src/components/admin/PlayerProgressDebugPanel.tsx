import { useEffect, useState } from 'react';
import { getAdminPlayerProgressDebug } from '../../services/admin';
import type { AdminPlayer, PlayerProgressDebugEntry } from '../../types/admin';
import { formatGameDate } from '../../utils/datetime';
import { cardStyle } from '../../styles';

type PlayerProgressDebugPanelProps = {
  player: AdminPlayer;
};

export function PlayerProgressDebugPanel({ player }: PlayerProgressDebugPanelProps) {
  const [entries, setEntries] = useState<PlayerProgressDebugEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setEntries(await getAdminPlayerProgressDebug(player.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ezin izan da diagnostikoa kargatu.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [player.id]);

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className={`${cardStyle} p-4 space-y-3 border-dashed border-4 border-neutral-500`}>
      <h3 className="text-sm font-black uppercase">DEV · Aurrerapen diagnostikoa</h3>
      {loading ? (
        <p className="text-sm font-bold">Kargatzen...</p>
      ) : error ? (
        <p className="text-sm font-bold text-red-700">{error}</p>
      ) : entries.length === 0 ? (
        <p className="text-sm font-bold text-neutral-600">Ez dago daturik.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.gameDate} className="border-2 border-neutral-300 p-2 text-xs break-anywhere">
              <p className="font-bold">{formatGameDate(entry.gameDate)}</p>
              <p>Astea: {entry.weekStart ? formatGameDate(entry.weekStart) : '—'}</p>
              <p>Puntuak: {entry.score === null ? '—' : entry.score}</p>
              <p>Egoera: {entry.status}</p>
              <p>Erantzunak: {entry.answersRecorded}</p>
              <p>Aste honetan: {entry.isCurrentWeek ? 'Bai' : 'Ez'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
