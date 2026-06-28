import { supabase } from './supabase';
import { isValidUsername, isMintzakatsPlayerEmail, mintzakatsEmailFromUsername } from '../utils/username';
import type {
  ActivityFilter,
  AdminAuditEntry,
  AdminDashboardStats,
  AdminPlayer,
  AppRole,
  CreatePlayerInput,
  EuskeraQuestionRow,
  PlayerActivityEntry,
  PlayerHistoryEntry,
  QuestionAnalyticsRow,
  QuestionOptionStat,
  UpdateEuskeraQuestionInput,
  UpdatePlayerProfileInput,
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

function normalizePlayer(row: Record<string, unknown>): AdminPlayer {
  return {
    id: String(row.id ?? row.player_id ?? ''),
    username: String(row.username ?? ''),
    display_name:
      row.display_name === null || row.display_name === undefined
        ? null
        : String(row.display_name),
    app_role: parseAppRole(row.app_role),
    leaderboard_opt_in: Boolean(row.leaderboard_opt_in),
    official_runs_started: Number(row.official_runs_started ?? row.runs_started ?? 0),
    official_days_completed: Number(row.official_days_completed ?? row.days_completed ?? 0),
    total_points: Number(row.total_points ?? row.points ?? 0),
    last_played_at:
      row.last_played_at === null || row.last_played_at === undefined
        ? null
        : String(row.last_played_at),
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

function isMintzakatsGamePlayer(row: Record<string, unknown>): boolean {
  const email = row.email ?? row.auth_email ?? row.user_email;

  if (typeof email === 'string' && email.trim()) {
    return isMintzakatsPlayerEmail(email);
  }

  return false;
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

function normalizeQuestionOption(row: Record<string, unknown>): QuestionOptionStat {
  return {
    option_index: Number(row.option_index ?? row.index ?? 0),
    option_label: String(row.option_label ?? row.label ?? ''),
    selection_count: Number(row.selection_count ?? row.count ?? 0),
    selection_percent: Number(row.selection_percent ?? row.percent ?? 0),
    is_correct: Boolean(row.is_correct),
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

export async function getAdminDashboard(): Promise<AdminDashboardStats> {
  const { data, error } = await supabase.rpc('admin_get_dashboard');

  if (!error && data) {
    return parseAdminDashboardRpc(data);
  }

  if (error && error.code !== 'PGRST202') {
    throw mapRpcError('admin_get_dashboard', error);
  }

  const players = await getAdminPlayers();
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

export async function getAdminPlayers(): Promise<AdminPlayer[]> {
  const { data, error } = await supabase.rpc('admin_get_players');

  if (error) {
    throw mapRpcError('admin_get_players', error);
  }

  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((row) => asRecord(row))
    .filter((row) => isMintzakatsGamePlayer(row))
    .map((row) => normalizePlayer(row));
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
): Promise<QuestionOptionStat[]> {
  const { data, error } = await supabase.rpc('admin_get_question_option_analysis', {
    p_question_id: questionId,
  });

  if (error) {
    throw mapRpcError('admin_get_question_option_analysis', error);
  }

  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => normalizeQuestionOption(asRecord(row)));
}

export async function searchEuskeraQuestions(
  query: string,
  limit = 50,
): Promise<EuskeraQuestionRow[]> {
  const { data, error } = await supabase.rpc('admin_search_euskera_questions', {
    p_query: query.trim() || null,
    p_limit: limit,
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
