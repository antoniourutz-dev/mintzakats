import { useCallback, useEffect, useState } from 'react';
import {
  fetchPastChallengeCatalog,
  formatOfficialCatalogResult,
  toPracticeErrorMessage,
  type PastChallengeCatalogEntry,
} from '../services/pastChallengePractice';
import { useLoadingTimeout } from '../hooks/useLoadingTimeout';
import { formatGameDate } from '../utils/datetime';
import { buttonBaseStyle, cardStyle } from '../styles';
import { PanelSkeleton } from '../components/Skeleton';

type PracticeCatalogPageProps = {
  onRequireAuth: () => void;
  onStartPractice: (gameDate: string) => void;
  onExit: () => void;
  isAuthenticated: boolean;
};

export function PracticeCatalogPage({
  onRequireAuth,
  onStartPractice,
  onExit,
  isAuthenticated,
}: PracticeCatalogPageProps) {
  const [entries, setEntries] = useState<PastChallengeCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingDate, setOpeningDate] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setEntries(await fetchPastChallengeCatalog());
    } catch (err) {
      setError(toPracticeErrorMessage(err));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    void loadCatalog();
  }, [isAuthenticated, loadCatalog]);

  const loadingTimedOut = useLoadingTimeout(loading);

  const handlePractice = (gameDate: string) => {
    if (openingDate) {
      return;
    }

    setOpeningDate(gameDate);
    onStartPractice(gameDate);
    window.setTimeout(() => setOpeningDate(null), 500);
  };

  if (!isAuthenticated) {
    return (
      <div className={`${cardStyle} p-6 text-center`}>
        <p className="font-bold mb-4">Aurreko erronkak praktikatzeko saioa hasi behar duzu.</p>
        <button type="button" onClick={onRequireAuth} className={`${buttonBaseStyle} bg-indigo-500 w-full`}>
          Hasi saioa
        </button>
      </div>
    );
  }

  if (loadingTimedOut && entries.length === 0 && !error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-100 border-4 border-red-900 p-4 font-bold text-center">
          Ezin izan da edukia kargatu.
        </div>
        <button type="button" onClick={() => void loadCatalog()} className={`${buttonBaseStyle} w-full`}>
          Saiatu berriro
        </button>
        <button type="button" onClick={onExit} className={`${buttonBaseStyle} w-full bg-white`}>
          Hasierara itzuli
        </button>
      </div>
    );
  }

  if (loading) {
    return <PanelSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-100 border-4 border-red-900 p-4 font-bold text-center">{error}</div>
        <button type="button" onClick={() => void loadCatalog()} className={`${buttonBaseStyle} w-full`}>
          Saiatu berriro
        </button>
        <button type="button" onClick={onExit} className={`${buttonBaseStyle} w-full bg-white`}>
          Hasierara itzuli
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className={`${cardStyle} p-5`}>
        <h1 className="text-2xl font-black uppercase">Aurreko erronkak praktikatu</h1>
        <p className="text-sm font-bold text-neutral-600 mt-2">
          Egin aurreko egunetako galderak berriro. Ez du sailkapenean eraginik.
        </p>
      </header>

      {entries.length === 0 ? (
        <div className={`${cardStyle} p-6 text-center font-bold text-neutral-600`}>
          Oraindik ez dago praktikatzeko erronkarik.
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <article key={entry.gameDate} className={`${cardStyle} p-4 space-y-3`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-neutral-500">Data</p>
                  <p className="text-lg font-black">{formatGameDate(entry.gameDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-neutral-500">Emaitza ofiziala</p>
                  <p className="font-bold">{formatOfficialCatalogResult(entry)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-neutral-500">Praktikak</p>
                  <p className="font-bold">{entry.practiceCount}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handlePractice(entry.gameDate)}
                disabled={openingDate !== null}
                className={`${buttonBaseStyle} w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60`}
              >
                {openingDate === entry.gameDate ? 'Irekitzen...' : 'Praktikatu berriro'}
              </button>
            </article>
          ))}
        </div>
      )}

      <button type="button" onClick={onExit} className={`${buttonBaseStyle} w-full bg-white`}>
        Hasierara itzuli
      </button>
    </div>
  );
}
