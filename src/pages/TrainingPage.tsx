import { PracticeGameView } from '../components/PracticeGameView';
import { TrainingModeBanner } from '../components/admin/TrainingModeBanner';
import { useAppRoute } from '../hooks/useAppRoute';

export function TrainingPage() {
  const { navigate } = useAppRoute();

  return (
    <div>
      <TrainingModeBanner />
      <PracticeGameView onExit={() => navigate('/admin')} />
    </div>
  );
}
