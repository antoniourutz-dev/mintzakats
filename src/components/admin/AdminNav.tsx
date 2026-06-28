import { useAppRoute } from '../../hooks/useAppRoute';
import { buttonBaseStyle } from '../../styles';

const links = [
  { path: '/admin' as const, label: 'Laburpena' },
  { path: '/admin/jokalariak' as const, label: 'Jokalariak' },
  { path: '/admin/jarduera' as const, label: 'Jarduera' },
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
          className={`${buttonBaseStyle} px-4 py-2 text-sm ${
            path === link.path ? 'bg-indigo-500' : 'bg-white'
          }`}
        >
          {link.label}
        </button>
      ))}
    </nav>
  );
}
