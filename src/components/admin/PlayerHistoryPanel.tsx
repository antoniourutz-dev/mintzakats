import { useCallback, useEffect, useState } from 'react';
import {
  getAdminPlayerHistory,
  resetTodayRankedGame,
} from '../../services/admin';
import type { AdminPlayer, PlayerHistoryEntry } from '../../types/admin';
import { formatDuration, formatGameDate, formatMadridTime } from '../../utils/datetime';
import { cardStyle, buttonBaseStyle } from '../../styles';
import { TableSkeleton } from '../Skeleton';
import { ResetTodayDialog } from './ResetTodayDialog';
import { PlayerProgressDebugPanel } from './PlayerProgressDebugPanel';

type PlayerHistoryPanelProps = {
  player: AdminPlayer | null;
  onPlayersChanged?: () => void;
};

export function PlayerHistoryPanel({ player, onPlayersChanged }: PlayerHistoryPanelProps) {
  const [entries, setEntries] = useState<PlayerHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const load = useCallback(async () => {
    if (!player) {
      setEntries([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setEntries(await getAdminPlayerHistory(player.id, 60));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ezin izan da historia kargatu.');
    } finally {
      setLoading(false);
    }
  }, [player]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!player) {
    return (
      <div className={`${cardStyle} p-6 font-bold text-neutral-600`}>
        Hautatu jokalari bat Jokalariak ataletik historia ikusteko.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div className="bg-green-100 border-4 border-green-800 p-3 font-bold" role="status">
          {feedback}
        </div>
      )}

      <div className={`${cardStyle} p-4`}>
        <h2 className="text-xl font-black">{player.display_name ?? player.username}</h2>
        <p className="font-bold text-neutral-600">@{player.username}</p>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="space-y-4">
          <div className="bg-red-100 border-4 border-red-900 p-4 font-bold">{error}</div>
          <button type="button" onClick={() => void load()} className={`${buttonBaseStyle} w-full`}>
            Saiatu berriro
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {entries.length === 0 ? (
              <p className="font-bold text-neutral-600">Ez dago historiarik jokalari honentzat.</p>
            ) : (
              entries.map((entry) => (
                <article
                  key={`${entry.game_date}-${entry.started_at ?? 'x'}`}
                  className={`${cardStyle} p-4 space-y-2`}
                >
                  <p className="font-bold">{formatGameDate(entry.game_date)}</p>
                  <p className="text-sm">
                    {entry.status === 'completed' ? 'Osatuta' : 'Hasita'} ·{' '}
                    {entry.score === null ? '—' : `${entry.score} / ${entry.total}`}
                  </p>
                  <p className="text-sm break-anywhere">
                    Hasiera: {formatMadridTime(entry.started_at)} · Amaiera:{' '}
                    {formatMadridTime(entry.completed_at)}
                  </p>
                  <p className="text-sm">Denbora: {formatDuration(entry.duration_seconds)}</p>
                  {entry.resettable_today && (
                    <button
                      type="button"
                      onClick={() => setResetOpen(true)}
                      className="border-4 border-neutral-900 px-2 py-1 text-xs font-black bg-yellow-300 w-full"
                    >
                      Berrezarri
                    </button>
                  )}
                </article>
              ))
            )}
          </div>

          <div className={`${cardStyle} overflow-hidden hidden md:block`}>
            <table className="w-full text-left">
              <thead className="bg-neutral-900 text-white">
                <tr>
                  <th className="p-3 text-xs font-black uppercase">Data</th>
                  <th className="p-3 text-xs font-black uppercase">Egoera</th>
                  <th className="p-3 text-xs font-black uppercase">Emaitza</th>
                  <th className="p-3 text-xs font-black uppercase">Hasiera</th>
                  <th className="p-3 text-xs font-black uppercase">Amaiera</th>
                  <th className="p-3 text-xs font-black uppercase">Denbora</th>
                  <th className="p-3 text-xs font-black uppercase">Ekintzak</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 font-bold text-neutral-600">
                      Ez dago historiarik jokalari honentzat.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={`${entry.game_date}-${entry.started_at ?? 'x'}`} className="border-t-4 border-neutral-900">
                      <td className="p-3 font-bold">{formatGameDate(entry.game_date)}</td>
                      <td className="p-3">
                        {entry.status === 'completed' ? 'Osatuta' : 'Hasita'}
                      </td>
                      <td className="p-3">
                        {entry.score === null ? '—' : `${entry.score} / ${entry.total}`}
                      </td>
                      <td className="p-3">{formatMadridTime(entry.started_at)}</td>
                      <td className="p-3">{formatMadridTime(entry.completed_at)}</td>
                      <td className="p-3">{formatDuration(entry.duration_seconds)}</td>
                      <td className="p-3">
                        {entry.resettable_today ? (
                          <button
                            type="button"
                            onClick={() => setResetOpen(true)}
                            className="border-4 border-neutral-900 px-2 py-1 text-xs font-black bg-yellow-300"
                          >
                            Berrezarri
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <PlayerProgressDebugPanel player={player} />

      <ResetTodayDialog
        open={resetOpen}
        player={player}
        onClose={() => setResetOpen(false)}
        onConfirm={async () => {
          if (!player) return;
          await resetTodayRankedGame(player.id);
          setFeedback('Gaurko partida berrezarri da.');
          await load();
          onPlayersChanged?.();
        }}
      />
    </div>
  );
}
