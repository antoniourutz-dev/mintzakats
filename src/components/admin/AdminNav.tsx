import { useAppRoute } from '../../hooks/useAppRoute';
import { buttonBaseStyle } from '../../styles';

const links = [
  { path: '/admin' as const, label: 'Laburpena' },
  { path: '/admin/jokalariak' as const, label: 'Jokalariak' },
  { path: '/admin/historia' as const, label: 'Historia' },
  { path: '/admin/analisia' as const, label: 'Analisia' },
  { path: '/admin/galderak' as const, label: 'Galderak' },
  { path: '/admin/auditoretza' as const, label: 'Auditoretza' },
  { path: '/admin/entrenamendua' as const, label: 'Entrenamendua' },
];

export function AdminNav() {
  const { path, navigate } = useAppRoute();

  return (
    <nav className="flex flex-wrap gap-2 mb-6" aria-label="Kudeaketa">
      {links.map((link) => (
        <button
          key={link.path}
          type="button"
          onClick={() => navigate(link.path)}
          className={`${buttonBaseStyle} px-3 py-2 text-xs sm:text-sm ${
            path === link.path ? 'bg-indigo-500' : 'bg-white'
          }`}
        >
          {link.label}
        </button>
      ))}
    </nav>
  );
}
