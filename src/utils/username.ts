const USERNAME_PATTERN = /^[a-z0-9_-]{3,24}$/;

export const MINTZAKATS_AUTH_DOMAIN = '@mintzakats.app';

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value.trim().toLowerCase());
}

export function isValidLoginInput(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  if (normalized.endsWith(MINTZAKATS_AUTH_DOMAIN)) {
    const usernamePart = normalized.slice(0, -MINTZAKATS_AUTH_DOMAIN.length);
    return isValidUsername(usernamePart);
  }

  return isValidUsername(normalized);
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeMintzakatsLogin(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return '';
  }

  if (normalized.endsWith(MINTZAKATS_AUTH_DOMAIN)) {
    return normalized;
  }

  return `${normalized}${MINTZAKATS_AUTH_DOMAIN}`;
}

export function mintzakatsEmailFromUsername(username: string): string {
  return normalizeMintzakatsLogin(normalizeUsername(username));
}
