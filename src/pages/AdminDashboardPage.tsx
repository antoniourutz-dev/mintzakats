import { AdminNav } from '../components/admin/AdminNav';
import { AdminSummary } from '../components/admin/AdminSummary';

export function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-black mb-6 uppercase">Kudeaketa</h1>
      <AdminNav />
      <AdminSummary />
    </div>
  );
}
