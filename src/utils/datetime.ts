export function formatMadridDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('eu-ES', {
    timeZone: 'Europe/Madrid',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}
