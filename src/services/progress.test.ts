import { describe, expect, it } from 'vitest';
import {
  computeDaysCompletedInWeek,
  computeStreakFromHistory,
  computeWeeklyScoreInWeek,
  formatTodayStatus,
  normalizeMyProgressResponse,
  resolveTodayStatusFromHistory,
  toFiniteNumber,
} from './progress';

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

describe('week progress metrics', () => {
  const weekStart = '2026-06-28';

  const history = [
    { game_date: '2026-06-28', score: 10, total: 20, status: 'completed' },
    { game_date: '2026-06-29', score: 12, total: 20, status: 'completed' },
    { game_date: '2026-06-30', score: 11, total: 20, status: 'completed' },
    { game_date: '2026-07-01', score: 13, total: 20, status: 'completed' },
    { game_date: '2026-07-01', score: 5, total: 20, status: 'started' },
  ];

  it('cuenta solo dias completados de la semana actual', () => {
    expect(computeDaysCompletedInWeek(history, weekStart)).toBe(4);
    expect(computeWeeklyScoreInWeek(history, weekStart)).toBe(46);
  });

  it('no cuenta partidas started para erritmoa ni osatutako egunak', () => {
    const startedOnly = [
      { game_date: '2026-06-28', score: 0, total: 20, status: 'started' },
      { game_date: '2026-06-29', score: 0, total: 20, status: 'started' },
    ];

    expect(computeDaysCompletedInWeek(startedOnly, weekStart)).toBe(0);
    expect(computeStreakFromHistory(startedOnly, weekStart)).toBe(0);
  });

  it('alinea erritmoa con dias completados de la semana', () => {
    expect(computeStreakFromHistory(history, weekStart)).toBe(4);
  });

  it('excluye dias fuera de la semana domingo-sabado', () => {
    const withPreviousWeek = [
      { game_date: '2026-06-27', score: 20, total: 20, status: 'completed' },
      ...history,
    ];

    expect(computeDaysCompletedInWeek(withPreviousWeek, weekStart)).toBe(4);
    expect(computeStreakFromHistory(withPreviousWeek, weekStart)).toBe(4);
  });
});

describe('resolveTodayStatusFromHistory', () => {
  it('marca eginda si hay partida completada hoy', () => {
    const history = [{ game_date: '2026-07-01', score: 13, total: 20, status: 'completed' }];
    const now = new Date('2026-07-01T10:00:00+02:00');

    expect(resolveTodayStatusFromHistory(history, now)).toBe('completed');
  });

  it('marca amaitu gabe si solo hay partida started hoy', () => {
    const history = [{ game_date: '2026-07-01', score: 5, total: 20, status: 'started' }];
    const now = new Date('2026-07-01T10:00:00+02:00');

    expect(resolveTodayStatusFromHistory(history, now)).toBe('in_progress');
  });

  it('usa completed_at cuando game_date no coincide con el dia de juego', () => {
    const history = [
      {
        game_date: '2026-06-30',
        score: 13,
        total: 20,
        status: 'completed',
        completed_at: '2026-07-01T07:29:00+02:00',
      },
    ];
    const now = new Date('2026-07-01T10:00:00+02:00');

    expect(resolveTodayStatusFromHistory(history, now)).toBe('completed');
  });

  it('marca hasi gabe si la ultima partida fue otro dia de juego', () => {
    const history = [{ game_date: '2026-06-30', score: 13, total: 20, status: 'completed' }];
    const now = new Date('2026-07-01T10:00:00+02:00');

    expect(resolveTodayStatusFromHistory(history, now)).toBe('not_started');
  });
});

describe('formatTodayStatus', () => {
  it('muestra puntuacion cuando la erronka de hoy esta completada', () => {
    expect(formatTodayStatus('completed', { score: 13, total: 20 })).toBe('Eginda · 13/20');
  });
});
