import { useCallback, useEffect, useState } from 'react';
import { getAdminWeekChallengePlan } from '../../services/admin';
import type { WeekChallengePlanDay } from '../../types/admin';
import { formatChallengeStatus } from '../../utils/challengeStatus';
import { formatGameDate } from '../../utils/datetime';
import { cardStyle, buttonBaseStyle, breakWordsStyle } from '../../styles';
import { PanelSkeleton } from '../Skeleton';
import { DayChallengeQuestionsDialog } from './DayChallengeQuestionsDialog';

function WeekPlanDayCard({
  day,
  onViewQuestions,
}: {
  day: WeekChallengePlanDay;
  onViewQuestions: (gameDate: string) => void;
}) {
  return (
    <article className={`${cardStyle} p-4 space-y-3`}>
      <div>
        <p className="text-xs font-bold uppercase text-neutral-500">Data</p>
        <p className={`font-black text-lg ${breakWordsStyle}`}>{formatGameDate(day.gameDate)}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs font-bold uppercase text-neutral-500">Egoera</p>
          <p className="font-bold">{formatChallengeStatus(day.challengeStatus)}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-neutral-500">Galderak</p>
          <p className={`font-bold ${day.questionCount !== 20 ? 'text-red-700' : ''}`}>
            {day.questionCount}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-neutral-500">Hasitakoak</p>
          <p className="font-bold">{day.playersStarted}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-neutral-500">Osatuak</p>
          <p className="font-bold">{day.playersCompleted}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onViewQuestions(day.gameDate)}
        className={`${buttonBaseStyle} w-full text-sm py-3`}
      >
        Ikusi galderak
      </button>
    </article>
  );
}

export function WeekChallengePlanPanel() {
  const [days, setDays] = useState<WeekChallengePlanDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setDays(await getAdminWeekChallengePlan());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ezin izan da plangintza kargatu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <PanelSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-100 border-4 border-red-900 p-4 font-bold">{error}</div>
        <button type="button" onClick={() => void load()} className={`${buttonBaseStyle} w-full`}>
          Saiatu berriro
        </button>
      </div>
    );
  }

  const invalidDays = days.filter((day) => day.questionCount !== 20);

  return (
    <div className="space-y-4 w-full max-w-full">
      <div className={`bg-yellow-100 border-4 border-yellow-700 p-4 font-bold ${breakWordsStyle}`}>
        Erronka bakoitzaren galderak snapshot gisa gordetzen dira sortzean. Bankuan egindako
        aldaketek etorkizuneko erronketan soilik eragiten dute, ez dagoeneko sortutako
        plangintzetan.
      </div>

      {invalidDays.length > 0 && (
        <div className="bg-red-100 border-4 border-red-900 p-4 font-bold break-anywhere" role="alert">
          Kontuz: {invalidDays.length} egunek 20 galdera ez dituzte (
          {invalidDays.map((day) => formatGameDate(day.gameDate)).join(', ')}).
        </div>
      )}

      <div className="space-y-3 md:hidden">
        {days.length === 0 ? (
          <div className={`${cardStyle} p-4 font-bold text-neutral-600`}>
            Ez dago asteko plangintzarik.
          </div>
        ) : (
          days.map((day) => (
            <div key={day.gameDate}>
              <WeekPlanDayCard day={day} onViewQuestions={setSelectedDate} />
            </div>
          ))
        )}
      </div>

      <div className={`${cardStyle} overflow-hidden hidden md:block`}>
        <table className="w-full text-left">
          <thead className="bg-neutral-900 text-white">
            <tr>
              <th className="p-3 text-xs font-black uppercase">Data</th>
              <th className="p-3 text-xs font-black uppercase">Egoera</th>
              <th className="p-3 text-xs font-black uppercase">Galderak</th>
              <th className="p-3 text-xs font-black uppercase">Hasitakoak</th>
              <th className="p-3 text-xs font-black uppercase">Osatuak</th>
              <th className="p-3 text-xs font-black uppercase">Ekintza</th>
            </tr>
          </thead>
          <tbody>
            {days.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 font-bold text-neutral-600">
                  Ez dago asteko plangintzarik.
                </td>
              </tr>
            ) : (
              days.map((day) => (
                <tr key={day.gameDate} className="border-t-4 border-neutral-900">
                  <td className="p-3 font-bold break-anywhere">{formatGameDate(day.gameDate)}</td>
                  <td className="p-3">{formatChallengeStatus(day.challengeStatus)}</td>
                  <td className="p-3">
                    <span className={day.questionCount !== 20 ? 'text-red-700 font-black' : ''}>
                      {day.questionCount}
                    </span>
                  </td>
                  <td className="p-3">{day.playersStarted}</td>
                  <td className="p-3">{day.playersCompleted}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => setSelectedDate(day.gameDate)}
                      className="border-4 border-neutral-900 px-2 py-1 text-xs font-black bg-white"
                    >
                      Ikusi galderak
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DayChallengeQuestionsDialog
        open={selectedDate !== null}
        gameDate={selectedDate}
        onClose={() => setSelectedDate(null)}
      />
    </div>
  );
}
