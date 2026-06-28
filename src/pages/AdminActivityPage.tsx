import { useMemo } from 'react';
import { AdminNav } from '../components/admin/AdminNav';
import { PlayerActivityPanel } from '../components/admin/PlayerActivityPanel';
import type { AdminPlayer } from '../types/admin';

export function AdminActivityPage() {
  const player = useMemo(() => {
    const raw = sessionStorage.getItem('mintzakats_admin_activity_player');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AdminPlayer;
    } catch {
      return null;
    }
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-black mb-6 uppercase">Jarduera</h1>
      <AdminNav />
      <PlayerActivityPanel player={player} />
    </div>
  );
}
