export function formatChallengeStatus(status: string | null | undefined): string {
  const normalized = String(status ?? '').toLowerCase();

  const labels: Record<string, string> = {
    open: 'Irekita',
    closed: 'Itxita',
    draft: 'Zirriborroa',
  };

  if (labels[normalized]) {
    return labels[normalized];
  }

  if (!normalized) {
    return 'Egoera ezezaguna';
  }

  if (import.meta.env.DEV) {
    console.warn('Unknown challenge_status value', status);
  }

  return `(${status})`;
}
