import { supabase } from './supabase';
import { getGameDayInfo } from './dailySchedule';

export type WeeklyLeaderboardRow = {
  rank: number;
  username: string;
  displayName: string | null;
  totalScore: number;
  daysCompleted: number;
  isCurrentUser?: boolean;
};

export type WeeklyLeaderboard = {
  weekStart: string;
  rows: WeeklyLeaderboardRow[];
};

const WEEKLY_MAXIMUM = 140;

function mapSupabaseError(error: { message: string; code?: string }) {
  if (error.code === 'PGRST301' || error.message.toLowerCase().includes('jwt')) {
    return new Error('Saioa iraungi da. Hasi saioa berriro.');
  }
  if (error.message.toLowerCase().includes('not authenticated')) {
    return new Error('Saioa hasi behar duzu sailkapena ikusteko.');
  }
  return new Error(error.message);
}

export function normalizeWeeklyLeaderboard(data: unknown): WeeklyLeaderboardRow[] | null {
  if (data == null) return [];

  if (!Array.isArray(data)) {
    console.error('Invalid leaderboard response: expected array', data);
    return null;
  }

  if (data.length === 0) {
    return [];
  }

  const rows: WeeklyLeaderboardRow[] = [];

  for (const row of data) {
    if (
      !row ||
      typeof row !== 'object' ||
      typeof (row as Record<string, unknown>).rank !== 'number' ||
      typeof (row as Record<string, unknown>).username !== 'string' ||
      typeof (row as Record<string, unknown>).total_score !== 'number' ||
      typeof (row as Record<string, unknown>).days_completed !== 'number'
    ) {
      console.error('Invalid leaderboard row', row);
      return null;
    }

    const raw = row as Record<string, unknown>;

    rows.push({
      rank: raw.rank as number,
      username: raw.username as string,
      displayName:
        typeof raw.display_name === 'string'
          ? raw.display_name
          : null,
      totalScore: raw.total_score as number,
      daysCompleted: raw.days_completed as number,
      isCurrentUser: raw.is_current_user === true,
    });
  }

  return rows;
}

export function getCurrentWeekStart(): string {
  const { gameDate, dayInCycle } = getGameDayInfo();
  const date = new Date(`${gameDate}T12:00:00`);
  date.setDate(date.getDate() - dayInCycle);
  return date.toISOString().slice(0, 10);
}

export async function fetchWeeklyLeaderboard(
  weekStart?: string | null,
): Promise<WeeklyLeaderboard> {
  const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
    p_week_start: weekStart ?? null,
  });

  console.log('get_weekly_leaderboard raw response', { data, error });

  if (error) {
    throw mapSupabaseError(error);
  }

  const rows = normalizeWeeklyLeaderboard(data ?? []);

  if (rows === null) {
    throw new Error('Erantzun baliogabea zerbitzaritik.');
  }

  return {
    weekStart: weekStart ?? getCurrentWeekStart(),
    rows,
  };
}

export function displayPlayerName(row: Pick<WeeklyLeaderboardRow, 'username' | 'displayName'>): string {
  return row.displayName?.trim() || row.username;
}

export function formatWeeklyScore(score: number): string {
  return `${score} / ${WEEKLY_MAXIMUM}`;
}

export function formatWeeklyDays(days: number): string {
  return `${days} / 7`;
}

export function formatWeekRange(weekStart: string): string {
  if (!weekStart) {
    return '—';
  }

  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const formatter = new Intl.DateTimeFormat('eu-ES', {
    timeZone: 'Europe/Madrid',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}
