import { Question } from '../types';
import { supabase } from './supabase';
import {
  TABLE_NAME,
  getDailyQuestionIds,
  getGameDayInfo,
  type GameDayInfo,
} from './dailySchedule';

const PAGE_SIZE = 1000;

type RawQuestionRow = Record<string, unknown>;

function parseCandidates(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : null;
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeQuestion(row: RawQuestionRow): Question | null {
  const rawId = row.id ?? row.question_id;
  const question = row.question ?? row.pregunta ?? row.text;
  const candidates = parseCandidates(row.candidates ?? row.opciones ?? row.options);
  const rawAnswer = row.answer ?? row.respuesta ?? row.correct_answer ?? row.respuesta_correcta;

  if (rawId === undefined || rawId === null) return null;
  if (typeof question !== 'string' || !question.trim()) return null;
  if (!candidates?.length) return null;

  const answer = Number(rawAnswer);
  if (!Number.isInteger(answer) || answer < 0 || answer >= candidates.length) return null;

  return {
    id: Number(rawId),
    question,
    candidates,
    answer,
  };
}

function formatSupabaseError(error: { message: string; code?: string; details?: string }) {
  return [error.message, error.details, error.code ? `(${error.code})` : '']
    .filter(Boolean)
    .join(' ');
}

async function fetchQuestionPage(offset: number) {
  return supabase
    .from(TABLE_NAME)
    .select('*')
    .order('id', { ascending: true, nullsFirst: false })
    .range(offset, offset + PAGE_SIZE - 1);
}

export async function fetchAllQuestions(): Promise<Question[]> {
  const questions: Question[] = [];
  let offset = 0;
  let schemaError: string | null = null;

  while (true) {
    const { data, error } = await fetchQuestionPage(offset);

    if (error) {
      if (error.code === '42703') {
        const fallback = await supabase
          .from(TABLE_NAME)
          .select('*')
          .range(offset, offset + PAGE_SIZE - 1);

        if (fallback.error) {
          throw new Error(formatSupabaseError(fallback.error));
        }

        if (!fallback.data?.length) break;

        for (const row of fallback.data) {
          const question = normalizeQuestion(row);
          if (!question) {
            schemaError =
              'Taularen zutabeak ez datoz bat. Beharrezkoak: id, question, candidates, answer.';
            continue;
          }
          questions.push(question);
        }

        if (fallback.data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
        continue;
      }

      throw new Error(formatSupabaseError(error));
    }

    if (!data?.length) break;

    for (const row of data) {
      const question = normalizeQuestion(row);
      if (!question) {
        schemaError =
          'Taularen zutabeak ez datoz bat. Beharrezkoak: id, question, candidates, answer.';
        continue;
      }
      questions.push(question);
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  if (questions.length === 0) {
    const { count, error: countError } = await supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(formatSupabaseError(countError));
    }

    if (schemaError) {
      throw new Error(schemaError);
    }

    if ((count ?? 0) > 0) {
      throw new Error(
        'Galderak existitzen dira, baina ezin dira irakurri. Egiaztatu RLS politika publikoa duen (SELECT anon).',
      );
    }

    throw new Error(
      'Ez da galderarik aurkitu datu-basean. Egiaztatu euskera_questions taulak datuak dituela.',
    );
  }

  return questions;
}

export async function fetchTodaysQuestions(
  gameDay: GameDayInfo = getGameDayInfo(),
): Promise<Question[]> {
  const allQuestions = await fetchAllQuestions();
  const allIds = allQuestions.map((question) => question.id);
  const dailyIds = getDailyQuestionIds(allIds, gameDay);

  if (dailyIds.length === 0) {
    throw new Error('Gaurko egunerako galdera nahikorik ez dago. Saiatu berriro bihar.');
  }

  const byId = new Map(allQuestions.map((question) => [question.id, question]));
  const questions = dailyIds
    .map((id) => byId.get(id))
    .filter((question): question is Question => question !== undefined);

  if (questions.length === 0) {
    throw new Error('Ezin izan dira gaurko galderak kargatu.');
  }

  return questions;
}
