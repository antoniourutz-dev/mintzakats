import { describe, expect, it } from 'vitest';
import { normalizeAdminPlayerRow, normalizeDayChallengeQuestion, normalizeQuestionOptionAnalysisRow, parseAdminDashboardRpc } from './admin';

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

describe('normalizeAdminPlayerRow', () => {
  it('normalizatzen du eremuak snake_case eta bigint string gisa', () => {
    const player = normalizeAdminPlayerRow({
      user_id: '11111111-1111-1111-1111-111111111111',
      username: 'ikasle005',
      display_name: 'Ikasle 5',
      leaderboard_opt_in: true,
      games_started: '3',
      games_completed: '2',
      total_score: '40',
      last_started_at: '2026-06-28T08:00:00Z',
      last_completed_at: '2026-06-28T08:30:00Z',
    });

    expect(player).toEqual({
      id: '11111111-1111-1111-1111-111111111111',
      username: 'ikasle005',
      display_name: 'Ikasle 5',
      app_role: 'player',
      leaderboard_opt_in: true,
      official_runs_started: 3,
      official_days_completed: 2,
      total_points: 40,
      last_played_at: '2026-06-28T08:30:00Z',
    });
  });
});

describe('normalizeQuestionOptionAnalysisRow', () => {
  it('normalizatzen du option_text eta is_correct_option', () => {
    const row = normalizeQuestionOptionAnalysisRow({
      option_index: 2,
      option_text: 'Bilbao',
      selected_count: 14,
      selected_percent: 35.5,
      is_correct_option: true,
    });

    expect(row).toEqual({
      optionIndex: 2,
      optionText: 'Bilbao',
      selectedCount: 14,
      selectedPercent: 35.5,
      isCorrectOption: true,
    });
  });

  it('onartzen du selected_percent null', () => {
    const row = normalizeQuestionOptionAnalysisRow({
      option_index: '0',
      option_text: 'Donostia',
      selected_count: '3',
      selected_percent: null,
      is_correct_option: false,
    });

    expect(row).toEqual({
      optionIndex: 0,
      optionText: 'Donostia',
      selectedCount: 3,
      selectedPercent: null,
      isCorrectOption: false,
    });
  });
});

describe('normalizeDayChallengeQuestion', () => {
  it('normalizatzen du snake_case eta correct_answer', () => {
    const row = normalizeDayChallengeQuestion({
      question_position: 1,
      question_id: 42,
      question: 'Non dago Gasteiz?',
      candidates: ['Madril', 'Gasteiz', 'Bilbo', 'Iruñea'],
      correct_answer: 1,
    });

    expect(row).toEqual({
      questionPosition: 1,
      questionId: 42,
      question: 'Non dago Gasteiz?',
      candidates: ['Madril', 'Gasteiz', 'Bilbo', 'Iruñea'],
      correctAnswer: 1,
    });
  });

  it('onartzen du candidates JSON string gisa', () => {
    const row = normalizeDayChallengeQuestion({
      question_position: 2,
      question_id: 43,
      question: 'Kaixo?',
      candidates: '["a","b","c","d"]',
      correct_answer: 3,
    });

    expect(row?.correctAnswer).toBe(3);
    expect(row?.candidates).toEqual(['a', 'b', 'c', 'd']);
  });
});
