import { describe, expect, it } from 'vitest';
import { normalizeMyProgressResponse, toFiniteNumber } from './progress';

describe('toFiniteNumber', () => {
  it('onartzen du number eta string', () => {
    expect(toFiniteNumber(13)).toBe(13);
    expect(toFiniteNumber('13')).toBe(13);
    expect(toFiniteNumber('')).toBe(0);
    expect(toFiniteNumber(null)).toBe(0);
  });
});

describe('normalizeMyProgressResponse', () => {
  it('mapeatzen du weekly_score eta days_completed snake_case gisa', () => {
    const raw = normalizeMyProgressResponse({
      weekly_score: '13',
      weekly_maximum: '140',
      days_completed: '1',
      current_streak: '2',
      best_daily_score: '13',
      last_played_at: '2026-06-28T10:00:00Z',
      current_rank: '5',
      today_status: 'completed',
      today_score: '13',
      today_total: '20',
      history: [
        {
          game_date: '2026-06-28',
          score: '13',
          total: '20',
          status: 'completed',
        },
      ],
    });

    expect(raw.weekly_score).toBe(13);
    expect(raw.weekly_maximum).toBe(140);
    expect(raw.days_completed).toBe(1);
    expect(raw.current_streak).toBe(2);
    expect(raw.best_daily_score).toBe(13);
    expect(raw.current_rank).toBe(5);
    expect(raw.today_status).toBe('completed');
    expect(raw.history[0]?.score).toBe(13);
  });

  it('mantentzen du alias zaharrak', () => {
    const raw = normalizeMyProgressResponse({
      week_points: 20,
      week_days_completed: 2,
      today_completed: true,
      history: [],
    });

    expect(raw.weekly_score).toBe(20);
    expect(raw.days_completed).toBe(2);
    expect(raw.today_status).toBe('completed');
  });
});
