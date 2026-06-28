import { describe, expect, it } from 'vitest';
import {
  applyAnswerToQuestion,
  getActiveQuestionIndex,
  isRunCompleted,
  normalizeRankedAnswerResult,
  normalizeRankedQuestion,
  type RankedQuestion,
} from './rankedGame';

describe('normalizeRankedQuestion', () => {
  it('sortzen du galdera baliozko bat question_position erabiliz', () => {
    const question = normalizeRankedQuestion({
      run_id: 'run-1',
      game_date: '2026-06-27',
      question_position: 1,
      question_id: 10,
      question: 'Zer moduz?',
      candidates: ['On', 'Eskerrik asko', 'Agur', 'Kaixo'],
      answered: false,
      selected_answer: null,
      is_correct: null,
    });

    expect(question).not.toBeNull();
    expect(question?.answered).toBe(false);
    expect(question?.candidates).toHaveLength(4);
    expect(question?.questionPosition).toBe(1);
    expect(question).not.toHaveProperty('answer');
  });

  it('onartzen du candidates JSON string gisa', () => {
    const question = normalizeRankedQuestion({
      run_id: 'run-1',
      game_date: '2026-06-27',
      question_position: 2,
      question_id: 11,
      question: 'Kaixo?',
      candidates: '["A","B","C","D"]',
      answered: false,
      selected_answer: null,
      is_correct: null,
    });

    expect(question?.candidates).toEqual(['A', 'B', 'C', 'D']);
  });

  it('ez du onartzen answer eremua', () => {
    const question = normalizeRankedQuestion({
      run_id: 'run-1',
      game_date: '2026-06-27',
      question_position: 1,
      question_id: 10,
      question: 'Zer moduz?',
      candidates: ['On', 'Eskerrik asko', 'Agur', 'Kaixo'],
      answer: 2,
      answered: false,
      selected_answer: null,
      is_correct: null,
    });

    expect(question).not.toBeNull();
    expect(question).not.toHaveProperty('answer');
  });

  it('itxura baliogabea null itzultzen du', () => {
    expect(normalizeRankedQuestion({ question_id: 1 })).toBeNull();
  });
});

describe('normalizeRankedAnswerResult', () => {
  it('normalizatzen du array batetik datorren erantzuna', () => {
    const result = normalizeRankedAnswerResult([
      {
        selected_answer: 2,
        is_correct: true,
        correct_answer: 2,
        run_completed: false,
        score: 1,
        answered_count: 1,
      },
    ]);

    expect(result).toEqual({
      selectedAnswer: 2,
      isCorrect: true,
      correctAnswer: 2,
      runCompleted: false,
      score: 1,
      answeredCount: 1,
    });
  });

  it('normalizatzen du objektu bakarra', () => {
    const result = normalizeRankedAnswerResult({
      selected_answer: 0,
      is_correct: false,
      correct_answer: 3,
      run_completed: true,
      score: 15,
      answered_count: 20,
    });

    expect(result?.runCompleted).toBe(true);
    expect(result?.correctAnswer).toBe(3);
  });

  it('itxura baliogabea null itzultzen du', () => {
    expect(normalizeRankedAnswerResult([{ selected_answer: 'x' }])).toBeNull();
  });
});

describe('answered question state', () => {
  const base: RankedQuestion = {
    runId: 'run-1',
    gameDate: '2026-06-27',
    questionPosition: 1,
    questionId: 1,
    question: 'Test',
    candidates: ['A', 'B', 'C', 'D'],
    answered: false,
    selectedAnswer: null,
    isCorrect: null,
  };

  it('markatzen du erantzuna bidali ondoren', () => {
    const updated = applyAnswerToQuestion(base, {
      selectedAnswer: 2,
      isCorrect: true,
      correctAnswer: 2,
      runCompleted: false,
      score: 1,
      answeredCount: 1,
    });

    expect(updated.answered).toBe(true);
    expect(updated.selectedAnswer).toBe(2);
    expect(updated.isCorrect).toBe(true);
    expect(updated).not.toHaveProperty('answer');
  });

  it('aurkitzen du hurrengo erantzun gabeko galdera', () => {
    const questions: RankedQuestion[] = [
      { ...base, answered: true, questionPosition: 1 },
      { ...base, questionId: 2, answered: false, questionPosition: 2 },
    ];

    expect(getActiveQuestionIndex(questions)).toBe(1);
    expect(isRunCompleted(questions)).toBe(false);
  });
});

describe('leaderboard ties', () => {
  it('mantentzen du zerbitzariaren rank balioa', () => {
    const entries = [
      { rank: 1, username: 'a', display_name: null, points: 40, days_completed: 4, is_me: false },
      { rank: 1, username: 'b', display_name: null, points: 40, days_completed: 3, is_me: true },
      { rank: 3, username: 'c', display_name: null, points: 30, days_completed: 3, is_me: false },
    ];

    const ranks = entries.map((entry) => entry.rank);
    expect(ranks).toEqual([1, 1, 3]);
  });
});
