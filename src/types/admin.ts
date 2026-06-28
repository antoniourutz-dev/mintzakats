export type AppRole = 'admin' | 'player';

export type AdminPlayer = {
  id: string;
  username: string;
  display_name: string | null;
  app_role: AppRole;
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

export type PlayerHistoryEntry = PlayerActivityEntry & {
  resettable_today: boolean;
};

export type QuestionAnalyticsRow = {
  question_id: number;
  question: string;
  attempts: number;
  correct_count: number;
  accuracy_percent: number;
  last_answered_at: string | null;
};

export type QuestionOptionStat = {
  option_index: number;
  option_label: string;
  selection_count: number;
  selection_percent: number;
  is_correct: boolean;
};

export type EuskeraQuestionRow = {
  id: number;
  question: string;
  candidates: string[];
  answer: number;
};

export type AdminAuditEntry = {
  id: string;
  created_at: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  actor_username: string | null;
  summary: string | null;
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

export type PlayerListFilter =
  | 'all'
  | 'active_this_week'
  | 'not_played_today'
  | 'never_played'
  | 'hidden_from_ranking';

export type QuestionAnalyticsFilter =
  | 'all'
  | 'no_attempts'
  | 'below_40'
  | 'between_40_60'
  | 'above_90';

export type UpdateEuskeraQuestionInput = {
  questionId: number;
  question: string;
  candidates: string[];
  answer: number;
};
