import { supabase } from './supabase';
import { isValidUsername, mintzakatsEmailFromUsername } from '../utils/username';
import type {
  ActivityFilter,
  AdminDashboardStats,
  AdminPlayer,
  CreatePlayerInput,
  PlayerActivityEntry,
  UpdatePlayerProfileInput,
} from '../types/admin';

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Erantzun baliogabea zerbitzaritik.');
  }
  return value as Record<string, unknown>;
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

function normalizePlayer(row: Record<string, unknown>): AdminPlayer {
  return {
    id: String(row.id ?? row.player_id ?? ''),
    username: String(row.username ?? ''),
    display_name:
      row.display_name === null || row.display_name === undefined
        ? null
        : String(row.display_name),
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

function normalizeDashboard(row: Record<string, unknown>): AdminDashboardStats {
  return {
    registered_players: Number(row.registered_players ?? 0),
    active_players_this_week: Number(row.active_players_this_week ?? 0),
    challenges_completed_today: Number(row.challenges_completed_today ?? 0),
    weekly_average_score: Number(row.weekly_average_score ?? 0),
    last_global_activity_at:
      row.last_global_activity_at === null || row.last_global_activity_at === undefined
        ? null
        : String(row.last_global_activity_at),
    ranking_players_count: Number(row.ranking_players_count ?? 0),
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

export async function getAdminDashboard(): Promise<AdminDashboardStats> {
  const { data, error } = await supabase.rpc('admin_get_dashboard');

  if (!error && data) {
    return normalizeDashboard(asRecord(data));
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
  return rows.map((row) => normalizePlayer(asRecord(row)));
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
