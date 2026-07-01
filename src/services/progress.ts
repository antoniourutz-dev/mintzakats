import { supabase } from './supabase';
import { getGameDayInfo } from './dailySchedule';
import { playedOnMadridDate } from '../utils/datetime';
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
  todayScore: number | null;
  todayTotal: number;
  weekStart: string;
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

function addDays(isoDate: string, days: number): string {
  const date = parseDateOnly(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Weekly cycle starts on Sunday (Europe/Madrid), aligned with leaderboard and daily schedule. */
export function getCurrentCycleWeekStart(now = new Date()): string {
  const { gameDate, dayInCycle } = getGameDayInfo(now);
  return addDays(gameDate, -dayInCycle);
}

export function isDateInCycleWeek(gameDate: string, weekStart: string): boolean {
  const weekEnd = addDays(weekStart, 6);
  return gameDate >= weekStart && gameDate <= weekEnd;
}

function getCompletedHistoryEntries(
  history: RawProgressHistoryEntry[],
): RawProgressHistoryEntry[] {
  return history.filter((entry) => entry.game_date && entry.status !== 'started');
}

export function getCompletedGameDates(history: RawProgressHistoryEntry[]): string[] {
  return [...new Set(getCompletedHistoryEntries(history).map((entry) => entry.game_date))].sort(
    (a, b) => b.localeCompare(a),
  );
}

export function computeDaysCompletedInWeek(
  history: RawProgressHistoryEntry[],
  weekStart: string,
): number {
  return getCompletedGameDates(history).filter((date) => isDateInCycleWeek(date, weekStart))
    .length;
}

export function computeWeeklyScoreInWeek(
  history: RawProgressHistoryEntry[],
  weekStart: string,
): number {
  return getCompletedHistoryEntries(history)
    .filter((entry) => isDateInCycleWeek(entry.game_date, weekStart))
    .reduce((sum, entry) => sum + entry.score, 0);
}

export function computeStreakFromHistory(
  history: RawProgressHistoryEntry[],
  weekStart?: string,
): number {
  let uniqueDates = getCompletedGameDates(history);

  if (weekStart) {
    uniqueDates = uniqueDates.filter((date) => isDateInCycleWeek(date, weekStart));
  }

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

function getTodayHistoryEntries(
  history: RawProgressHistoryEntry[],
  gameDate: string,
): RawProgressHistoryEntry[] {
  const byGameDate = history.filter((entry) => entry.game_date === gameDate);
  if (byGameDate.length > 0) {
    return byGameDate;
  }

  return history.filter((entry) =>
    playedOnMadridDate(entry.completed_at ?? entry.game_date, gameDate),
  );
}

export function resolveTodayStatusFromHistory(
  history: RawProgressHistoryEntry[],
  now = new Date(),
): TodayStatus {
  const { gameDate } = getGameDayInfo(now);
  const todayEntries = getTodayHistoryEntries(history, gameDate);

  if (todayEntries.some((entry) => entry.status !== 'started')) {
    return 'completed';
  }
  if (todayEntries.some((entry) => entry.status === 'started')) {
    return 'in_progress';
  }
  return 'not_started';
}

function resolveTodayChallengeFromHistory(
  history: RawProgressHistoryEntry[],
  raw: RawMyProgress,
  now = new Date(),
): Pick<RawMyProgress, 'today_status' | 'today_score' | 'today_total' | 'today_completed' | 'today_in_progress'> {
  if (history.length === 0) {
    return {
      today_status: raw.today_status,
      today_score: raw.today_score,
      today_total: raw.today_total,
      today_completed: raw.today_completed,
      today_in_progress: raw.today_in_progress,
    };
  }

  const { gameDate } = getGameDayInfo(now);
  const todayEntries = getTodayHistoryEntries(history, gameDate);
  const todayStatus = resolveTodayStatusFromHistory(history, now);
  const primaryEntry =
    todayEntries.find((entry) => entry.status !== 'started') ?? todayEntries[0] ?? null;

  return {
    today_status: todayStatus,
    today_score: primaryEntry?.score ?? null,
    today_total: primaryEntry?.total ?? raw.today_total,
    today_completed: todayStatus === 'completed',
    today_in_progress: todayStatus === 'in_progress',
  };
}

function resolveWeekMetricsFromHistory(
  history: RawProgressHistoryEntry[],
  raw: RawMyProgress,
): Pick<RawMyProgress, 'weekly_score' | 'days_completed' | 'current_streak'> {
  if (history.length === 0) {
    return {
      weekly_score: raw.weekly_score,
      days_completed: raw.days_completed,
      current_streak: raw.current_streak,
    };
  }

  const weekStart = getCurrentCycleWeekStart();
  const daysCompleted = computeDaysCompletedInWeek(history, weekStart);
  const weeklyScore = computeWeeklyScoreInWeek(history, weekStart);
  const currentStreak = computeStreakFromHistory(history, weekStart);

  if (import.meta.env.DEV) {
    console.log('[PROGRESS] week metrics from history', {
      weekStart,
      daysCompleted,
      weeklyScore,
      currentStreak,
      rpcDaysCompleted: raw.days_completed,
      rpcWeeklyScore: raw.weekly_score,
      rpcStreak: raw.current_streak,
    });
  }

  return {
    weekly_score: weeklyScore,
    days_completed: daysCompleted,
    current_streak: currentStreak,
  };
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

export async function loadProgressSources(): Promise<{
  raw: RawMyProgress;
  history: RawProgressHistoryEntry[];
}> {
  const raw = await fetchRawMyProgress();
  const optionalHistory = await fetchOptionalGameHistory();
  return { raw, history: optionalHistory ?? raw.history };
}

export async function buildTodayChallengeStatus(
  sources?: { raw: RawMyProgress; history: RawProgressHistoryEntry[] },
): Promise<TodayChallengeStatus> {
  const { raw, history } = sources ?? (await loadProgressSources());
  const todayChallenge = resolveTodayChallengeFromHistory(history, raw);

  return {
    todayScore: todayChallenge.today_score,
    todayTotal: todayChallenge.today_total,
    todayCompleted: todayChallenge.today_completed,
    todayInProgress: todayChallenge.today_in_progress,
  };
}

export async function buildMyProgress(
  profile: ProfileIdentity,
  sources?: { raw: RawMyProgress; history: RawProgressHistoryEntry[] },
): Promise<MyProgress> {
  const { raw, history } = sources ?? (await loadProgressSources());
  const weekStart = getCurrentCycleWeekStart();
  const weekMetrics = resolveWeekMetricsFromHistory(history, raw);
  const todayChallenge = resolveTodayChallengeFromHistory(history, raw);
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
    weeklyScore: weekMetrics.weekly_score,
    weeklyMaximum: raw.weekly_maximum,
    daysCompleted: weekMetrics.days_completed,
    currentStreak: weekMetrics.current_streak,
    bestDailyScore: bestDailyScore === Number.NEGATIVE_INFINITY ? null : bestDailyScore,
    lastPlayedAt,
    currentRank: await resolveCurrentRank(profile.leaderboardOptIn, raw.current_rank),
    todayStatus: todayChallenge.today_status,
    todayScore: todayChallenge.today_score,
    todayTotal: todayChallenge.today_total,
    weekStart,
    recentGames: mapRecentGames(history),
  };
}

export async function fetchMyProgress(profile: ProfileIdentity): Promise<MyProgress> {
  return buildMyProgress(profile);
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

  return buildTodayChallengeStatus();
}

export function formatTodayStatus(
  status: TodayStatus,
  options?: { score?: number | null; total?: number },
): string {
  const score = options?.score;
  const total = options?.total ?? 20;

  switch (status) {
    case 'completed':
      return score === null || score === undefined
        ? 'Eginda'
        : `Eginda · ${score}/${total}`;
    case 'in_progress':
      return score === null || score === undefined
        ? 'Amaitu gabe'
        : `Amaitu gabe · ${score}/${total}`;
    default:
      return 'Hasi gabe';
  }
}

export function formatGameStatus(status: RecentGame['status']): string {
  return status === 'completed' ? 'Amaituta' : 'Hasita';
}
