import { supabase } from './supabase';
import { getGameDayInfo } from './dailySchedule';
import { toFiniteNumber } from './progress';

export type PracticeQuestion = {
  practiceRunId: string;
  gameDate: string;
  questionPosition: number;
  questionId: number;
  question: string;
  candidates: string[];
  answered: boolean;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
};

export type PracticeAnswerResult = {
  selectedAnswer: number;
  isCorrect: boolean;
  correctAnswer: number;
  runCompleted: boolean;
  score: number;
  answeredCount: number;
};

export type PastChallengeCatalogEntry = {
  gameDate: string;
  officialScore: number | null;
  officialTotal: number;
  officialCompleted: boolean;
  practiceCount: number;
};

function toOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function parseCandidates(rawCandidates: unknown): string[] | null {
  let candidates: unknown = rawCandidates;

  if (typeof rawCandidates === 'string') {
    try {
      candidates = JSON.parse(rawCandidates);
    } catch {
      return null;
    }
  }

  if (
    !Array.isArray(candidates) ||
    candidates.length !== 4 ||
    !candidates.every((item) => typeof item === 'string')
  ) {
    return null;
  }

  return candidates;
}

export function normalizePracticeQuestion(row: Record<string, unknown>): PracticeQuestion | null {
  const candidates = parseCandidates(row.candidates);
  const practiceRunId = row.practice_run_id;
  const gameDate = row.game_date;
  const question = row.question;
  const questionPosition = toOptionalNumber(row.question_position);
  const questionId = toOptionalNumber(row.question_id);

  if (
    typeof practiceRunId !== 'string' ||
    typeof gameDate !== 'string' ||
    typeof question !== 'string' ||
    question.trim() === '' ||
    questionPosition === null ||
    questionId === null ||
    !candidates
  ) {
    console.error('Invalid practice question row', row);
    return null;
  }

  const selectedAnswer = toOptionalNumber(row.selected_answer);
  const isCorrect =
    typeof row.is_correct === 'boolean'
      ? row.is_correct
      : row.is_correct === 'true'
        ? true
        : row.is_correct === 'false'
          ? false
          : null;

  return {
    practiceRunId,
    gameDate,
    questionPosition,
    questionId,
    question,
    candidates,
    answered: row.answered === true || row.answered === 'true',
    selectedAnswer,
    isCorrect,
  };
}

export function normalizePracticeAnswerResult(data: unknown): PracticeAnswerResult | null {
  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== 'object') {
    return null;
  }

  const record = row as Record<string, unknown>;
  const selectedAnswer = toOptionalNumber(record.selected_answer);
  const correctAnswer = toOptionalNumber(record.correct_answer);
  const score = toOptionalNumber(record.score);
  const answeredCount = toOptionalNumber(record.answered_count);

  if (
    selectedAnswer === null ||
    correctAnswer === null ||
    score === null ||
    answeredCount === null
  ) {
    console.error('Invalid submit_past_challenge_practice_answer response', row);
    return null;
  }

  const isCorrect =
    record.is_correct === true || record.is_correct === 'true';
  const runCompleted =
    record.run_completed === true || record.run_completed === 'true';

  if (
    typeof record.is_correct !== 'boolean' &&
    record.is_correct !== 'true' &&
    record.is_correct !== 'false'
  ) {
    console.error('Invalid submit_past_challenge_practice_answer response', row);
    return null;
  }

  if (
    typeof record.run_completed !== 'boolean' &&
    record.run_completed !== 'true' &&
    record.run_completed !== 'false'
  ) {
    console.error('Invalid submit_past_challenge_practice_answer response', row);
    return null;
  }

  return {
    selectedAnswer,
    isCorrect,
    correctAnswer,
    runCompleted,
    score,
    answeredCount,
  };
}

export function normalizeCatalogEntry(row: Record<string, unknown>): PastChallengeCatalogEntry | null {
  const gameDate = String(row.game_date ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(gameDate)) {
    return null;
  }

  const status = String(row.official_status ?? row.status ?? '').toLowerCase();
  const officialScore = toOptionalNumber(row.official_score ?? row.score);
  const officialTotal = toOptionalNumber(row.official_total ?? row.total) ?? 20;
  const practiceCount = toFiniteNumber(row.practice_count ?? row.practice_sessions ?? 0);
  const officialCompleted =
    status === 'completed' ||
    row.official_completed === true ||
    row.completed === true ||
    (officialScore !== null && status !== 'started' && status !== 'in_progress');

  return {
    gameDate,
    officialScore,
    officialTotal,
    officialCompleted,
    practiceCount,
  };
}

export function filterPastCatalogEntries(
  entries: PastChallengeCatalogEntry[],
  todayGameDate = getGameDayInfo().gameDate,
): PastChallengeCatalogEntry[] {
  return [...entries]
    .filter((entry) => entry.gameDate < todayGameDate)
    .sort((a, b) => b.gameDate.localeCompare(a.gameDate));
}

export function formatOfficialCatalogResult(entry: PastChallengeCatalogEntry): string {
  if (!entry.officialCompleted || entry.officialScore === null) {
    return 'Ez eginda';
  }
  return `${entry.officialScore} / ${entry.officialTotal}`;
}

export function applyAnswerToPracticeQuestion(
  question: PracticeQuestion,
  result: PracticeAnswerResult,
): PracticeQuestion {
  return {
    ...question,
    answered: true,
    selectedAnswer: result.selectedAnswer,
    isCorrect: result.isCorrect,
  };
}

export function getActivePracticeQuestionIndex(questions: PracticeQuestion[]): number {
  const unansweredIndex = questions.findIndex((question) => !question.answered);
  return unansweredIndex === -1 ? Math.max(questions.length - 1, 0) : unansweredIndex;
}

export function isPracticeRunCompleted(questions: PracticeQuestion[]): boolean {
  return questions.length > 0 && questions.every((question) => question.answered);
}

function mapPracticeError(error: { message: string; code?: string }) {
  if (error.code === 'PGRST301' || error.message.toLowerCase().includes('jwt')) {
    return new Error('Saioa iraungi da. Hasi saioa berriro.');
  }
  if (error.message.toLowerCase().includes('not authenticated')) {
    return new Error('Saioa hasi behar duzu praktika egiteko.');
  }
  return new Error(error.message);
}

export function toPracticeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ezin izan da praktika kargatu.';
}

function parseOpenPracticeResponse(data: unknown): PracticeQuestion[] {
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const questions = rows
    .map((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        return null;
      }
      return normalizePracticeQuestion(row as Record<string, unknown>);
    })
    .filter((question): question is PracticeQuestion => question !== null);

  if (questions.length === 0) {
    throw new Error('Galderaren datuak ez dira baliozkoak.');
  }

  return questions;
}

export async function fetchPastChallengeCatalog(
  limit = 30,
): Promise<PastChallengeCatalogEntry[]> {
  const { data, error } = await supabase.rpc('get_my_past_challenge_catalog', {
    p_limit: limit,
  });

  if (import.meta.env.DEV) {
    console.log('get_my_past_challenge_catalog raw response', { data, error });
  }

  if (error) {
    throw mapPracticeError(error);
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return filterPastCatalogEntries(
    rows
      .map((row) => normalizeCatalogEntry(row as Record<string, unknown>))
      .filter((entry): entry is PastChallengeCatalogEntry => entry !== null),
  );
}

export async function openPastChallengePractice(gameDate: string): Promise<PracticeQuestion[]> {
  if (import.meta.env.DEV) {
    console.count('[RPC] open_past_challenge_practice');
  }

  const { data, error } = await supabase.rpc('open_past_challenge_practice', {
    p_game_date: gameDate,
  });

  if (import.meta.env.DEV) {
    console.log('open_past_challenge_practice raw response', { data, error });
  }

  if (error) {
    throw mapPracticeError(error);
  }

  return parseOpenPracticeResponse(data);
}

export async function submitPastChallengePracticeAnswer(
  practiceRunId: string,
  questionId: number,
  selectedAnswer: number,
): Promise<PracticeAnswerResult> {
  const { data, error } = await supabase.rpc('submit_past_challenge_practice_answer', {
    p_practice_run_id: practiceRunId,
    p_question_id: questionId,
    p_selected_answer: selectedAnswer,
  });

  if (import.meta.env.DEV) {
    console.log('submit_past_challenge_practice_answer raw response', { data, error });
  }

  if (error) {
    throw mapPracticeError(error);
  }

  const result = normalizePracticeAnswerResult(data);
  if (!result) {
    throw new Error('Erantzun baliogabea zerbitzaritik.');
  }

  return result;
}
