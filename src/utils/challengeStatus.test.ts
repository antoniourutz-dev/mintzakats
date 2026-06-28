import { describe, expect, it } from 'vitest';
import { formatChallengeStatus } from './challengeStatus';

describe('formatChallengeStatus', () => {
  it('mapeatzen du egoera ezagunak', () => {
    expect(formatChallengeStatus('open')).toBe('Irekita');
    expect(formatChallengeStatus('closed')).toBe('Itxita');
    expect(formatChallengeStatus('draft')).toBe('Zirriborroa');
  });

  it('erakusten du balio ezezaguna parentesi artean', () => {
    expect(formatChallengeStatus('scheduled')).toBe('(scheduled)');
  });

  it('hutsik -> Egoera ezezaguna', () => {
    expect(formatChallengeStatus(null)).toBe('Egoera ezezaguna');
  });
});
