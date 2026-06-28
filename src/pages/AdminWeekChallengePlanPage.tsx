import { AdminNav } from '../components/admin/AdminNav';
import { WeekChallengePlanPanel } from '../components/admin/WeekChallengePlanPanel';

export function AdminWeekChallengePlanPage() {
  return (
    <div>
      <h1 className="text-3xl font-black mb-6 uppercase">Erronken plangintza</h1>
      <AdminNav />
      <WeekChallengePlanPanel />
    </div>
  );
}
