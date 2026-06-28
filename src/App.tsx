import { useEffect, useState, type ReactNode } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import { RequireAdmin } from './components/auth/RequireAdmin';
import { HomeView } from './components/HomeView';
import { NavBar } from './components/NavBar';
import { ProgressPanel } from './components/ProgressPanel';
import { RankedGameView } from './components/RankedGameView';
import { WeeklyLeaderboard } from './components/WeeklyLeaderboard';
import { useAppRoute, isAdminPath, type AppPath } from './hooks/useAppRoute';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminPlayersPage } from './pages/AdminPlayersPage';
import { AdminHistoryPage } from './pages/AdminHistoryPage';
import { AdminAnalyticsPage } from './pages/AdminAnalyticsPage';
import { AdminQuestionBankPage } from './pages/AdminQuestionBankPage';
import { AdminAuditPage } from './pages/AdminAuditPage';
import { TrainingPage } from './pages/TrainingPage';

function AdminShell({ children }: { children: ReactNode }) {
  const { path, navigate } = useAppRoute();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <RequireAdmin>
      <div className="min-h-screen bg-neutral-50 text-neutral-900">
        <main className="max-w-6xl mx-auto p-4 sm:p-6 pb-28">{children}</main>
        <NavBar current={path} onNavigate={navigate} onSignIn={() => setAuthOpen(true)} />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    </RequireAdmin>
  );
}

function AppContent() {
  const {
    needsProfileSetup,
    isLoading,
    user,
    profile,
    profileLoadError,
    isAdmin,
  } = useAuth();
  const { path, navigate } = useAppRoute();
  const [authOpen, setAuthOpen] = useState(false);
  const [authStep, setAuthStep] = useState<'sign-in' | 'profile'>('sign-in');

  useEffect(() => {
    if (!isLoading && needsProfileSetup) {
      setAuthStep('profile');
      setAuthOpen(true);
    }
  }, [isLoading, needsProfileSetup]);

  useEffect(() => {
    if (!isLoading && user && !isAdmin && isAdminPath(path)) {
      navigate('/');
    }
  }, [isAdmin, isLoading, navigate, path, user]);

  useEffect(() => {
    if (!isLoading && path === '/admin/entrenamendua' && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, isLoading, navigate, path]);

  const openAuth = (step: 'sign-in' | 'profile' = 'sign-in') => {
    setAuthStep(step);
    setAuthOpen(true);
  };

  const startRanked = () => {
    if (!user) {
      openAuth('sign-in');
      return;
    }
    if (needsProfileSetup) {
      openAuth('profile');
      return;
    }
    navigate('/ranked');
  };

  const showNav =
    path === '/' || path === '/progress' || path === '/leaderboard' || isAdminPath(path);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <p className="font-black text-lg">Kargatzen...</p>
      </div>
    );
  }

  if (user && profileLoadError) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="bg-red-100 border-4 border-red-900 p-6 max-w-lg text-center font-bold">
          {profileLoadError}
        </div>
      </div>
    );
  }

  if (user && !profile) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <p className="font-black text-lg">Profila kargatzen...</p>
      </div>
    );
  }

  if (path === '/ranked') {
    return <RankedGameView onExit={() => navigate('/')} />;
  }

  const adminPages: Partial<Record<AppPath, ReactNode>> = {
    '/admin': <AdminDashboardPage />,
    '/admin/jokalariak': <AdminPlayersPage />,
    '/admin/historia': <AdminHistoryPage />,
    '/admin/analisia': <AdminAnalyticsPage />,
    '/admin/galderak': <AdminQuestionBankPage />,
    '/admin/auditoretza': <AdminAuditPage />,
  };

  if (path in adminPages) {
    return <AdminShell>{adminPages[path]}</AdminShell>;
  }

  if (path === '/admin/entrenamendua') {
    return (
      <RequireAdmin>
        <TrainingPage />
      </RequireAdmin>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <main className={`max-w-3xl mx-auto p-4 sm:p-6 ${showNav ? 'pb-28' : ''}`}>
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
