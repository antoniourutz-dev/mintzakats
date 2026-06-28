import { supabase } from './supabase';

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
  isPublic: boolean;
};

const WEEKLY_MAXIMUM = 140;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Erantzun baliogabea zerbitzaritik.');
  }
  return value as Record<string, unknown>;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new Error('Erantzun baliogabea zerbitzaritik.');
  }
  return value.map((item) => asRecord(item));
}

function mapSupabaseError(error: { message: string; code?: string }) {
  if (error.code === 'PGRST301' || error.message.toLowerCase().includes('jwt')) {
    return new Error('Saioa iraungi da. Hasi saioa berriro.');
  }
  if (error.message.toLowerCase().includes('not authenticated')) {
    return new Error('Saioa hasi behar duzu sailkapena ikusteko.');
  }
  return new Error(error.message);
}

function normalizeLeaderboardRow(row: Record<string, unknown>): WeeklyLeaderboardRow {
  return {
    rank: Number(row.rank),
    username: String(row.username ?? ''),
    displayName:
      row.display_name === null || row.display_name === undefined
        ? null
        : String(row.display_name),
    totalScore: Number(row.points ?? row.total_score ?? 0),
    daysCompleted: Number(row.days_completed ?? 0),
    isCurrentUser: Boolean(row.is_me ?? row.is_current_user),
  };
}

function normalizeLeaderboard(row: Record<string, unknown>): WeeklyLeaderboard {
  const entriesRaw = row.entries ?? row.leaderboard ?? row.rows ?? [];
  const rows = asRecordArray(entriesRaw).map(normalizeLeaderboardRow);

  return {
    weekStart: String(row.week_start ?? ''),
    rows,
    isPublic: row.is_public === undefined ? rows.length > 0 : Boolean(row.is_public),
  };
}

export async function fetchWeeklyLeaderboard(
  weekStart?: string | null,
): Promise<WeeklyLeaderboard> {
  const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
    p_week_start: weekStart ?? null,
  });

  if (error) {
    throw mapSupabaseError(error);
  }

  return normalizeLeaderboard(asRecord(data));
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
