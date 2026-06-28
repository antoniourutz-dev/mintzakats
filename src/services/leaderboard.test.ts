import { describe, expect, it } from 'vitest';
import { normalizeWeeklyLeaderboard } from './leaderboard';

describe('normalizeWeeklyLeaderboard', () => {
  it('itxura huts bat array hutsa itzultzen du', () => {
    expect(normalizeWeeklyLeaderboard([])).toEqual([]);
  });

  it('null array hutsa itzultzen du', () => {
    expect(normalizeWeeklyLeaderboard(null)).toEqual([]);
  });

  it('normalizatzen du fila baliozkoak', () => {
    expect(
      normalizeWeeklyLeaderboard([
        {
          rank: 1,
          username: 'ikasle005',
          display_name: 'Ikasle 5',
          total_score: 40,
          days_completed: 2,
          is_current_user: true,
        },
      ]),
    ).toEqual([
      {
        rank: 1,
        username: 'ikasle005',
        displayName: 'Ikasle 5',
        totalScore: 40,
        daysCompleted: 2,
        isCurrentUser: true,
      },
    ]);
  });

  it('fila baliogabea null itzultzen du', () => {
    expect(normalizeWeeklyLeaderboard([{ rank: '1' }])).toBeNull();
  });

  it('ez-array null itzultzen du', () => {
    expect(normalizeWeeklyLeaderboard({ rows: [] })).toBeNull();
  });
});
