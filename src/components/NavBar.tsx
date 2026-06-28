import {
  Home,
  BarChart3,
  Trophy,
  LogOut,
  LogIn,
  Settings,
  Dumbbell,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { AppPath } from '../hooks/useAppRoute';
import { isAdminPath } from '../hooks/useAppRoute';

type NavBarProps = {
  current: AppPath;
  onNavigate: (view: AppPath) => void;
  onSignIn: () => void;
};

const playerItems: Array<{ id: AppPath; label: string; icon: typeof Home }> = [
  { id: '/', label: 'Hasiera', icon: Home },
  { id: '/progress', label: 'Nire aurrerapena', icon: BarChart3 },
  { id: '/leaderboard', label: 'Asteko sailkapena', icon: Trophy },
];

const adminItems: Array<{ id: AppPath; label: string; icon: typeof Home }> = [
  { id: '/', label: 'Hasiera', icon: Home },
  { id: '/progress', label: 'Nire aurrerapena', icon: BarChart3 },
  { id: '/leaderboard', label: 'Asteko sailkapena', icon: Trophy },
  { id: '/admin', label: 'Kudeaketa', icon: Settings },
  { id: '/admin/entrenamendua', label: 'Entrenamendua', icon: Dumbbell },
];

export function NavBar({ current, onNavigate, onSignIn }: NavBarProps) {
  const { user, profile, signOut, isAdmin } = useAuth();
  const items = isAdmin ? adminItems : playerItems;
  const activePath = isAdminPath(current) ? current : current;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-neutral-900 z-40"
      aria-label="Nagusia"
    >
      <div className="max-w-6xl mx-auto px-2 py-2 flex items-center justify-between gap-2">
        <div className="flex gap-1 flex-1 overflow-x-auto">
          {items.map(({ id, label, icon: Icon }) => {
            const active =
              id === '/admin'
                ? current === '/admin' ||
                  current === '/admin/jokalariak' ||
                  current === '/admin/jarduera'
                : activePath === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className={`min-w-[4.5rem] px-2 py-2 text-[10px] sm:text-xs font-black uppercase border-4 border-neutral-900 focus-visible:outline focus-visible:outline-4 focus-visible:outline-indigo-500 ${
                  active
                    ? 'bg-indigo-500 text-neutral-900 shadow-[3px_3px_0_0_rgba(23,23,23,1)]'
                    : 'bg-white text-neutral-900'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={16} className="mx-auto mb-1" />
                <span className="block truncate">{label}</span>
              </button>
            );
          })}
        </div>

        {user ? (
          <button
            type="button"
            onClick={() => void signOut()}
            className="shrink-0 border-4 border-neutral-900 p-2 bg-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-indigo-500"
            aria-label="Saioa itxi"
            title={profile?.display_name ?? profile?.username ?? 'Erabiltzailea'}
          >
            <LogOut size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="shrink-0 border-4 border-neutral-900 p-2 bg-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-indigo-500"
            aria-label="Hasi saioa"
          >
            <LogIn size={18} />
          </button>
        )}
      </div>
    </nav>
  );
}
