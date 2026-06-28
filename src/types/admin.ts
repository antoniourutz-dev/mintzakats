export type AdminPlayer = {
  id: string;
  username: string;
  display_name: string | null;
  leaderboard_opt_in: boolean;
  official_runs_started: number;
  official_days_completed: number;
  total_points: number;
  last_played_at: string | null;
};

export type AdminDashboardStats = {
  registered_players: number;
  active_players_this_week: number;
  challenges_completed_today: number;
  weekly_average_score: number;
  last_global_activity_at: string | null;
  ranking_players_count: number;
};

export type PlayerActivityStatus = 'started' | 'completed';

export type PlayerActivityEntry = {
  game_date: string;
  status: PlayerActivityStatus;
  score: number | null;
  total: number;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
};

export type CreatePlayerInput = {
  username: string;
  displayName?: string;
  temporaryPassword: string;
};

export type UpdatePlayerProfileInput = {
  playerId: string;
  username?: string;
  displayName?: string | null;
  leaderboardOptIn?: boolean;
};

export type ActivityFilter = 'current_week' | 'last_4_weeks' | 'all';
