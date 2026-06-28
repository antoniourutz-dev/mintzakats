import { useMemo } from 'react';
import { AdminNav } from '../components/admin/AdminNav';
import { PlayerHistoryPanel } from '../components/admin/PlayerHistoryPanel';
import type { AdminPlayer } from '../types/admin';

export function AdminHistoryPage() {
  const player = useMemo(() => {
    const raw = sessionStorage.getItem('mintzakats_admin_history_player');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AdminPlayer;
    } catch {
      return null;
    }
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-black mb-6 uppercase">Jardueren historia</h1>
      <AdminNav />
      <PlayerHistoryPanel player={player} />
    </div>
  );
}
