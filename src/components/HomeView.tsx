import { useEffect } from 'react';
import { Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTodayChallengeStatus } from '../hooks/useAppQueries';
import { useLoadingTimeout } from '../hooks/useLoadingTimeout';
import { prefetchRankedGameChunk } from '../utils/prefetch';
import { buttonBaseStyle } from '../styles';

type HomeViewProps = {
  onStartRanked: () => void;
  onRequireAuth: () => void;
  onOpenPractice: () => void;
};

export function HomeView({ onStartRanked, onRequireAuth, onOpenPractice }: HomeViewProps) {
  if (import.meta.env.DEV) {
    console.count('[RENDER] HomeView');
  }

  const { user, profile, isProfileLoading } = useAuth();
  const { data: progress, isLoading: loadingProgress, refetch } = useTodayChallengeStatus(
    Boolean(user),
    user?.id,
  );
  const loadingTimedOut = useLoadingTimeout(Boolean(user) && loadingProgress);

  useEffect(() => {
    if (user) {
      prefetchRankedGameChunk();
    }
  }, [user]);

  const rankedLabel = (() => {
    if (!user) return 'Sartu erronka ofizialean parte hartzeko';
    if (loadingTimedOut) return 'Ezin izan da edukia kargatu';
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
    if (loadingTimedOut) {
      void refetch();
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

      <div className="w-full max-w-lg space-y-4">
        <section className="bg-white border-4 border-neutral-900 p-5 shadow-[6px_6px_0_0_rgba(23,23,23,1)] text-left">
          <h2 className="text-xl font-black mb-2 uppercase">Gaurko erronka</h2>
          <p className="text-sm font-bold text-neutral-600 mb-4">
            Partida ofiziala · sailkapenerako
          </p>
          {loadingTimedOut && (
            <p className="text-sm font-bold text-red-700 mb-3">Ezin izan da edukia kargatu.</p>
          )}
          <button
            type="button"
            onClick={handleRankedClick}
            onMouseEnter={prefetchRankedGameChunk}
            onFocus={prefetchRankedGameChunk}
            disabled={isProfileLoading || (loadingProgress && !loadingTimedOut)}
            className={`${buttonBaseStyle} bg-indigo-500 hover:bg-indigo-400 w-full disabled:opacity-60`}
          >
            <Play size={24} className="mb-2" />
            <span className="text-lg font-black uppercase">
              {loadingTimedOut ? 'Saiatu berriro' : rankedLabel}
            </span>
          </button>
        </section>

        <section className="bg-white border-4 border-neutral-900 p-5 shadow-[6px_6px_0_0_rgba(23,23,23,1)] text-left">
          <h2 className="text-xl font-black mb-2 uppercase">Aurreko erronkak praktikatu</h2>
          <p className="text-sm font-bold text-neutral-600 mb-4">
            Egin aurreko egunetako galderak berriro. Ez du sailkapenean eraginik.
          </p>
          <button
            type="button"
            onClick={() => {
              if (!user) {
                onRequireAuth();
                return;
              }
              onOpenPractice();
            }}
            className={`${buttonBaseStyle} bg-white hover:bg-neutral-100 w-full`}
          >
            <span className="text-lg font-black uppercase">Ikusi erronkak</span>
          </button>
        </section>
      </div>
    </div>
  );
}
