import { AdminNav } from '../components/admin/AdminNav';
import { AuditLogPanel } from '../components/admin/AuditLogPanel';

export function AdminAuditPage() {
  return (
    <div>
      <h1 className="text-3xl font-black mb-6 uppercase">Auditoretza</h1>
      <AdminNav />
      <AuditLogPanel />
    </div>
  );
}
