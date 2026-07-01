import { describe, expect, it } from 'vitest';
import {
  filterPastCatalogEntries,
  formatOfficialCatalogResult,
  isPracticeRunCompleted,
  normalizeCatalogEntry,
  normalizePracticeAnswerResult,
  normalizePracticeQuestion,
} from './pastChallengePractice';

describe('normalizePracticeQuestion', () => {
  it('sortzen du galdera baliozko bat snake_case erabiliz', () => {
    const question = normalizePracticeQuestion({
      practice_run_id: 'practice-1',
      game_date: '2026-06-28',
      question_position: '3',
      question_id: '42',
      question: 'Kaixo?',
      candidates: '["A","B","C","D"]',
      answered: false,
      selected_answer: null,
      is_correct: null,
    });

    expect(question).not.toBeNull();
    expect(question?.practiceRunId).toBe('practice-1');
    expect(question?.questionPosition).toBe(3);
    expect(question?.questionId).toBe(42);
    expect(question).not.toHaveProperty('answer');
  });
});

describe('normalizePracticeAnswerResult', () => {
  it('onartzen du zenbakiak string gisa', () => {
    const result = normalizePracticeAnswerResult({
      selected_answer: '1',
      is_correct: true,
      correct_answer: '2',
      run_completed: false,
      score: '5',
      answered_count: '6',
    });

    expect(result).toEqual({
      selectedAnswer: 1,
      isCorrect: true,
      correctAnswer: 2,
      runCompleted: false,
      score: 5,
      answeredCount: 6,
    });
  });
});

describe('catalog helpers', () => {
  it('ez du erakusten gaurko eguna ezta etorkizuna', () => {
    const entries = filterPastCatalogEntries(
      [
        {
          gameDate: '2026-06-30',
          officialScore: 10,
          officialTotal: 20,
          officialCompleted: true,
          practiceCount: 1,
        },
        {
          gameDate: '2026-07-01',
          officialScore: null,
          officialTotal: 20,
          officialCompleted: false,
          practiceCount: 0,
        },
      ],
      '2026-07-01',
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]?.gameDate).toBe('2026-06-30');
  });

  it('formatua ematen du emaitza ofizialerako', () => {
    expect(
      formatOfficialCatalogResult({
        gameDate: '2026-06-28',
        officialScore: 13,
        officialTotal: 20,
        officialCompleted: true,
        practiceCount: 2,
      }),
    ).toBe('13 / 20');

    expect(
      formatOfficialCatalogResult(
        normalizeCatalogEntry({
          game_date: '2026-06-27',
          official_status: 'started',
          practice_count: 0,
        })!,
      ),
    ).toBe('Ez eginda');
  });
});

describe('isPracticeRunCompleted', () => {
  it('true da galdera guztiak erantzunda daudenean', () => {
    expect(
      isPracticeRunCompleted([
        {
          practiceRunId: 'p1',
          gameDate: '2026-06-28',
          questionPosition: 1,
          questionId: 1,
          question: 'Q',
          candidates: ['a', 'b', 'c', 'd'],
          answered: true,
          selectedAnswer: 0,
          isCorrect: true,
        },
      ]),
    ).toBe(true);
  });
});
