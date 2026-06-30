import { useMemo } from 'react';
import {
  formatGameStatus,
  formatTodayStatus,
} from '../services/progress';
import { useAuth } from '../contexts/AuthContext';
import { useMyProgress } from '../hooks/useAppQueries';
import { useLoadingTimeout } from '../hooks/useLoadingTimeout';
import { formatGameDate, formatMadridDateTime } from '../utils/datetime';
import { buttonBaseStyle, cardStyle } from '../styles';
import { PanelSkeleton } from './Skeleton';

type ProgressPanelProps = {
  onRequireAuth: () => void;
};

export function ProgressPanel({ onRequireAuth }: ProgressPanelProps) {
  const { user, profile } = useAuth();

  const profileIdentity = useMemo(
    () =>
      profile
        ? {
            username: profile.username,
            displayName: profile.display_name,
            leaderboardOptIn: profile.leaderboard_opt_in,
          }
        : null,
    [profile?.username, profile?.display_name, profile?.leaderboard_opt_in],
  );

  const {
    data: progress,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useMyProgress(profileIdentity, user?.id);

  const loadingTimedOut = useLoadingTimeout(loading);

  if (!user) {
    return (
      <div className={`${cardStyle} p-6 text-center`}>
        <p className="font-bold mb-4">Zure aurrerapena ikusteko saioa hasi behar duzu.</p>
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

  if (loadingTimedOut && !progress) {
    return (
      <div className="space-y-4">
        <div className="bg-red-100 border-4 border-red-900 p-4 font-bold text-center">
          Ezin izan da edukia kargatu.
        </div>
        <button type="button" onClick={() => void refetch()} className={`${buttonBaseStyle} w-full`}>
          Saiatu berriro
        </button>
      </div>
    );
  }

  if (loading) {
    return <PanelSkeleton />;
  }

  const error = queryError instanceof Error ? queryError.message : null;

  if (error || !progress) {
    return (
      <div className="space-y-4">
        <div className="bg-red-100 border-4 border-red-900 p-4 font-bold text-center">
          {error ?? 'Ezin izan da aurrerapena kargatu.'}
        </div>
        <button type="button" onClick={() => void refetch()} className={`${buttonBaseStyle} w-full`}>
          Saiatu berriro
        </button>
      </div>
    );
  }

  const displayName = progress.displayName?.trim() || progress.username;

  const stats = [
    {
      label: 'Aste honetako puntuak',
      value: `${progress.weeklyScore} / ${progress.weeklyMaximum}`,
    },
    {
      label: 'Osatutako egunak',
      value: `${progress.daysCompleted} / 7`,
    },
    {
      label: 'Uneko eguneko erritmoa',
      value: String(progress.currentStreak),
    },
    {
      label: 'Eguneko puntu onena',
      value: progress.bestDailyScore === null ? '—' : `${progress.bestDailyScore} / 20`,
    },
    {
      label: 'Azken jokoa',
      value: progress.lastPlayedAt ? formatMadridDateTime(progress.lastPlayedAt) : '—',
    },
    {
      label: 'Asteko postua',
      value: progress.currentRank === null ? '—' : `#${progress.currentRank}`,
    },
    {
      label: 'Gaurko erronka',
      value: formatTodayStatus(progress.todayStatus),
    },
  ];

  return (
    <div className="space-y-6">
      <header className={`${cardStyle} p-5`}>
        <h1 className="text-2xl font-black uppercase">Nire aurrerapena</h1>
        <p className="text-lg font-bold mt-2">{displayName}</p>
        <p className="text-sm font-bold text-neutral-600 mt-1">@{progress.username}</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`${cardStyle} p-4`}>
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{stat.label}</p>
            <p className="text-2xl font-black mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className={`${cardStyle} p-4`}>
        <h2 className="text-xl font-black mb-4">Azken partidak</h2>
        {progress.recentGames.length === 0 ? (
          <p className="font-bold text-neutral-600">Oraindik ez duzu erronkarik osatu.</p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {progress.recentGames.map((entry) => (
                <article key={entry.gameDate} className="border-4 border-neutral-900 p-3 bg-white">
                  <p className="text-xs font-bold uppercase text-neutral-500">Data</p>
                  <p className="font-bold break-anywhere">{formatGameDate(entry.gameDate)}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm font-bold">
                    <p>Emaitza: {entry.score} / {entry.total}</p>
                    <p>Egoera: {formatGameStatus(entry.status)}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden md:block">
              <table className="w-full text-left">
              <thead>
                <tr className="border-b-4 border-neutral-900">
                  <th className="p-2 text-xs font-black uppercase">Data</th>
                  <th className="p-2 text-xs font-black uppercase text-right">Emaitza</th>
                  <th className="p-2 text-xs font-black uppercase">Egoera</th>
                </tr>
              </thead>
              <tbody>
                {progress.recentGames.map((entry) => (
                  <tr key={entry.gameDate} className="border-t-2 border-neutral-300">
                    <td className="p-2 font-bold">{formatGameDate(entry.gameDate)}</td>
                    <td className="p-2 font-bold text-right">
                      {entry.score} / {entry.total}
                    </td>
                    <td className="p-2 font-bold">{formatGameStatus(entry.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
