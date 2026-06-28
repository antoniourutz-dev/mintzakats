import { useEffect, useState } from 'react';
import { getAdminPlayerActivity } from '../../services/admin';
import type { ActivityFilter, AdminPlayer, PlayerActivityEntry } from '../../types/admin';
import { formatDuration, formatMadridDateTime } from '../../utils/datetime';
import { cardStyle } from '../../styles';
import { TableSkeleton } from '../Skeleton';

type PlayerActivityPanelProps = {
  player: AdminPlayer | null;
};

const filters: Array<{ id: ActivityFilter; label: string }> = [
  { id: 'current_week', label: 'Aste honetan' },
  { id: 'last_4_weeks', label: 'Azken 4 asteak' },
  { id: 'all', label: 'Historia osoa' },
];

export function PlayerActivityPanel({ player }: PlayerActivityPanelProps) {
  const [filter, setFilter] = useState<ActivityFilter>('current_week');
  const [entries, setEntries] = useState<PlayerActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!player) {
      setEntries([]);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setEntries(await getAdminPlayerActivity(player.id, filter));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ezin izan da jarduera kargatu.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [filter, player]);

  if (!player) {
    return (
      <div className={`${cardStyle} p-6 font-bold text-neutral-600`}>
        Hautatu jokalari bat Jokalariak ataletik jarduera ikusteko.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`${cardStyle} p-4`}>
        <h2 className="text-xl font-black">{player.display_name ?? player.username}</h2>
        <p className="font-bold text-neutral-600">@{player.username}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`border-4 border-neutral-900 px-3 py-2 font-black text-sm ${
              filter === item.id ? 'bg-indigo-500' : 'bg-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="bg-red-100 border-4 border-red-900 p-4 font-bold">{error}</div>
      ) : (
        <div className={`${cardStyle} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-neutral-900 text-white">
                <tr>
                  <th className="p-3 text-xs font-black uppercase">Data</th>
                  <th className="p-3 text-xs font-black uppercase">Egoera</th>
                  <th className="p-3 text-xs font-black uppercase">Emaitza</th>
                  <th className="p-3 text-xs font-black uppercase">Hasiera</th>
                  <th className="p-3 text-xs font-black uppercase">Amaiera</th>
                  <th className="p-3 text-xs font-black uppercase">Denbora</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 font-bold text-neutral-600">
                      Ez dago jarduerarik filtro honetan.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.game_date} className="border-t-4 border-neutral-900">
                      <td className="p-3 font-bold">{entry.game_date}</td>
                      <td className="p-3">
                        {entry.status === 'completed' ? 'Osatuta' : 'Hasita'}
                      </td>
                      <td className="p-3">
                        {entry.score === null ? '—' : `${entry.score} / ${entry.total}`}
                      </td>
                      <td className="p-3">{formatMadridDateTime(entry.started_at)}</td>
                      <td className="p-3">{formatMadridDateTime(entry.completed_at)}</td>
                      <td className="p-3">{formatDuration(entry.duration_seconds)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
