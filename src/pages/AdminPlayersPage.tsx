import { useState } from 'react';
import { AdminNav } from '../components/admin/AdminNav';
import { PlayersTable } from '../components/admin/PlayersTable';
import { useAppRoute } from '../hooks/useAppRoute';
import type { AdminPlayer } from '../types/admin';

export function AdminPlayersPage() {
  const { navigate } = useAppRoute();
  const [, setSelectedPlayer] = useState<AdminPlayer | null>(null);

  return (
    <div>
      <h1 className="text-3xl font-black mb-6 uppercase">Jokalariak</h1>
      <AdminNav />
      <PlayersTable
        onViewActivity={(player) => {
          setSelectedPlayer(player);
          sessionStorage.setItem('mintzakats_admin_activity_player', JSON.stringify(player));
          navigate('/admin/jarduera');
        }}
      />
    </div>
  );
}
