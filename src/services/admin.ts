import { supabase } from './supabase';
import { isValidUsername, mintzakatsEmailFromUsername } from '../utils/username';
import type {
  ActivityFilter,
  AdminAuditEntry,
  AdminDashboardStats,
  AdminPlayer,
  AppRole,
  CreatePlayerInput,
  EuskeraQuestionRow,
  DayChallengeQuestion,
  DayChallengeQuestionsLoadResult,
  PlayerProgressDebugEntry,
  PlayerActivityEntry,
  PlayerHistoryEntry,
  QuestionAnalyticsRow,
  QuestionOptionAnalysisRow,
  UpdateEuskeraQuestionInput,
  UpdatePlayerProfileInput,
  WeekChallengePlanDay,
} from '../types/admin';

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

function mapRpcError(rpcName: string, error: { message: string; code?: string }) {
  if (error.code === 'PGRST202' || error.message.includes('Could not find the function')) {
    return new Error(`TODO SUPABASE: '${rpcName}' RPC ez dago konfiguratuta.`);
  }
  if (error.message.toLowerCase().includes('not authorized')) {
    return new Error('Ez duzu baimenik ekintza hau egiteko.');
  }
  return new Error(error.message);
}

function parseAppRole(value: unknown): AppRole {
  return value === 'admin' ? 'admin' : 'player';
}

function parseCandidates(value: unknown): string[] {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return [];
}

function parseNumeric(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizePlayer(row: Record<string, unknown>): AdminPlayer | null {
  const id = String(row.user_id ?? row.id ?? row.player_id ?? '').trim();
  const username = String(row.username ?? '').trim();

  if (!id || !username) {
    console.error('Invalid admin player row', row);
    return null;
  }

  const lastCompleted = row.last_completed_at;
  const lastStarted = row.last_started_at;
  const lastPlayed =
    lastCompleted === null || lastCompleted === undefined
      ? lastStarted === null || lastStarted === undefined
        ? row.last_played_at === null || row.last_played_at === undefined
          ? null
          : String(row.last_played_at)
        : String(lastStarted)
      : String(lastCompleted);

  return {
    id,
    username,
    display_name:
      row.display_name === null || row.display_name === undefined
        ? null
        : String(row.display_name),
    app_role: parseAppRole(row.app_role),
    leaderboard_opt_in: Boolean(row.leaderboard_opt_in),
    official_runs_started: parseNumeric(
      row.games_started ?? row.official_runs_started ?? row.runs_started,
    ),
    official_days_completed: parseNumeric(
      row.games_completed ?? row.official_days_completed ?? row.days_completed,
    ),
    total_points: parseNumeric(row.total_score ?? row.total_points ?? row.points),
    last_played_at: lastPlayed,
  };
}

function normalizeActivity(row: Record<string, unknown>): PlayerActivityEntry {
  const statusRaw = String(row.status ?? 'started');
  const status: PlayerActivityEntry['status'] =
    statusRaw === 'completed' ? 'completed' : 'started';

  return {
    game_date: String(row.game_date ?? ''),
    status,
    score: row.score === null || row.score === undefined ? null : Number(row.score),
    total: Number(row.total ?? 20),
    started_at:
      row.started_at === null || row.started_at === undefined ? null : String(row.started_at),
    completed_at:
      row.completed_at === null || row.completed_at === undefined
        ? null
        : String(row.completed_at),
    duration_seconds:
      row.duration_seconds === null || row.duration_seconds === undefined
        ? null
        : Number(row.duration_seconds),
  };
}

function normalizeHistory(row: Record<string, unknown>): PlayerHistoryEntry {
  return {
    ...normalizeActivity(row),
    resettable_today: row.resettable_today === true,
  };
}

function parseRpcJsonObject(data: unknown): Record<string, unknown> {
  if (Array.isArray(data)) {
    if (data.length === 1 && data[0] && typeof data[0] === 'object' && !Array.isArray(data[0])) {
      return data[0] as Record<string, unknown>;
    }
    throw new Error('Erantzun baliogabea zerbitzaritik.');
  }

  return asRecord(data);
}

export type AdminPlayersLoadResult = {
  players: AdminPlayer[];
  rawCount: number;
};

export async function getAdminPlayers(): Promise<AdminPlayersLoadResult> {
  const { data, error } = await supabase.rpc('admin_get_players');

  console.log('admin_get_players raw response', { data, error });

  if (error) {
    throw mapRpcError('admin_get_players', error);
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const players = rows
    .map((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        return null;
      }
      return normalizePlayer(row as Record<string, unknown>);
    })
    .filter((player): player is AdminPlayer => player !== null);

  return {
    players,
    rawCount: rows.length,
  };
}

function normalizeDashboard(row: Record<string, unknown>): AdminDashboardStats {
  return {
    registered_players: Number(row.total_players ?? row.registered_players ?? 0),
    active_players_this_week: Number(
      row.active_this_week ?? row.active_players_this_week ?? 0,
    ),
    challenges_completed_today: Number(
      row.completed_today ?? row.challenges_completed_today ?? 0,
    ),
    weekly_average_score: Number(row.weekly_average_score ?? 0),
    last_global_activity_at:
      row.latest_activity_at === null || row.latest_activity_at === undefined
        ? row.last_global_activity_at === null || row.last_global_activity_at === undefined
          ? null
          : String(row.last_global_activity_at)
        : String(row.latest_activity_at),
    ranking_players_count: Number(row.ranking_players ?? row.ranking_players_count ?? 0),
  };
}

function normalizeQuestionAnalytics(row: Record<string, unknown>): QuestionAnalyticsRow {
  const attempts = Number(row.attempts ?? 0);
  const correctCount = Number(row.correct_count ?? row.correct_answers ?? 0);
  const accuracy =
    row.accuracy_percent === undefined
      ? attempts > 0
        ? Math.round((correctCount / attempts) * 100)
        : 0
      : Number(row.accuracy_percent);

  return {
    question_id: Number(row.question_id ?? row.id),
    question: String(row.question ?? ''),
    attempts,
    correct_count: correctCount,
    accuracy_percent: accuracy,
    last_answered_at:
      row.last_answered_at === null || row.last_answered_at === undefined
        ? null
        : String(row.last_answered_at),
  };
}

export function normalizeQuestionOptionAnalysisRow(
  row: Record<string, unknown>,
): QuestionOptionAnalysisRow | null {
  const optionIndex =
    typeof row.option_index === 'number' ? row.option_index : Number(row.option_index);

  const selectedCount =
    typeof row.selected_count === 'number' ? row.selected_count : Number(row.selected_count);

  const selectedPercent =
    row.selected_percent === null
      ? null
      : typeof row.selected_percent === 'number'
        ? row.selected_percent
        : Number(row.selected_percent);

  const optionText =
    typeof row.option_text === 'string'
      ? row.option_text
      : typeof row.text === 'string'
        ? row.text
        : typeof row.option === 'string'
          ? row.option
          : typeof row.label === 'string'
            ? row.label
            : typeof row.option_label === 'string'
              ? row.option_label
              : null;

  if (
    !Number.isFinite(optionIndex) ||
    typeof optionText !== 'string' ||
    !Number.isFinite(selectedCount) ||
    (selectedPercent !== null && !Number.isFinite(selectedPercent))
  ) {
    console.error('Invalid option analysis row', row);
    return null;
  }

  return {
    optionIndex,
    optionText,
    selectedCount,
    selectedPercent,
    isCorrectOption: row.is_correct_option === true || row.is_correct === true,
  };
}

function normalizeEuskeraQuestion(row: Record<string, unknown>): EuskeraQuestionRow | null {
  const id = Number(row.id ?? row.question_id);
  const question = String(row.question ?? '').trim();
  const candidates = parseCandidates(row.candidates);
  const answer = Number(row.answer);

  if (!Number.isInteger(id) || !question || candidates.length !== 4) {
    return null;
  }

  if (!Number.isInteger(answer) || answer < 0 || answer > 3) {
    return null;
  }

  return { id, question, candidates, answer };
}

function normalizeAuditEntry(row: Record<string, unknown>): AdminAuditEntry {
  return {
    id: String(row.id ?? ''),
    created_at: String(row.created_at ?? ''),
    action: String(row.action ?? ''),
    target_type:
      row.target_type === null || row.target_type === undefined
        ? null
        : String(row.target_type),
    target_id:
      row.target_id === null || row.target_id === undefined ? null : String(row.target_id),
    actor_username:
      row.actor_username === null || row.actor_username === undefined
        ? null
        : String(row.actor_username),
    summary:
      row.summary === null || row.summary === undefined ? null : String(row.summary),
  };
}

async function invokeAdminUsers<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });

  if (error) {
    if (error.message.includes('Failed to send a request')) {
      throw new Error("TODO SUPABASE: 'admin-users' Edge Function ez dago eskuragarri.");
    }
    throw new Error(error.message);
  }

  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: string }).error));
  }

  return data as T;
}

export function parseAdminDashboardRpc(data: unknown): AdminDashboardStats {
  return normalizeDashboard(parseRpcJsonObject(data));
}

export function normalizeAdminPlayerRow(row: Record<string, unknown>): AdminPlayer | null {
  return normalizePlayer(row);
}

export async function getAdminDashboard(): Promise<AdminDashboardStats> {
  const { data, error } = await supabase.rpc('admin_get_dashboard');

  if (!error && data) {
    return parseAdminDashboardRpc(data);
  }

  if (error && error.code !== 'PGRST202') {
    throw mapRpcError('admin_get_dashboard', error);
  }

  const { players } = await getAdminPlayers();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);

  const activeThisWeek = players.filter((player) => {
    if (!player.last_played_at) return false;
    return new Date(player.last_played_at) >= weekAgo;
  }).length;

  const rankingCount = players.filter((player) => player.leaderboard_opt_in).length;
  const totalPoints = players.reduce((sum, player) => sum + player.total_points, 0);
  const totalDays = players.reduce((sum, player) => sum + player.official_days_completed, 0);

  return {
    registered_players: players.length,
    active_players_this_week: activeThisWeek,
    challenges_completed_today: 0,
    weekly_average_score: totalDays > 0 ? Math.round(totalPoints / totalDays) : 0,
    last_global_activity_at: players
      .map((player) => player.last_played_at)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null,
    ranking_players_count: rankingCount,
  };
}

export async function getAdminPlayerActivity(
  playerId: string,
  filter: ActivityFilter = 'current_week',
): Promise<PlayerActivityEntry[]> {
  const { data, error } = await supabase.rpc('admin_get_player_activity', {
    p_player_id: playerId,
    p_filter: filter,
  });

  if (error) {
    throw mapRpcError('admin_get_player_activity', error);
  }

  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => normalizeActivity(asRecord(row)));
}

export async function getAdminPlayerHistory(
  playerId: string,
  limit = 60,
): Promise<PlayerHistoryEntry[]> {
  const { data, error } = await supabase.rpc('admin_get_player_history', {
    p_player_id: playerId,
    p_limit: limit,
  });

  if (error) {
    throw mapRpcError('admin_get_player_history', error);
  }

  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => normalizeHistory(asRecord(row)));
}

export async function resetTodayRankedGame(playerId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_reset_today_ranked_game', {
    p_player_id: playerId,
  });

  if (error) {
    throw mapRpcError('admin_reset_today_ranked_game', error);
  }
}

export async function getAdminQuestionAnalytics(
  minAttempts = 0,
): Promise<QuestionAnalyticsRow[]> {
  const { data, error } = await supabase.rpc('admin_get_question_analytics', {
    p_min_attempts: minAttempts,
  });

  if (error) {
    throw mapRpcError('admin_get_question_analytics', error);
  }

  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => normalizeQuestionAnalytics(asRecord(row)));
}

export async function getAdminQuestionOptionAnalysis(
  questionId: number,
): Promise<QuestionOptionAnalysisRow[]> {
  const { data, error } = await supabase.rpc('admin_get_question_option_analysis', {
    p_question_id: questionId,
  });

  console.log('admin_get_question_option_analysis raw response', { data, error });

  if (error) {
    throw mapRpcError('admin_get_question_option_analysis', error);
  }

  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((row) => normalizeQuestionOptionAnalysisRow(asRecord(row)))
    .filter((option): option is QuestionOptionAnalysisRow => option !== null);
}

export async function searchEuskeraQuestions(
  query: string,
  limit = 50,
  offset = 0,
): Promise<EuskeraQuestionRow[]> {
  const { data, error } = await supabase.rpc('admin_search_euskera_questions', {
    p_query: query.trim(),
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    throw mapRpcError('admin_search_euskera_questions', error);
  }

  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((row) => normalizeEuskeraQuestion(asRecord(row)))
    .filter((question): question is EuskeraQuestionRow => question !== null);
}

export async function getEuskeraQuestionById(questionId: number): Promise<EuskeraQuestionRow> {
  const results = await searchEuskeraQuestions(String(questionId), 1);
  const match = results.find((item) => item.id === questionId);
  if (!match) {
    throw new Error('Galdera ez da aurkitu.');
  }
  return match;
}

export async function updateEuskeraQuestion(input: UpdateEuskeraQuestionInput): Promise<void> {
  const question = input.question.trim();
  const candidates = input.candidates.map((item) => item.trim());

  if (!question) {
    throw new Error('Galderaren testua ezin da hutsik egon.');
  }

  if (candidates.length !== 4 || candidates.some((item) => !item)) {
    throw new Error('Lau aukera bete behar dira.');
  }

  if (!Number.isInteger(input.answer) || input.answer < 0 || input.answer > 3) {
    throw new Error('Erantzun zuzena 0 eta 3 artean egon behar da.');
  }

  const { error } = await supabase.rpc('admin_update_euskera_question', {
    p_question_id: input.questionId,
    p_question: question,
    p_candidates: candidates,
    p_answer: input.answer,
  });

  if (error) {
    throw mapRpcError('admin_update_euskera_question', error);
  }
}

export async function getAdminAuditLog(limit = 100): Promise<AdminAuditEntry[]> {
  const { data, error } = await supabase.rpc('admin_get_audit_log', {
    p_limit: limit,
  });

  if (error) {
    throw mapRpcError('admin_get_audit_log', error);
  }

  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => normalizeAuditEntry(asRecord(row)));
}

export async function updatePlayerProfile(input: UpdatePlayerProfileInput): Promise<void> {
  const { error } = await supabase.rpc('admin_update_player_profile', {
    p_player_id: input.playerId,
    p_username: input.username ?? null,
    p_display_name: input.displayName ?? null,
    p_leaderboard_opt_in: input.leaderboardOptIn ?? null,
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error('Izen hori hartuta dago; aukeratu beste bat.');
    }
    throw mapRpcError('admin_update_player_profile', error);
  }
}

export async function createPlayer(input: CreatePlayerInput): Promise<void> {
  const username = input.username.trim().toLowerCase();

  if (!isValidUsername(username)) {
    throw new Error('Erabiltzaile-izenak 3-24 karaktere izan behar ditu (A-Z, 0-9, _, -).');
  }

  await invokeAdminUsers({
    action: 'create',
    email: mintzakatsEmailFromUsername(username),
    username,
    display_name: input.displayName?.trim() || null,
    temporary_password: input.temporaryPassword,
  });
}

export async function deletePlayer(userId: string): Promise<void> {
  await invokeAdminUsers({ action: 'delete', user_id: userId });
}

export async function resetPlayerPassword(userId: string, password: string): Promise<void> {
  await invokeAdminUsers({
    action: 'reset_password',
    user_id: userId,
    temporary_password: password,
  });
}

export function validateEuskeraQuestionInput(
  question: string,
  candidates: string[],
  answer: number,
): string | null {
  if (!question.trim()) {
    return 'Galderaren testua ezin da hutsik egon.';
  }
  if (candidates.length !== 4 || candidates.some((item) => !item.trim())) {
    return 'Lau aukera bete behar dira.';
  }
  if (!Number.isInteger(answer) || answer < 0 || answer > 3) {
    return 'Hautatu erantzun zuzena A eta D artean.';
  }
  return null;
}

function parseNumericField(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return fallback;
}

function normalizeWeekChallengePlanDay(row: Record<string, unknown>): WeekChallengePlanDay | null {
  const gameDate = String(row.game_date ?? row.gameDate ?? '').trim();
  if (!gameDate) {
    console.error('Invalid week challenge plan row', row);
    return null;
  }

  const challengeStatus = String(
    row.challenge_status ?? row.status ?? '',
  ).trim();

  return {
    weekStart:
      row.week_start === null || row.week_start === undefined
        ? null
        : String(row.week_start),
    gameDate,
    challengeStatus,
    questionCount: parseNumericField(row.question_count ?? row.questionCount),
    playersStarted: parseNumericField(row.started_players ?? row.players_started ?? row.playersStarted),
    playersCompleted: parseNumericField(
      row.completed_players ?? row.players_completed ?? row.playersCompleted,
    ),
  };
}

export function normalizeDayChallengeQuestion(
  row: Record<string, unknown>,
): DayChallengeQuestion | null {
  let candidates: unknown = row.candidates;

  if (typeof candidates === 'string') {
    try {
      candidates = JSON.parse(candidates);
    } catch {
      console.error('Invalid candidates JSON', row);
      return null;
    }
  }

  const questionPosition = Number(row.question_position);
  const questionId = Number(row.question_id);
  const correctAnswer = Number(row.correct_answer);

  if (
    !Number.isFinite(questionPosition) ||
    !Number.isFinite(questionId) ||
    typeof row.question !== 'string' ||
    row.question.trim() === '' ||
    !Array.isArray(candidates) ||
    candidates.length !== 4 ||
    !candidates.every((candidate) => typeof candidate === 'string') ||
    !Number.isInteger(correctAnswer) ||
    correctAnswer < 0 ||
    correctAnswer > 3
  ) {
    console.error('Invalid day challenge question row', row);
    return null;
  }

  return {
    questionPosition,
    questionId,
    question: row.question,
    candidates,
    correctAnswer,
  };
}

function normalizePlayerProgressDebugEntry(
  row: Record<string, unknown>,
): PlayerProgressDebugEntry | null {
  const gameDate = String(row.game_date ?? '').trim();
  if (!gameDate) {
    console.error('Invalid player progress debug row', row);
    return null;
  }

  const scoreRaw = row.score;
  const score =
    scoreRaw === null || scoreRaw === undefined ? null : parseNumericField(scoreRaw, Number.NaN);

  return {
    gameDate,
    weekStart:
      row.week_start === null || row.week_start === undefined ? null : String(row.week_start),
    score: score === null || Number.isNaN(score) ? null : score,
    status: String(row.status ?? 'unknown'),
    answersRecorded: parseNumericField(row.answers_recorded ?? row.answers_count),
    isCurrentWeek: row.is_current_week === true || row.belongs_to_current_week === true,
  };
}

export async function getAdminWeekChallengePlan(): Promise<WeekChallengePlanDay[]> {
  const { data, error } = await supabase.rpc('admin_get_week_challenge_plan');

  if (error) {
    throw mapRpcError('admin_get_week_challenge_plan', error);
  }

  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((row) => normalizeWeekChallengePlanDay(asRecord(row)))
    .filter((day): day is WeekChallengePlanDay => day !== null);
}

export async function getAdminDayChallengeQuestions(
  gameDate: string,
): Promise<DayChallengeQuestionsLoadResult> {
  const { data, error } = await supabase.rpc('admin_get_day_challenge_questions', {
    p_game_date: gameDate,
  });

  if (error) {
    throw mapRpcError('admin_get_day_challenge_questions', error);
  }

  const rows = Array.isArray(data) ? data : [];
  let invalidCount = 0;

  const questions = rows
    .map((row) => {
      const normalized = normalizeDayChallengeQuestion(asRecord(row));
      if (!normalized) {
        invalidCount += 1;
      }
      return normalized;
    })
    .filter((question): question is DayChallengeQuestion => question !== null)
    .sort((a, b) => a.questionPosition - b.questionPosition);

  return { questions, invalidCount };
}

export async function getAdminPlayerProgressDebug(
  playerId: string,
): Promise<PlayerProgressDebugEntry[]> {
  const { data, error } = await supabase.rpc('admin_get_player_progress_debug', {
    p_player_id: playerId,
  });

  if (import.meta.env.DEV) {
    console.log('admin_get_player_progress_debug raw response', { data, error });
  }

  if (error) {
    throw mapRpcError('admin_get_player_progress_debug', error);
  }

  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((row) => normalizePlayerProgressDebugEntry(asRecord(row)))
    .filter((entry): entry is PlayerProgressDebugEntry => entry !== null);
}

export const ADMIN_BANK_QUESTION_ID_KEY = 'mintzakats_admin_bank_question_id';

export function openQuestionInBank(questionId: number): void {
  sessionStorage.setItem(ADMIN_BANK_QUESTION_ID_KEY, String(questionId));
}
