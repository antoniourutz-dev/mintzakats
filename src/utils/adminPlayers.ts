import type { AdminPlayer, PlayerListFilter } from '../types/admin';
import { getMadridTodayDate, isWithinLastDays, playedOnMadridDate } from './datetime';

export function filterAdminPlayers(
  players: AdminPlayer[],
  filter: PlayerListFilter,
  search: string,
): AdminPlayer[] {
  const query = search.trim().toLowerCase();
  const today = getMadridTodayDate();

  return players.filter((player) => {
    if (query) {
      const haystack = `${player.username} ${player.display_name ?? ''}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    switch (filter) {
      case 'active_this_week':
        return isWithinLastDays(player.last_played_at, 7);
      case 'not_played_today':
        return !playedOnMadridDate(player.last_played_at, today);
      case 'never_played':
        return player.official_runs_started === 0 || !player.last_played_at;
      case 'hidden_from_ranking':
        return !player.leaderboard_opt_in;
      default:
        return true;
    }
  });
}

export function exportPlayersCsv(players: AdminPlayer[]): string {
  const header = [
    'username',
    'display_name',
    'leaderboard_opt_in',
    'official_runs_started',
    'official_days_completed',
    'total_points',
    'last_played_at',
  ];

  const rows = players.map((player) => [
    player.username,
    player.display_name ?? '',
    player.leaderboard_opt_in ? 'true' : 'false',
    String(player.official_runs_started),
    String(player.official_days_completed),
    String(player.total_points),
    player.last_played_at ?? '',
  ]);

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
