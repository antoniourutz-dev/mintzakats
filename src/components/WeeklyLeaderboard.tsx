import { useCallback, useEffect, useState } from 'react';
import {
  displayPlayerName,
  fetchWeeklyLeaderboard,
  formatWeekRange,
  formatWeeklyDays,
  formatWeeklyScore,
  type WeeklyLeaderboard,
} from '../services/leaderboard';
import { useAuth } from '../contexts/AuthContext';
import { buttonBaseStyle, cardStyle } from '../styles';
import { TableSkeleton } from './Skeleton';

type WeeklyLeaderboardProps = {
  onRequireAuth: () => void;
};

export function WeeklyLeaderboard({ onRequireAuth }: WeeklyLeaderboardProps) {
  const { user, profile } = useAuth();
  const [leaderboard, setLeaderboard] = useState<WeeklyLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLeaderboard(await fetchWeeklyLeaderboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ezin izan da sailkapena kargatu.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) {
    return (
      <div className={`${cardStyle} p-6 text-center`}>
        <p className="font-bold mb-4">Asteko sailkapena ikusteko saioa hasi behar duzu.</p>
        <button
          type="button"
          onClick={onRequireAuth}
          className={`${buttonBaseStyle} bg-indigo-500`}
        >
          Hasi saioa
        </button>
      </div>
    );
  }

  if (loading) {
    return <TableSkeleton />;
  }

  if (error || !leaderboard) {
    return (
      <div className="space-y-4">
        <div className="bg-red-100 border-4 border-red-900 p-4 font-bold text-center">{error}</div>
        <button type="button" onClick={() => void load()} className={`${buttonBaseStyle} w-full`}>
          Saiatu berriro
        </button>
      </div>
    );
  }

  const myRow = leaderboard.rows.find((row) => row.isCurrentUser);
  const isHiddenFromRanking = Boolean(profile && !profile.leaderboard_opt_in && !myRow);

  return (
    <div className="space-y-4">
      <header className={`${cardStyle} p-5`}>
        <h1 className="text-2xl font-black uppercase">Asteko sailkapena</h1>
        <p className="text-sm font-bold text-neutral-600 mt-2">
          Astea: <span className="text-neutral-900">{formatWeekRange(leaderboard.weekStart)}</span>
        </p>
      </header>

      {isHiddenFromRanking && (
        <div className="bg-yellow-100 border-4 border-yellow-700 p-4 font-bold text-center">
          Ez zaude sailkapen publikoan.
        </div>
      )}

      <div className={`${cardStyle} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead className="bg-neutral-900 text-white">
              <tr>
                <th className="p-3 font-black uppercase text-xs">#</th>
                <th className="p-3 font-black uppercase text-xs">Jokalaria</th>
                <th className="p-3 font-black uppercase text-xs">Puntuak</th>
                <th className="p-3 font-black uppercase text-xs">Egunak</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 font-bold text-neutral-600">
                    Oraindik ez dago aste honetako sailkapenik.
                  </td>
                </tr>
              ) : (
                leaderboard.rows.map((entry) => (
                  <tr
                    key={`${entry.rank}-${entry.username}`}
                    className={`border-t-4 border-neutral-900 ${
                      entry.isCurrentUser ? 'bg-indigo-100 outline outline-4 outline-indigo-500' : 'bg-white'
                    }`}
                    aria-current={entry.isCurrentUser ? 'true' : undefined}
                  >
                    <td className="p-3 font-black">{entry.rank}</td>
                    <td className="p-3 font-bold">
                      <span>{displayPlayerName(entry)}</span>
                      {entry.isCurrentUser && (
                        <span className="ml-2 inline-block border-2 border-indigo-700 bg-indigo-200 px-2 py-0.5 text-xs font-black uppercase">
                          Zu
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-bold">{formatWeeklyScore(entry.totalScore)}</td>
                    <td className="p-3 font-bold">{formatWeeklyDays(entry.daysCompleted)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
