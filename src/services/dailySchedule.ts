export const QUESTIONS_PER_DAY = 20;
export const CYCLE_DAYS = 7;
export const GAME_TIMEZONE = 'Europe/Madrid';
export const TABLE_NAME = 'euskera_questions';

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface GameDayInfo {
  gameDate: string;
  cycleIndex: number;
  dayInCycle: number;
}

function getMadridParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: GAME_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function getMadridWeekday(year: number, month: number, day: number): number {
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: GAME_TIMEZONE,
    weekday: 'short',
  }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));

  return WEEKDAY_MAP[label] ?? 0;
}

/** Sunday of the current Madrid week, used as the cycle seed. */
function getWeekCycleIndex(year: number, month: number, day: number): number {
  const weekday = getMadridWeekday(year, month, day);
  const sundayUtc = Date.UTC(year, month - 1, day - weekday);
  return Math.floor(sundayUtc / 86_400_000);
}

/** Game day rolls at 00:01 Europe/Madrid. Weekly cycle starts on Sunday. */
export function getGameDayInfo(now = new Date()): GameDayInfo {
  const { year, month, day, hour, minute } = getMadridParts(now);

  let gameYear = year;
  let gameMonth = month;
  let gameDay = day;

  if (hour === 0 && minute < 1) {
    const previousDay = new Date(Date.UTC(year, month - 1, day - 1));
    gameYear = previousDay.getUTCFullYear();
    gameMonth = previousDay.getUTCMonth() + 1;
    gameDay = previousDay.getUTCDate();
  }

  const gameDate = new Date(Date.UTC(gameYear, gameMonth - 1, gameDay));

  return {
    gameDate: gameDate.toISOString().slice(0, 10),
    cycleIndex: getWeekCycleIndex(gameYear, gameMonth, gameDay),
    dayInCycle: getMadridWeekday(gameYear, gameMonth, gameDay),
  };
}

function hashSeed(value: number): number {
  let seed = value >>> 0;
  seed = Math.imul(seed ^ (seed >>> 16), 0x7feb352d);
  seed = Math.imul(seed ^ (seed >>> 15), 0x846ca68b);
  return (seed ^ (seed >>> 16)) >>> 0;
}

export function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const shuffled = [...items];
  let state = hashSeed(seed);

  for (let i = shuffled.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

export function getDailyQuestionIds(allIds: number[], gameDay: GameDayInfo): number[] {
  const shuffled = shuffleWithSeed(allIds, gameDay.cycleIndex);
  const start = gameDay.dayInCycle * QUESTIONS_PER_DAY;
  const end = start + QUESTIONS_PER_DAY;
  return shuffled.slice(start, end);
}
