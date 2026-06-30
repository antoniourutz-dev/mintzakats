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

export type RawMyProgress = {
  weekly_score: number;
  weekly_maximum: number;
  days_completed: number;
  current_streak: number;
  best_daily_score: number | null;
  last_played_at: string | null;
  current_rank: number | null;
  today_status: TodayStatus;
  today_score: number | null;
  today_total: number;
  today_completed: boolean;
  today_in_progress: boolean;
  history: RawProgressHistoryEntry[];
};

const DEFAULT_WEEKLY_MAXIMUM = 140;
const RECENT_GAMES_LIMIT = 14;

export function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return fallback;
}

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

function parseTodayStatus(row: Record<string, unknown>): TodayStatus {
  const raw = row.today_status;
  if (raw === 'completed' || raw === 'in_progress' || raw === 'not_started') {
    return raw;
  }
  if (row.today_completed === true) {
    return 'completed';
  }
  if (row.today_in_progress === true) {
    return 'in_progress';
  }
  return 'not_started';
}

function parseHistoryEntry(entry: unknown): RawProgressHistoryEntry {
  const item = asRecord(entry);
  const status = item.status === undefined ? undefined : String(item.status);

  return {
    game_date: String(item.game_date ?? ''),
    score: toFiniteNumber(item.score),
    total: toFiniteNumber(item.total, 20),
    status,
    completed_at:
      item.completed_at === null || item.completed_at === undefined
        ? null
        : String(item.completed_at),
  };
}

export function normalizeMyProgressResponse(row: Record<string, unknown>): RawMyProgress {
  const historyRaw = Array.isArray(row.history) ? row.history : [];
  const history = historyRaw.map(parseHistoryEntry);
  const todayStatus = parseTodayStatus(row);

  const weeklyScore = toFiniteNumber(
    row.weekly_score ?? row.week_points ?? row.aste_honetako_puntuak,
  );
  const weeklyMaximum = toFiniteNumber(
    row.weekly_maximum ?? row.week_maximum,
    DEFAULT_WEEKLY_MAXIMUM,
  );
  const daysCompleted = toFiniteNumber(
    row.days_completed ?? row.week_days_completed ?? row.aste_honetan_osatutako_egunak,
  );

  const bestDailyRaw = row.best_daily_score;
  const bestDailyScore =
    bestDailyRaw === null || bestDailyRaw === undefined
      ? null
      : toFiniteNumber(bestDailyRaw, Number.NaN);

  const currentRankRaw = row.current_rank;
  const currentRank =
    currentRankRaw === null || currentRankRaw === undefined
      ? null
      : toFiniteNumber(currentRankRaw, Number.NaN);

  const lastPlayedRaw = row.last_played_at;
  const lastPlayedAt =
    lastPlayedRaw === null || lastPlayedRaw === undefined ? null : String(lastPlayedRaw);

  const todayScoreRaw = row.today_score;
  const todayScore =
    todayScoreRaw === null || todayScoreRaw === undefined
      ? null
      : toFiniteNumber(todayScoreRaw, Number.NaN);

  return {
    weekly_score: weeklyScore,
    weekly_maximum: weeklyMaximum > 0 ? weeklyMaximum : DEFAULT_WEEKLY_MAXIMUM,
    days_completed: daysCompleted,
    current_streak: toFiniteNumber(row.current_streak),
    best_daily_score:
      bestDailyScore === null || Number.isNaN(bestDailyScore) ? null : bestDailyScore,
    last_played_at: lastPlayedAt,
    current_rank: currentRank === null || Number.isNaN(currentRank) ? null : currentRank,
    today_status: todayStatus,
    today_score: todayScore === null || Number.isNaN(todayScore) ? null : todayScore,
    today_total: toFiniteNumber(row.today_total, 20),
    today_completed: todayStatus === 'completed',
    today_in_progress: todayStatus === 'in_progress',
    history,
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
  const completed = history.filter((entry) => entry.status !== 'started' && entry.game_date);
  if (completed.length === 0) {
    return null;
  }

  return completed.reduce((best, entry) => Math.max(best, entry.score), Number.NEGATIVE_INFINITY);
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

  if (import.meta.env.DEV) {
    console.log('get_my_progress raw response', { data, error });
  }

  if (error) {
    throw mapSupabaseError(error);
  }

  return normalizeMyProgressResponse(asRecord(data));
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
  return rows.map(parseHistoryEntry);
}

async function resolveCurrentRank(
  leaderboardOptIn: boolean,
  rpcRank?: number | null,
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
  const bestDailyScore = raw.best_daily_score ?? computeBestDailyScore(history);
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
    weeklyScore: raw.weekly_score,
    weeklyMaximum: raw.weekly_maximum,
    daysCompleted: raw.days_completed,
    currentStreak: raw.current_streak || computeStreakFromHistory(history),
    bestDailyScore: bestDailyScore === Number.NEGATIVE_INFINITY ? null : bestDailyScore,
    lastPlayedAt,
    currentRank: await resolveCurrentRank(profile.leaderboardOptIn, raw.current_rank),
    todayStatus: raw.today_status,
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
  if (import.meta.env.DEV) {
    console.count('[RPC] fetchTodayChallengeStatus');
  }

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
