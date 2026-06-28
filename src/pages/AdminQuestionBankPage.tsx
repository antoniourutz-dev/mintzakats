import { AdminNav } from '../components/admin/AdminNav';
import { QuestionBankPanel } from '../components/admin/QuestionBankPanel';

export function AdminQuestionBankPage() {
  return (
    <div>
      <h1 className="text-3xl font-black mb-6 uppercase">Galdera-bankua</h1>
      <AdminNav />
      <QuestionBankPanel />
    </div>
  );
}
