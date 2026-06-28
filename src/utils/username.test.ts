import { describe, expect, it } from 'vitest';
import {
  isValidLoginInput,
  mintzakatsEmailFromUsername,
  normalizeMintzakatsLogin,
} from './username';

describe('normalizeMintzakatsLogin', () => {
  it('gehitu domaina erabiltzaile-izen soil bati', () => {
    expect(normalizeMintzakatsLogin('ikasle005')).toBe('ikasle005@mintzakats.app');
  });

  it('mantendu posta osoa bada', () => {
    expect(normalizeMintzakatsLogin('ikasle005@mintzakats.app')).toBe('ikasle005@mintzakats.app');
  });

  it('normalizatzen du maiuskulak eta zuriuneak', () => {
    expect(normalizeMintzakatsLogin('  IKASLE005  ')).toBe('ikasle005@mintzakats.app');
  });
});

describe('isValidLoginInput', () => {
  it('onartzen du erabiltzaile-izen baliozkoa', () => {
    expect(isValidLoginInput('ikasle005')).toBe(true);
  });

  it('onartzen du posta osoa bateragarritasunerako', () => {
    expect(isValidLoginInput('ikasle005@mintzakats.app')).toBe(true);
  });

  it('ez du onartzen izen laburregia', () => {
    expect(isValidLoginInput('ab')).toBe(false);
  });
});

describe('mintzakatsEmailFromUsername', () => {
  it('eraikitzen du admin sortzerako posta', () => {
    expect(mintzakatsEmailFromUsername('ikasle006')).toBe('ikasle006@mintzakats.app');
  });
});
