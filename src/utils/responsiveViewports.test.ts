import { describe, expect, it } from 'vitest';
import { RESPONSIVE_ROUTES, RESPONSIVE_VIEWPORTS } from './responsiveViewports';

describe('responsive viewports checklist', () => {
  it('definitzen ditu probatzeko pantaila-zabalera gakoak', () => {
    expect(RESPONSIVE_VIEWPORTS).toEqual([320, 375, 390, 768, 1024]);
  });

  it('definitzen ditu probatzeko ibilbide nagusiak', () => {
    expect(RESPONSIVE_ROUTES.map((route) => route.path)).toContain('/admin/jokalariak');
    expect(RESPONSIVE_ROUTES.map((route) => route.path)).toContain('/admin/plangintza');
  });
});
