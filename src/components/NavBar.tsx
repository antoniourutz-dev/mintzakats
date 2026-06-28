import { useState } from 'react';
import {
  Home,
  BarChart3,
  Trophy,
  LogOut,
  LogIn,
  Settings,
  Dumbbell,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { AppPath } from '../hooks/useAppRoute';
import { isAdminPath } from '../hooks/useAppRoute';

type NavBarProps = {
  current: AppPath;
  onNavigate: (view: AppPath) => void;
  onSignIn: () => void;
};

type NavItem = { id: AppPath; label: string; icon: typeof Home };

const playerItems: NavItem[] = [
  { id: '/', label: 'Hasiera', icon: Home },
  { id: '/progress', label: 'Nire aurrerapena', icon: BarChart3 },
  { id: '/leaderboard', label: 'Asteko sailkapena', icon: Trophy },
];

const adminItems: NavItem[] = [
  { id: '/', label: 'Hasiera', icon: Home },
  { id: '/progress', label: 'Nire aurrerapena', icon: BarChart3 },
  { id: '/leaderboard', label: 'Asteko sailkapena', icon: Trophy },
  { id: '/admin', label: 'Kudeaketa', icon: Settings },
  { id: '/admin/entrenamendua', label: 'Entrenamendua', icon: Dumbbell },
];

function isItemActive(current: AppPath, id: AppPath): boolean {
  if (id === '/admin') {
    return isAdminPath(current);
  }
  return current === id;
}

function NavButton({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: (view: AppPath) => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => onNavigate(item.id)}
      className={`w-full flex flex-col items-center justify-center gap-1 p-2 min-h-[4.25rem] border-4 border-neutral-900 text-[10px] sm:text-xs font-black leading-tight text-center whitespace-normal break-anywhere focus-visible:outline focus-visible:outline-4 focus-visible:outline-indigo-500 ${
        active
          ? 'bg-indigo-500 text-neutral-900 shadow-[3px_3px_0_0_rgba(23,23,23,1)]'
          : 'bg-white text-neutral-900'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={16} aria-hidden="true" />
      <span>{item.label}</span>
    </button>
  );
}

export function NavBar({ current, onNavigate, onSignIn }: NavBarProps) {
  const { user, profile, signOut, isAdmin } = useAuth();
  const items = isAdmin ? adminItems : playerItems;
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavigate = (path: AppPath) => {
    onNavigate(path);
    setMenuOpen(false);
  };

  return (
    <>
      {menuOpen && isAdmin && (
        <div
          className="fixed inset-0 z-40 bg-neutral-900/50 md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {menuOpen && isAdmin && (
        <div
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 md:hidden px-2"
          role="dialog"
          aria-label="Nabigazio menua"
        >
          <div className="bg-white border-4 border-neutral-900 p-3 shadow-[6px_6px_0_0_rgba(23,23,23,1)] max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="font-black text-sm uppercase">Menua</p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="border-4 border-neutral-900 p-2 bg-white"
                aria-label="Itxi menua"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {items.map((item) => (
                <div key={item.id}>
                  <NavButton
                    item={item}
                    active={isItemActive(current, item.id)}
                    onNavigate={handleNavigate}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 w-full max-w-full bg-white border-t-4 border-neutral-900 z-40 pb-[env(safe-area-inset-bottom)]"
        aria-label="Nagusia"
      >
        <div className="w-full max-w-6xl mx-auto px-2 py-2">
          {isAdmin ? (
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-stretch md:grid-cols-6">
              <div className="hidden md:contents">
                {items.map((item) => (
                  <div key={item.id} className="contents">
                    <NavButton
                      item={item}
                      active={isItemActive(current, item.id)}
                      onNavigate={handleNavigate}
                    />
                  </div>
                ))}
              </div>
              <div className="contents md:hidden">
                <NavButton
                  item={items[0]}
                  active={isItemActive(current, items[0].id)}
                  onNavigate={handleNavigate}
                />
                <NavButton
                  item={items[1]}
                  active={isItemActive(current, items[1].id)}
                  onNavigate={handleNavigate}
                />
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex flex-col items-center justify-center gap-1 p-2 min-h-[4.25rem] border-4 border-neutral-900 bg-white text-[10px] font-black leading-tight"
                  aria-expanded={menuOpen}
                  aria-label="Ireki menua"
                >
                  <Menu size={16} />
                  <span>Menua</span>
                </button>
              </div>
              <div className="flex items-stretch justify-end md:col-span-1">
                {user ? (
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="h-full border-4 border-neutral-900 px-3 bg-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-indigo-500"
                    aria-label="Saioa itxi"
                    title={profile?.display_name ?? profile?.username ?? 'Erabiltzailea'}
                  >
                    <LogOut size={18} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="h-full border-4 border-neutral-900 px-3 bg-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-indigo-500"
                    aria-label="Hasi saioa"
                  >
                    <LogIn size={18} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-stretch">
              {items.map((item) => (
                <div key={item.id}>
                  <NavButton
                    item={item}
                    active={isItemActive(current, item.id)}
                    onNavigate={handleNavigate}
                  />
                </div>
              ))}
              <div className="flex items-stretch">
                {user ? (
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="h-full border-4 border-neutral-900 px-3 bg-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-indigo-500"
                    aria-label="Saioa itxi"
                    title={profile?.display_name ?? profile?.username ?? 'Erabiltzailea'}
                  >
                    <LogOut size={18} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="h-full border-4 border-neutral-900 px-3 bg-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-indigo-500"
                    aria-label="Hasi saioa"
                  >
                    <LogIn size={18} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
