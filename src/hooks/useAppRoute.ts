import { useCallback, useEffect, useState } from 'react';

export type AppPath =
  | '/'
  | '/progress'
  | '/leaderboard'
  | '/ranked'
  | '/admin'
  | '/admin/jokalariak'
  | '/admin/historia'
  | '/admin/analisia'
  | '/admin/galderak'
  | '/admin/auditoretza'
  | '/admin/entrenamendua';

export function useAppRoute() {
  const [path, setPath] = useState<AppPath>(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setPath(normalizePath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((nextPath: AppPath) => {
    window.history.pushState({}, '', nextPath);
    setPath(nextPath);
  }, []);

  return { path, navigate };
}

export function normalizePath(pathname: string): AppPath {
  if (pathname === '/admin/jarduera') {
    return '/admin/historia';
  }

  const routes: AppPath[] = [
    '/admin/jokalariak',
    '/admin/historia',
    '/admin/analisia',
    '/admin/galderak',
    '/admin/auditoretza',
    '/admin/entrenamendua',
    '/admin',
    '/progress',
    '/leaderboard',
    '/ranked',
    '/',
  ];

  const match = routes.find((route) => route === pathname);
  return match ?? '/';
}

export function isAdminPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/');
}
