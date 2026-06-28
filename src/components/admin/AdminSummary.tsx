import { useEffect, useState } from 'react';
import { getAdminDashboard } from '../../services/admin';
import type { AdminDashboardStats } from '../../types/admin';
import { useAuth } from '../../contexts/AuthContext';
import { formatMadridDateTime } from '../../utils/datetime';
import { cardStyle } from '../../styles';
import { PanelSkeleton } from '../Skeleton';

export function AdminSummary() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setStats(await getAdminDashboard());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ezin izan da laburpena kargatu.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className={`${cardStyle} p-6 font-bold text-neutral-600`}>
        Ez duzu baimenik laburpena ikusteko.
      </div>
    );
  }

  if (loading) return <PanelSkeleton />;
  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-100 border-4 border-red-900 p-4 font-bold">{error}</div>
      </div>
    );
  }
  if (!stats) return null;

  const items = [
    { label: 'Jokalari aktiboak (astea)', value: String(stats.active_players_this_week) },
    { label: 'Gaur osatutako erronkak', value: String(stats.challenges_completed_today) },
    { label: 'Batez besteko asmatzea (astea)', value: String(stats.weekly_average_score) },
    {
      label: 'Azken jarduera',
      value: formatMadridDateTime(stats.last_global_activity_at),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.label} className={`${cardStyle} p-4`}>
            <p className="text-xs font-bold uppercase text-neutral-500">{item.label}</p>
            <p className="text-2xl font-black mt-2">{item.value}</p>
          </div>
        ))}
      </div>
      <div className={`${cardStyle} p-4 text-sm font-bold text-neutral-600`}>
        Guztira {stats.registered_players} jokalari erregistratu · {stats.ranking_players_count}{' '}
        sailkapen publikoan
      </div>
    </div>
  );
}
