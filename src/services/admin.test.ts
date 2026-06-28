import { describe, expect, it } from 'vitest';
import { parseAdminDashboardRpc } from './admin';

describe('parseAdminDashboardRpc', () => {
  it('normalizatzen du objektu JSON bat', () => {
    const stats = parseAdminDashboardRpc({
      total_players: 12,
      active_this_week: 8,
      completed_today: 3,
      weekly_average_score: 14,
      latest_activity_at: '2026-06-28T10:00:00Z',
      ranking_players: 10,
    });

    expect(stats).toEqual({
      registered_players: 12,
      active_players_this_week: 8,
      challenges_completed_today: 3,
      weekly_average_score: 14,
      last_global_activity_at: '2026-06-28T10:00:00Z',
      ranking_players_count: 10,
    });
  });

  it('onartzen du TABLE baten erantzun bakarra array gisa', () => {
    const stats = parseAdminDashboardRpc([
      {
        total_players: 5,
        active_this_week: 2,
        completed_today: 1,
        weekly_average_score: 11,
        latest_activity_at: null,
        ranking_players: 4,
      },
    ]);

    expect(stats.registered_players).toBe(5);
    expect(stats.ranking_players_count).toBe(4);
  });
});
