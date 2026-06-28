import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createPlayer,
  deletePlayer,
  getAdminPlayers,
  resetPlayerPassword,
  updatePlayerProfile,
} from '../../services/admin';
import type { AdminPlayer, PlayerListFilter } from '../../types/admin';
import { downloadCsv, exportPlayersCsv, filterAdminPlayers } from '../../utils/adminPlayers';
import { formatMadridDateTime } from '../../utils/datetime';
import { useAuth } from '../../contexts/AuthContext';
import { cardStyle, buttonBaseStyle, inputStyle } from '../../styles';
import { TableSkeleton } from '../Skeleton';
import { PlayerFormDialog } from './PlayerFormDialog';
import { DeletePlayerDialog, ResetPasswordDialog } from './DeletePlayerDialog';

const filters: Array<{ id: PlayerListFilter; label: string }> = [
  { id: 'all', label: 'Guztiak' },
  { id: 'active_this_week', label: 'Aste honetan aktibo' },
  { id: 'not_played_today', label: 'Gaur jokatu gabe' },
  { id: 'never_played', label: 'Inoiz jokatu gabe' },
  { id: 'hidden_from_ranking', label: 'Rankingetik kanpo' },
];

type PlayersTableProps = {
  onViewHistory: (player: AdminPlayer) => void;
};

export function PlayersTable({ onViewHistory }: PlayersTableProps) {
  const { user } = useAuth();
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [filter, setFilter] = useState<PlayerListFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedPlayer, setSelectedPlayer] = useState<AdminPlayer | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const loadPlayers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setPlayers(await getAdminPlayers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ezin izan dira jokalariak kargatu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlayers();
  }, [loadPlayers]);

  const filteredPlayers = useMemo(
    () => filterAdminPlayers(players, filter, search),
    [filter, players, search],
  );

  const isProtected = (player: AdminPlayer) =>
    player.id === user?.id || player.app_role === 'admin';

  if (loading) return <TableSkeleton />;
  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-100 border-4 border-red-900 p-4 font-bold">{error}</div>
        <button type="button" onClick={() => void loadPlayers()} className={`${buttonBaseStyle} w-full`}>
          Saiatu berriro
        </button>
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setFormMode('create');
            setSelectedPlayer(null);
            setFormOpen(true);
          }}
          className={`${buttonBaseStyle} bg-indigo-500`}
        >
          Sortu jokalaria
        </button>
        <button
          type="button"
          onClick={() => downloadCsv('mintzakats-jokalariak.csv', exportPlayersCsv(filteredPlayers))}
          className={buttonBaseStyle}
        >
          Esportatu CSV
        </button>
      </div>

      <div className={`${cardStyle} p-4 space-y-4`}>
        <label className="block font-bold">
          Bilatu alias edo izenaren arabera
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={`${inputStyle} mt-2`}
          />
        </label>
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
      </div>

      <div className={`${cardStyle} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left">
            <thead className="bg-neutral-900 text-white">
              <tr>
                <th className="p-3 text-xs font-black uppercase">Alias</th>
                <th className="p-3 text-xs font-black uppercase">Izena</th>
                <th className="p-3 text-xs font-black uppercase">Ranking</th>
                <th className="p-3 text-xs font-black uppercase">Hasieratuak</th>
                <th className="p-3 text-xs font-black uppercase">Egunak</th>
                <th className="p-3 text-xs font-black uppercase">Puntuak</th>
                <th className="p-3 text-xs font-black uppercase">Azken jokoa</th>
                <th className="p-3 text-xs font-black uppercase">Ekintzak</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 font-bold text-neutral-600">
                    Ez dago jokalaririk filtro honetan.
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => (
                  <tr key={player.id} className="border-t-4 border-neutral-900">
                    <td className="p-3 font-bold">{player.username}</td>
                    <td className="p-3">{player.display_name ?? '—'}</td>
                    <td className="p-3">{player.leaderboard_opt_in ? 'Bai' : 'Ez'}</td>
                    <td className="p-3">{player.official_runs_started}</td>
                    <td className="p-3">{player.official_days_completed}</td>
                    <td className="p-3">{player.total_points}</td>
                    <td className="p-3">{formatMadridDateTime(player.last_played_at)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onViewHistory(player)}
                          className="border-4 border-neutral-900 px-2 py-1 text-xs font-black bg-white"
                        >
                          Ikusi historia
                        </button>
                        <button
                          type="button"
                          disabled={isProtected(player)}
                          onClick={() => {
                            setSelectedPlayer(player);
                            setFormMode('edit');
                            setFormOpen(true);
                          }}
                          className="border-4 border-neutral-900 px-2 py-1 text-xs font-black bg-white disabled:opacity-40"
                        >
                          Editatu
                        </button>
                        <button
                          type="button"
                          disabled={isProtected(player)}
                          onClick={() => {
                            setSelectedPlayer(player);
                            setResetOpen(true);
                          }}
                          className="border-4 border-neutral-900 px-2 py-1 text-xs font-black bg-white disabled:opacity-40"
                        >
                          Pasahitza
                        </button>
                        <button
                          type="button"
                          disabled={isProtected(player)}
                          onClick={() => {
                            setSelectedPlayer(player);
                            setDeleteOpen(true);
                          }}
                          className="border-4 border-neutral-900 px-2 py-1 text-xs font-black bg-red-300 disabled:opacity-40"
                        >
                          Ezabatu
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PlayerFormDialog
        open={formOpen}
        mode={formMode}
        player={selectedPlayer}
        onClose={() => setFormOpen(false)}
        onSubmit={async (values) => {
          if (formMode === 'create') {
            await createPlayer({
              username: values.username,
              displayName: values.displayName,
              temporaryPassword: values.temporaryPassword ?? '',
            });
            setFeedback('Jokalaria sortu da.');
          } else if (selectedPlayer) {
            await updatePlayerProfile({
              playerId: selectedPlayer.id,
              username: values.username,
              displayName: values.displayName ?? null,
              leaderboardOptIn: values.leaderboardOptIn,
            });
            setFeedback('Profila eguneratu da.');
          }
          await loadPlayers();
        }}
      />

      <DeletePlayerDialog
        open={deleteOpen}
        player={selectedPlayer}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          if (!selectedPlayer) return;
          await deletePlayer(selectedPlayer.id);
          setFeedback('Jokalaria ezabatu da.');
          await loadPlayers();
        }}
      />

      <ResetPasswordDialog
        open={resetOpen}
        player={selectedPlayer}
        onClose={() => setResetOpen(false)}
        onConfirm={async (password) => {
          if (!selectedPlayer) return;
          await resetPlayerPassword(selectedPlayer.id, password);
          setFeedback('Pasahitza berrezarri da.');
        }}
      />
    </div>
  );
}
