import { AdminNav } from '../components/admin/AdminNav';
import { QuestionAnalyticsPanel } from '../components/admin/QuestionAnalyticsPanel';

export function AdminAnalyticsPage() {
  return (
    <div>
      <h1 className="text-3xl font-black mb-6 uppercase">Galderen analisia</h1>
      <AdminNav />
      <QuestionAnalyticsPanel />
    </div>
  );
}
