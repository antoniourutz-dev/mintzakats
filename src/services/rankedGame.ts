import { supabase } from './supabase';

export type RankedQuestion = {
  runId: string;
  gameDate: string;
  questionPosition: number;
  questionId: number;
  question: string;
  candidates: string[];
  answered: boolean;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
};

export type RankedAnswerResult = {
  selectedAnswer: number;
  isCorrect: boolean;
  correctAnswer: number;
  runCompleted: boolean;
  score: number;
  answeredCount: number;
};

export function normalizeRankedQuestion(row: Record<string, unknown>): RankedQuestion | null {
  const rawCandidates = row.candidates;

  let candidates: unknown = rawCandidates;

  if (typeof rawCandidates === 'string') {
    try {
      candidates = JSON.parse(rawCandidates);
    } catch {
      console.error('Invalid candidates JSON', row);
      return null;
    }
  }

  if (
    typeof row.run_id !== 'string' ||
    typeof row.game_date !== 'string' ||
    typeof row.question_position !== 'number' ||
    typeof row.question_id !== 'number' ||
    typeof row.question !== 'string' ||
    row.question.trim() === '' ||
    !Array.isArray(candidates) ||
    candidates.length !== 4 ||
    !candidates.every((item) => typeof item === 'string')
  ) {
    console.error('Invalid ranked question row', row);
    return null;
  }

  return {
    runId: row.run_id,
    gameDate: row.game_date,
    questionPosition: row.question_position,
    questionId: row.question_id,
    question: row.question,
    candidates,
    answered: row.answered === true,
    selectedAnswer:
      typeof row.selected_answer === 'number'
        ? row.selected_answer
        : null,
    isCorrect:
      typeof row.is_correct === 'boolean'
        ? row.is_correct
        : null,
  };
}

export function normalizeRankedAnswerResult(data: unknown): RankedAnswerResult | null {
  const row = Array.isArray(data) ? data[0] : data;

  if (
    !row ||
    typeof row !== 'object' ||
    typeof (row as Record<string, unknown>).selected_answer !== 'number' ||
    typeof (row as Record<string, unknown>).is_correct !== 'boolean' ||
    typeof (row as Record<string, unknown>).correct_answer !== 'number' ||
    typeof (row as Record<string, unknown>).run_completed !== 'boolean' ||
    typeof (row as Record<string, unknown>).score !== 'number' ||
    typeof (row as Record<string, unknown>).answered_count !== 'number'
  ) {
    console.error('Invalid submit_ranked_answer response', row);
    return null;
  }

  const result = row as Record<string, unknown>;

  return {
    selectedAnswer: result.selected_answer as number,
    isCorrect: result.is_correct as boolean,
    correctAnswer: result.correct_answer as number,
    runCompleted: result.run_completed as boolean,
    score: result.score as number,
    answeredCount: result.answered_count as number,
  };
}

export function applyAnswerToQuestion(
  question: RankedQuestion,
  result: RankedAnswerResult,
): RankedQuestion {
  return {
    ...question,
    answered: true,
    selectedAnswer: result.selectedAnswer,
    isCorrect: result.isCorrect,
  };
}

export function getActiveQuestionIndex(questions: RankedQuestion[]): number {
  const unansweredIndex = questions.findIndex((question) => !question.answered);
  return unansweredIndex === -1 ? Math.max(questions.length - 1, 0) : unansweredIndex;
}

export function isRunCompleted(questions: RankedQuestion[]): boolean {
  return questions.length > 0 && questions.every((question) => question.answered);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Erantzun baliogabea zerbitzaritik.');
  }
  return value as Record<string, unknown>;
}

function mapSupabaseError(error: { message: string; code?: string }) {
  if (error.code === 'PGRST301' || error.message.toLowerCase().includes('jwt')) {
    return new Error('Saioa iraungi da. Hasi saioa berriro.');
  }
  if (error.message.toLowerCase().includes('not authenticated')) {
    return new Error('Saioa hasi behar duzu erronka ofizialean parte hartzeko.');
  }
  if (error.message.toLowerCase().includes('already completed')) {
    return new Error('Gaurko erronka dagoeneko amaitu duzu.');
  }
  if (error.message.toLowerCase().includes('not provisioned')) {
    return new Error('Gaurko erronka oraindik ez dago prest. Saiatu berriro geroago.');
  }
  return new Error(error.message);
}

export async function openTodayRankedGame(): Promise<RankedQuestion[]> {
  const { data, error } = await supabase.rpc('open_today_ranked_game');

  if (error) {
    throw mapSupabaseError(error);
  }

  console.log('open_today_ranked_game raw response', data);

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const questions = rows
    .map((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        return null;
      }
      return normalizeRankedQuestion(row as Record<string, unknown>);
    })
    .filter((question): question is RankedQuestion => question !== null);

  if (questions.length === 0) {
    throw new Error('Galderaren datuak ez dira baliozkoak.');
  }

  return questions;
}

export async function submitRankedAnswer(
  runId: string,
  questionId: number,
  selectedAnswer: number,
): Promise<RankedAnswerResult> {
  const { data, error } = await supabase.rpc('submit_ranked_answer', {
    p_run_id: runId,
    p_question_id: questionId,
    p_selected_answer: selectedAnswer,
  });

  console.log('submit_ranked_answer raw response', { data, error });

  if (error) {
    throw mapSupabaseError(error);
  }

  const result = normalizeRankedAnswerResult(data);

  if (!result) {
    throw new Error('Erantzun baliogabea zerbitzaritik.');
  }

  return result;
}
