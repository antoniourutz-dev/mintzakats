/** Anchos de viewport para QA visual manual y automatizada. */
export const RESPONSIVE_VIEWPORTS = [320, 375, 390, 768, 1024] as const;

export const RESPONSIVE_ROUTES = [
  { path: '/', label: 'Hasiera' },
  { path: '/progress', label: 'Nire aurrerapena' },
  { path: '/leaderboard', label: 'Asteko sailkapena' },
  { path: '/ranked', label: 'Joko eguna' },
  { path: '/admin', label: 'Kudeaketa' },
  { path: '/admin/jokalariak', label: 'Jokalariak' },
  { path: '/admin/plangintza', label: 'Erronken plangintza' },
  { path: '/admin/galderak', label: 'Galdera-bankua' },
  { path: '/admin/analisia', label: 'Analisia' },
] as const;
