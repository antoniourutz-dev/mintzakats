import { AdminNav } from '../components/admin/AdminNav';
import { PlayersTable } from '../components/admin/PlayersTable';

export function AdminPlayersPage() {
  return (
    <div>
      <h1 className="text-3xl font-black mb-6 uppercase">Jokalariak</h1>
      <AdminNav />
      <PlayersTable />
    </div>
  );
}
