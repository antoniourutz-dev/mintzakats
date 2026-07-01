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
  | '/practice'
  | '/admin'
  | '/admin/jokalariak'
  | '/admin/historia'
  | '/admin/analisia'
  | '/admin/galderak'
  | '/admin/plangintza'
  | '/admin/auditoretza'
  | '/admin/entrenamendua';

type RouteState = {
  path: AppPath;
  practiceGameDate: string | null;
};

type AppRouteContextValue = RouteState & {
  navigate: (nextPath: AppPath) => void;
  navigateToPractice: (gameDate: string) => void;
  clearPracticeGameDate: () => void;
};

const AppRouteContext = createContext<AppRouteContextValue | null>(null);

const PRACTICE_DATE_PATTERN = /^\/practice\/(\d{4}-\d{2}-\d{2})$/;

export function getPracticeGameDate(pathname: string): string | null {
  const match = pathname.match(PRACTICE_DATE_PATTERN);
  return match?.[1] ?? null;
}

export function normalizePath(pathname: string): AppPath {
  if (pathname === '/admin/jarduera') {
    return '/admin/historia';
  }

  if (pathname === '/practice' || PRACTICE_DATE_PATTERN.test(pathname)) {
    return '/practice';
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
    '/practice',
    '/',
  ];

  const match = routes.find((route) => route === pathname);
  return match ?? '/';
}

function readRoute(pathname: string): RouteState {
  return {
    path: normalizePath(pathname),
    practiceGameDate: getPracticeGameDate(pathname),
  };
}

export function isAdminPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/');
}

export function AppRouteProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<RouteState>(() => readRoute(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setRoute(readRoute(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((nextPath: AppPath) => {
    window.history.pushState({}, '', nextPath);
    setRoute(readRoute(nextPath));
  }, []);

  const navigateToPractice = useCallback((gameDate: string) => {
    const nextUrl = `/practice/${gameDate}`;
    window.history.pushState({}, '', nextUrl);
    setRoute({ path: '/practice', practiceGameDate: gameDate });
  }, []);

  const clearPracticeGameDate = useCallback(() => {
    window.history.pushState({}, '', '/practice');
    setRoute({ path: '/practice', practiceGameDate: null });
  }, []);

  const value = useMemo(
    () => ({
      ...route,
      navigate,
      navigateToPractice,
      clearPracticeGameDate,
    }),
    [route, navigate, navigateToPractice, clearPracticeGameDate],
  );

  return <AppRouteContext.Provider value={value}>{children}</AppRouteContext.Provider>;
}

export function useAppRoute() {
  const context = useContext(AppRouteContext);
  if (!context) {
    throw new Error('useAppRoute hook AppRouteProvider barruan erabili behar da.');
  }
  return context;
}
