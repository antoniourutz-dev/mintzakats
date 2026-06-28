import { useEffect, useState } from 'react';
import { getAdminDashboard } from '../../services/admin';
import type { AdminDashboardStats } from '../../types/admin';
import { formatMadridDateTime } from '../../utils/datetime';
import { cardStyle } from '../../styles';
import { PanelSkeleton } from '../Skeleton';

export function AdminSummary() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  if (loading) return <PanelSkeleton />;
  if (error) {
    return <div className="bg-red-100 border-4 border-red-900 p-4 font-bold">{error}</div>;
  }
  if (!stats) return null;

  const items = [
    { label: 'Jokalari erregistratuak', value: String(stats.registered_players) },
    { label: 'Aste honetan aktibo', value: String(stats.active_players_this_week) },
    { label: 'Gaur osatutako erronkak', value: String(stats.challenges_completed_today) },
    { label: 'Batez besteko asmatzea (astea)', value: String(stats.weekly_average_score) },
    {
      label: 'Azken jarduera globala',
      value: formatMadridDateTime(stats.last_global_activity_at),
    },
    { label: 'Rankingean dauden jokalariak', value: String(stats.ranking_players_count) },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map((item) => (
        <div key={item.label} className={`${cardStyle} p-4`}>
          <p className="text-xs font-bold uppercase text-neutral-500">{item.label}</p>
          <p className="text-2xl font-black mt-2">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
