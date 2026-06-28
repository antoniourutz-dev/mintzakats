import { supabase } from './supabase';
import { fetchWeeklyLeaderboard } from './leaderboard';

export type TodayStatus = 'not_started' | 'in_progress' | 'completed';

export type RecentGame = {
  gameDate: string;
  score: number;
  total: number;
  status: 'started' | 'completed';
  completedAt: string | null;
};

export type MyProgress = {
  username: string;
  displayName: string | null;
  weeklyScore: number;
  weeklyMaximum: number;
  daysCompleted: number;
  currentStreak: number;
  bestDailyScore: number | null;
  lastPlayedAt: string | null;
  currentRank: number | null;
  todayStatus: TodayStatus;
  recentGames: RecentGame[];
};

type RawProgressHistoryEntry = {
  game_date: string;
  score: number;
  total: number;
  status?: string;
  completed_at?: string | null;
};

type RawMyProgress = {
  days_completed: number;
  total_correct: number;
  week_points: number;
  week_days_completed: number;
  history: RawProgressHistoryEntry[];
  today_score: number | null;
  today_total: number;
  today_completed: boolean;
  today_in_progress: boolean;
  current_streak?: number;
  best_daily_score?: number | null;
  last_played_at?: string | null;
  current_rank?: number | null;
};

const WEEKLY_MAXIMUM = 140;
const RECENT_GAMES_LIMIT = 14;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Erantzun baliogabea zerbitzaritik.');
  }
  return value as Record<string, unknown>;
}

function mapSupabaseError(error: { message: string; code?: string }) {
  if (error.code === 'PGRST301' || error.message.toLowerCase().includes('jwt')) {
    return new Error('Saioa iraungi da. Hasi saioa berriro.');
  }
  if (error.message.toLowerCase().includes('not authenticated')) {
    return new Error('Saioa hasi behar duzu aurrerapena ikusteko.');
  }
  return new Error(error.message);
}

function parseRawProgress(row: Record<string, unknown>): RawMyProgress {
  const historyRaw = Array.isArray(row.history) ? row.history : [];
  const history = historyRaw.map((entry) => {
    const item = asRecord(entry);
    return {
      game_date: String(item.game_date ?? ''),
      score: Number(item.score ?? 0),
      total: Number(item.total ?? 20),
      status: item.status === undefined ? undefined : String(item.status),
      completed_at:
        item.completed_at === null || item.completed_at === undefined
          ? null
          : String(item.completed_at),
    };
  });

  return {
    days_completed: Number(row.days_completed ?? row.egindako_egunak ?? 0),
    total_correct: Number(row.total_correct ?? row.guztizko_asmatzeak ?? 0),
    week_points: Number(row.week_points ?? row.aste_honetako_puntuak ?? 0),
    week_days_completed: Number(row.week_days_completed ?? row.aste_honetan_osatutako_egunak ?? 0),
    history,
    today_score:
      row.today_score === null || row.today_score === undefined ? null : Number(row.today_score),
    today_total: Number(row.today_total ?? 20),
    today_completed: Boolean(row.today_completed),
    today_in_progress: Boolean(row.today_in_progress),
    current_streak:
      row.current_streak === undefined ? undefined : Number(row.current_streak),
    best_daily_score:
      row.best_daily_score === null || row.best_daily_score === undefined
        ? undefined
        : Number(row.best_daily_score),
    last_played_at:
      row.last_played_at === null || row.last_played_at === undefined
        ? undefined
        : String(row.last_played_at),
    current_rank:
      row.current_rank === null || row.current_rank === undefined
        ? undefined
        : Number(row.current_rank),
  };
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function computeStreakFromHistory(history: RawProgressHistoryEntry[]): number {
  const uniqueDates = [...new Set(history.map((entry) => entry.game_date).filter(Boolean))].sort(
    (a, b) => b.localeCompare(a),
  );

  if (uniqueDates.length === 0) {
    return 0;
  }

  let streak = 1;

  for (let index = 0; index < uniqueDates.length - 1; index += 1) {
    const current = parseDateOnly(uniqueDates[index]);
    const next = parseDateOnly(uniqueDates[index + 1]);
    const diffDays = Math.round((current.getTime() - next.getTime()) / 86_400_000);

    if (diffDays === 1) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function computeBestDailyScore(history: RawProgressHistoryEntry[]): number | null {
  if (history.length === 0) {
    return null;
  }

  return history.reduce((best, entry) => Math.max(best, entry.score), Number.NEGATIVE_INFINITY);
}

function mapTodayStatus(raw: RawMyProgress): TodayStatus {
  if (raw.today_completed) {
    return 'completed';
  }
  if (raw.today_in_progress) {
    return 'in_progress';
  }
  return 'not_started';
}

function mapRecentGames(history: RawProgressHistoryEntry[]): RecentGame[] {
  return [...history]
    .filter((entry) => entry.game_date)
    .sort((a, b) => b.game_date.localeCompare(a.game_date))
    .slice(0, RECENT_GAMES_LIMIT)
    .map((entry) => ({
      gameDate: entry.game_date,
      score: entry.score,
      total: entry.total,
      status: entry.status === 'started' ? 'started' : 'completed',
      completedAt: entry.completed_at ?? null,
    }));
}

async function fetchRawMyProgress(): Promise<RawMyProgress> {
  const { data, error } = await supabase.rpc('get_my_progress');

  if (error) {
    throw mapSupabaseError(error);
  }

  return parseRawProgress(asRecord(data));
}

async function fetchOptionalGameHistory(): Promise<RawProgressHistoryEntry[] | null> {
  const { data, error } = await supabase.rpc('get_my_game_history', {
    p_limit: RECENT_GAMES_LIMIT,
  });

  if (error) {
    if (error.code === 'PGRST202' || error.message.includes('Could not find the function')) {
      return null;
    }
    throw mapSupabaseError(error);
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];

  return rows.map((row) => {
    const item = asRecord(row);
    return {
      game_date: String(item.game_date ?? ''),
      score: Number(item.score ?? 0),
      total: Number(item.total ?? 20),
      status: item.status === undefined ? undefined : String(item.status),
      completed_at:
        item.completed_at === null || item.completed_at === undefined
          ? null
          : String(item.completed_at),
    };
  });
}

async function resolveCurrentRank(
  leaderboardOptIn: boolean,
  rpcRank?: number,
): Promise<number | null> {
  if (!leaderboardOptIn) {
    return null;
  }

  if (typeof rpcRank === 'number' && Number.isFinite(rpcRank)) {
    return rpcRank;
  }

  try {
    const leaderboard = await fetchWeeklyLeaderboard();
    const myRow = leaderboard.rows.find((row) => row.isCurrentUser);
    return myRow?.rank ?? null;
  } catch {
    return null;
  }
}

export type ProfileIdentity = {
  username: string;
  displayName: string | null;
  leaderboardOptIn: boolean;
};

export async function fetchMyProgress(profile: ProfileIdentity): Promise<MyProgress> {
  const raw = await fetchRawMyProgress();
  const optionalHistory = await fetchOptionalGameHistory();
  const history = optionalHistory ?? raw.history;
  const bestDailyScore =
    raw.best_daily_score ?? computeBestDailyScore(history.filter((entry) => entry.game_date));
  const lastPlayedAt =
    raw.last_played_at ??
    history
      .map((entry) => entry.completed_at ?? entry.game_date)
      .filter(Boolean)
      .sort()
      .at(-1) ??
    null;

  return {
    username: profile.username,
    displayName: profile.displayName,
    weeklyScore: raw.week_points,
    weeklyMaximum: WEEKLY_MAXIMUM,
    daysCompleted: raw.week_days_completed,
    currentStreak: raw.current_streak ?? computeStreakFromHistory(history),
    bestDailyScore: bestDailyScore === Number.NEGATIVE_INFINITY ? null : bestDailyScore,
    lastPlayedAt,
    currentRank: await resolveCurrentRank(profile.leaderboardOptIn, raw.current_rank),
    todayStatus: mapTodayStatus(raw),
    recentGames: mapRecentGames(history),
  };
}

export type TodayChallengeStatus = {
  todayScore: number | null;
  todayTotal: number;
  todayCompleted: boolean;
  todayInProgress: boolean;
};

export async function fetchTodayChallengeStatus(): Promise<TodayChallengeStatus> {
  const raw = await fetchRawMyProgress();

  return {
    todayScore: raw.today_score,
    todayTotal: raw.today_total,
    todayCompleted: raw.today_completed,
    todayInProgress: raw.today_in_progress,
  };
}

export function formatTodayStatus(status: TodayStatus): string {
  switch (status) {
    case 'completed':
      return 'Eginda';
    case 'in_progress':
      return 'Amaitu gabe';
    default:
      return 'Hasi gabe';
  }
}

export function formatGameStatus(status: RecentGame['status']): string {
  return status === 'completed' ? 'Amaituta' : 'Hasita';
}
