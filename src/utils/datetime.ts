export const EU_LOCALE = 'eu-ES';
export const MADRID_TIMEZONE = 'Europe/Madrid';

const madridDateFormatter = new Intl.DateTimeFormat(EU_LOCALE, {
  timeZone: MADRID_TIMEZONE,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const madridCompactDateFormatter = new Intl.DateTimeFormat(EU_LOCALE, {
  timeZone: MADRID_TIMEZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const madridTimeFormatter = new Intl.DateTimeFormat(EU_LOCALE, {
  timeZone: MADRID_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const madridIsoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: MADRID_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function parseDateInput(value: string): Date {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00`);
  }

  return new Date(trimmed);
}

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

export function formatMadridDate(value: string | null | undefined): string {
  if (!value) return '—';

  const date = parseDateInput(value);
  if (Number.isNaN(date.getTime())) return '—';

  return madridDateFormatter.format(date);
}

export function formatGameDate(value: string | null | undefined): string {
  return formatMadridDate(value);
}

export function formatMadridTime(value: string | null | undefined): string {
  if (!value || isDateOnly(value)) return '—';

  const date = parseDateInput(value);
  if (Number.isNaN(date.getTime())) return '—';

  return madridTimeFormatter.format(date);
}

export function formatMadridDateTime(value: string | null | undefined): string {
  if (!value) return '—';

  const trimmed = value.trim();
  if (isDateOnly(trimmed)) {
    return formatMadridDate(trimmed);
  }

  const date = parseDateInput(trimmed);
  if (Number.isNaN(date.getTime())) return '—';

  return `${formatMadridDate(trimmed)}, ${formatMadridTime(trimmed)}`;
}

export function formatWeekRange(weekStart: string): string {
  if (!weekStart) return '—';

  const start = parseDateInput(weekStart);
  if (Number.isNaN(start.getTime())) return '—';

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return `${madridCompactDateFormatter.format(start)} – ${madridCompactDateFormatter.format(end)}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes} min ${rest} s`;
}

export function getMadridTodayDate(): string {
  return madridIsoDateFormatter.format(new Date());
}

export function isWithinLastDays(value: string | null | undefined, days: number): boolean {
  if (!value) return false;
  const target = new Date(value).getTime();
  const cutoff = Date.now() - days * 86_400_000;
  return target >= cutoff;
}

export function playedOnMadridDate(value: string | null | undefined, gameDate: string): boolean {
  if (!value) return false;
  const playedDate = madridIsoDateFormatter.format(new Date(value));
  return playedDate === gameDate;
}
