import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

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
  | '/admin/plangintza'
  | '/admin/auditoretza'
  | '/admin/entrenamendua';

type AppRouteContextValue = {
  path: AppPath;
  navigate: (nextPath: AppPath) => void;
};

const AppRouteContext = createContext<AppRouteContextValue | null>(null);

export function normalizePath(pathname: string): AppPath {
  if (pathname === '/admin/jarduera') {
    return '/admin/historia';
  }

  const routes: AppPath[] = [
    '/admin/jokalariak',
    '/admin/historia',
    '/admin/analisia',
    '/admin/galderak',
    '/admin/plangintza',
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

export function AppRouteProvider({ children }: { children: ReactNode }) {
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

  const value = useMemo(() => ({ path, navigate }), [path, navigate]);

  return <AppRouteContext.Provider value={value}>{children}</AppRouteContext.Provider>;
}

export function useAppRoute() {
  const context = useContext(AppRouteContext);
  if (!context) {
    throw new Error('useAppRoute hook AppRouteProvider barruan erabili behar da.');
  }
  return context;
}
