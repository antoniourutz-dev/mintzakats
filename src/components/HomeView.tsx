import { useEffect } from 'react';
import { Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTodayChallengeStatus } from '../hooks/useAppQueries';
import { prefetchRankedGameChunk } from '../utils/prefetch';
import { buttonBaseStyle } from '../styles';

type HomeViewProps = {
  onStartRanked: () => void;
  onRequireAuth: () => void;
};

export function HomeView({ onStartRanked, onRequireAuth }: HomeViewProps) {
  const { user, profile, isProfileLoading } = useAuth();
  const { data: progress, isLoading: loadingProgress } = useTodayChallengeStatus(Boolean(user));

  useEffect(() => {
    if (user) {
      prefetchRankedGameChunk();
    }
  }, [user]);

  const rankedLabel = (() => {
    if (!user) return 'Sartu erronka ofizialean parte hartzeko';
    if (isProfileLoading || loadingProgress) return 'Kargatzen...';
    if (progress?.todayCompleted) {
      return `Gaur amaituta · ${progress.todayScore ?? 0}/${progress.todayTotal}`;
    }
    if (progress?.todayInProgress) return 'Jarraitu';
    return 'Hasi gaurko erronka';
  })();

  const handleRankedClick = () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    onStartRanked();
  };

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="text-4xl sm:text-6xl md:text-7xl font-black mb-2 tracking-tighter">MINTZAKATS</h1>
      <p className="text-sm sm:text-base font-bold text-neutral-600 mb-4">
        Eguneko 20 galdera · asteko zikloa
      </p>
      <div className="w-24 sm:w-40 h-2 sm:h-3 bg-neutral-900 mb-8" />

      {profile?.username && (
        <p className="mb-4 font-bold text-indigo-700">
          Kaixo, {profile.display_name?.trim() || profile.username}!
        </p>
      )}

      <div className="w-full max-w-lg">
        <section className="bg-white border-4 border-neutral-900 p-5 shadow-[6px_6px_0_0_rgba(23,23,23,1)] text-left">
          <h2 className="text-xl font-black mb-2 uppercase">Gaurko erronka</h2>
          <p className="text-sm font-bold text-neutral-600 mb-4">
            Partida ofiziala · sailkapenerako
          </p>
          <button
            type="button"
            onClick={handleRankedClick}
            onMouseEnter={prefetchRankedGameChunk}
            onFocus={prefetchRankedGameChunk}
            disabled={isProfileLoading || loadingProgress}
            className={`${buttonBaseStyle} bg-indigo-500 hover:bg-indigo-400 w-full disabled:opacity-60`}
          >
            <Play size={24} className="mb-2" />
            <span className="text-lg font-black uppercase">{rankedLabel}</span>
          </button>
        </section>
      </div>
    </div>
  );
}
