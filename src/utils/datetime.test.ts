import { describe, expect, it } from 'vitest';
import {
  formatGameDate,
  formatMadridDateTime,
  formatMadridTime,
  formatWeekRange,
} from './datetime';

describe('datetime formatting (eu-ES, 24h)', () => {
  it('formatMadridDateTime erabiltzen du data euskaraz eta ordua 24h formatuan', () => {
    const formatted = formatMadridDateTime('2026-06-28T11:14:00Z');

    expect(formatted).toMatch(/ekainaren/i);
    expect(formatted).not.toMatch(/PM|AM/i);
    expect(formatted).toMatch(/13:14|14:14/);
  });

  it('formatMadridTime itzultzen du HH:mm soilik', () => {
    const formatted = formatMadridTime('2026-06-28T11:14:00Z');

    expect(formatted).toMatch(/^\d{2}:\d{2}$/);
    expect(formatted).not.toMatch(/PM|AM/i);
  });

  it('formatGameDate itzultzen du data euskaraz ISO data bakarretik', () => {
    const formatted = formatGameDate('2026-06-28');

    expect(formatted).toMatch(/ekainaren/i);
    expect(formatted).not.toMatch(/PM|AM/i);
  });

  it('formatWeekRange itzultzen du tartea euskaraz', () => {
    const formatted = formatWeekRange('2026-06-22');

    expect(formatted).toContain('–');
    expect(formatted).not.toMatch(/PM|AM/i);
  });
});
