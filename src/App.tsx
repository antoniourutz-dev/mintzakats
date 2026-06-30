import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import { RequireAdmin } from './components/auth/RequireAdmin';
import { HomeView } from './components/HomeView';
import { NavBar } from './components/NavBar';
import { ProgressPanel } from './components/ProgressPanel';
import { WeeklyLeaderboard } from './components/WeeklyLeaderboard';
import { RouteFallback } from './components/RouteFallback';
import { AppBootstrapRecovery } from './components/AppBootstrapRecovery';
import { useAppRoute, AppRouteProvider, isAdminPath, type AppPath } from './hooks/useAppRoute';
import { useLoadingTimeout } from './hooks/useLoadingTimeout';
import { queryClient } from './lib/queryClient';
import { adminNavSafeBottomStyle, navSafeBottomStyle, pageShellStyle } from './styles';

const RankedGameView = lazy(() =>
  import('./components/RankedGameView').then((module) => ({ default: module.RankedGameView })),
);
const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })),
);
const AdminPlayersPage = lazy(() =>
  import('./pages/AdminPlayersPage').then((module) => ({ default: module.AdminPlayersPage })),
);
const AdminHistoryPage = lazy(() =>
  import('./pages/AdminHistoryPage').then((module) => ({ default: module.AdminHistoryPage })),
);
const AdminAnalyticsPage = lazy(() =>
  import('./pages/AdminAnalyticsPage').then((module) => ({ default: module.AdminAnalyticsPage })),
);
const AdminQuestionBankPage = lazy(() =>
  import('./pages/AdminQuestionBankPage').then((module) => ({ default: module.AdminQuestionBankPage })),
);
const AdminWeekChallengePlanPage = lazy(() =>
  import('./pages/AdminWeekChallengePlanPage').then((module) => ({
    default: module.AdminWeekChallengePlanPage,
  })),
);
const AdminAuditPage = lazy(() =>
  import('./pages/AdminAuditPage').then((module) => ({ default: module.AdminAuditPage })),
);
const TrainingPage = lazy(() =>
  import('./pages/TrainingPage').then((module) => ({ default: module.TrainingPage })),
);

function AdminShell({ children }: { children: ReactNode }) {
  const { path, navigate } = useAppRoute();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <RequireAdmin>
      <div className={`${pageShellStyle} bg-neutral-50 text-neutral-900`}>
        <main className={`max-w-6xl mx-auto p-4 sm:p-6 w-full ${adminNavSafeBottomStyle}`}>{children}</main>
        <NavBar current={path} onNavigate={navigate} onSignIn={() => setAuthOpen(true)} />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    </RequireAdmin>
  );
}

function AdminPageContent({ path }: { path: AppPath }) {
  switch (path) {
    case '/admin':
      return <AdminDashboardPage />;
    case '/admin/jokalariak':
      return <AdminPlayersPage />;
    case '/admin/historia':
      return <AdminHistoryPage />;
    case '/admin/analisia':
      return <AdminAnalyticsPage />;
    case '/admin/galderak':
      return <AdminQuestionBankPage />;
    case '/admin/plangintza':
      return <AdminWeekChallengePlanPage />;
    case '/admin/auditoretza':
      return <AdminAuditPage />;
    default:
      return null;
  }
}

function AppContent() {
  const {
    needsProfileSetup,
    isLoading: isSessionLoading,
    isProfileLoading,
    user,
    profile,
    profileLoadError,
    isAdmin,
    signOut,
  } = useAuth();
  const { path, navigate } = useAppRoute();
  const [authOpen, setAuthOpen] = useState(false);
  const [authStep, setAuthStep] = useState<'sign-in' | 'profile'>('sign-in');
  const [rankedEntryId, setRankedEntryId] = useState(0);

  const authReady = !isSessionLoading && (!user || !isProfileLoading);
  const bootstrapTimedOut = useLoadingTimeout(isSessionLoading);

  useEffect(() => {
    if (authReady && needsProfileSetup) {
      setAuthStep('profile');
      setAuthOpen(true);
    }
  }, [authReady, needsProfileSetup]);

  useEffect(() => {
    if (authReady && user && !isAdmin && isAdminPath(path)) {
      navigate('/');
    }
  }, [authReady, isAdmin, navigate, path, user]);

  useEffect(() => {
    if (authReady && path === '/admin/entrenamendua' && !isAdmin) {
      navigate('/');
    }
  }, [authReady, isAdmin, navigate, path]);

  const openAuth = (step: 'sign-in' | 'profile' = 'sign-in') => {
    setAuthStep(step);
    setAuthOpen(true);
  };

  const startRanked = () => {
    if (!user) {
      openAuth('sign-in');
      return;
    }
    if (isProfileLoading) {
      return;
    }
    if (needsProfileSetup) {
      openAuth('profile');
      return;
    }
    setRankedEntryId((current) => current + 1);
    navigate('/ranked');
  };

  const showNav =
    path === '/' || path === '/progress' || path === '/leaderboard' || isAdminPath(path);

  if (isSessionLoading) {
    if (bootstrapTimedOut) {
      return <AppBootstrapRecovery />;
    }
    return <RouteFallback fullScreen />;
  }

  if (user && authReady && (profileLoadError || !profile)) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="bg-red-100 border-4 border-red-900 p-6 max-w-lg text-center space-y-4">
          <p className="font-bold">
            {profileLoadError ?? 'Ez da profilik aurkitu erabiltzaile honentzat.'}
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="bg-white border-4 border-neutral-900 px-4 py-3 font-black w-full"
          >
            Saioa itxi
          </button>
        </div>
      </div>
    );
  }

  if (path === '/ranked') {
    return (
      <Suspense fallback={<RouteFallback fullScreen />}>
        <RankedGameView
          key={rankedEntryId}
          shouldLoadGame
          onExit={() => navigate('/')}
        />
      </Suspense>
    );
  }

  if (isAdminPath(path) && path !== '/admin/entrenamendua') {
    return (
      <AdminShell>
        <Suspense fallback={<RouteFallback />}>
          <AdminPageContent path={path} />
        </Suspense>
      </AdminShell>
    );
  }

  if (path === '/admin/entrenamendua') {
    return (
      <RequireAdmin>
        <Suspense fallback={<RouteFallback fullScreen />}>
          <TrainingPage />
        </Suspense>
      </RequireAdmin>
    );
  }

  return (
    <div className={`${pageShellStyle} bg-neutral-50 text-neutral-900`}>
      <main className={`max-w-3xl mx-auto p-4 sm:p-6 w-full ${showNav ? navSafeBottomStyle : ''}`}>
        {path === '/' && (
          <HomeView
            onStartRanked={startRanked}
            onRequireAuth={() => openAuth('sign-in')}
          />
        )}
        {path === '/progress' && <ProgressPanel onRequireAuth={() => openAuth('sign-in')} />}
        {path === '/leaderboard' && <WeeklyLeaderboard onRequireAuth={() => openAuth('sign-in')} />}
      </main>

      {showNav && (
        <NavBar current={path} onNavigate={navigate} onSignIn={() => openAuth('sign-in')} />
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialStep={authStep} />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouteProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </AppRouteProvider>
    </QueryClientProvider>
  );
}
