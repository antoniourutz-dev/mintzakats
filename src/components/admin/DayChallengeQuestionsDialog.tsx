import { useEffect, useState } from 'react';
import { getAdminDayChallengeQuestions, openQuestionInBank } from '../../services/admin';
import type { DayChallengeQuestion } from '../../types/admin';
import { useAppRoute } from '../../hooks/useAppRoute';
import { Dialog } from './Dialog';
import { cardStyle } from '../../styles';
import { TableSkeleton } from '../Skeleton';

const optionLetters = ['A', 'B', 'C', 'D'];

type DayChallengeQuestionsDialogProps = {
  open: boolean;
  gameDate: string | null;
  onClose: () => void;
};

export function DayChallengeQuestionsDialog({
  open,
  gameDate,
  onClose,
}: DayChallengeQuestionsDialogProps) {
  const { navigate } = useAppRoute();
  const [questions, setQuestions] = useState<DayChallengeQuestion[]>([]);
  const [invalidCount, setInvalidCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !gameDate) {
      setQuestions([]);
      setInvalidCount(0);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getAdminDayChallengeQuestions(gameDate);
        setQuestions(result.questions);
        setInvalidCount(result.invalidCount);
      } catch (err) {
        setQuestions([]);
        setInvalidCount(0);
        setError(err instanceof Error ? err.message : 'Ezin izan dira galderak kargatu.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [gameDate, open]);

  return (
    <Dialog
      open={open}
      wide
      title={gameDate ? `Galderak · ${gameDate}` : 'Eguneko galderak'}
      onClose={onClose}
    >
      <div className="bg-yellow-100 border-4 border-yellow-700 p-3 mb-4 text-sm font-bold">
        Hau erronkaren snapshot-a da. Ez da hemen editatzen. Bankuan egindako aldaketek hurrengo
        erronketetan soilik aplikatuko dira.
      </div>

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="bg-red-100 border-4 border-red-900 p-4 font-bold">{error}</div>
      ) : (
        <div className="space-y-4">
          {invalidCount > 0 && (
            <div className="bg-orange-100 border-4 border-orange-800 p-3 font-bold" role="alert">
              {invalidCount} galdera ez dira normalizatu (datu osatugabeak). Gainerakoak bistaratzen
              dira.
            </div>
          )}

          <div className="space-y-3 md:hidden max-h-[28rem] overflow-y-auto">
            {questions.length === 0 ? (
              <p className="p-4 font-bold text-neutral-600">Ez dago galderarik egun honetarako.</p>
            ) : (
              questions.map((row) => {
                const correctLetter = optionLetters[row.correctAnswer] ?? String(row.correctAnswer);
                return (
                  <article key={`${row.questionPosition}-${row.questionId}`} className={`${cardStyle} p-4 space-y-3`}>
                    <p className="font-black">#{row.questionPosition}</p>
                    <p className="font-bold break-anywhere">{row.question}</p>
                    <div className="text-sm space-y-1">
                      {row.candidates.map((candidate, index) => (
                        <p key={index} className="break-anywhere">
                          <span className="font-black">{optionLetters[index]}:</span> {candidate}
                        </p>
                      ))}
                    </div>
                    <p className="font-bold">Zuzena: {correctLetter}</p>
                    <button
                      type="button"
                      onClick={() => {
                        openQuestionInBank(row.questionId);
                        onClose();
                        navigate('/admin/galderak');
                      }}
                      className="border-4 border-neutral-900 px-2 py-1 text-xs font-black bg-indigo-200 w-full"
                    >
                      Editatu bankuan
                    </button>
                  </article>
                );
              })
            )}
          </div>

          <div className={`${cardStyle} overflow-hidden hidden md:block`}>
            <div className="max-h-[28rem] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-neutral-900 text-white sticky top-0">
                  <tr>
                    <th className="p-3 text-xs font-black uppercase">#</th>
                    <th className="p-3 text-xs font-black uppercase">Enuntziatua</th>
                    <th className="p-3 text-xs font-black uppercase">Aukerak</th>
                    <th className="p-3 text-xs font-black uppercase">Zuzena</th>
                    <th className="p-3 text-xs font-black uppercase">Ekintza</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 font-bold text-neutral-600">
                        Ez dago galderarik egun honetarako.
                      </td>
                    </tr>
                  ) : (
                    questions.map((row) => {
                      const correctLetter = optionLetters[row.correctAnswer] ?? String(row.correctAnswer);

                      return (
                        <tr
                          key={`${row.questionPosition}-${row.questionId}`}
                          className="border-t-4 border-neutral-900"
                        >
                          <td className="p-3 font-black">{row.questionPosition}</td>
                          <td className="p-3 font-bold">{row.question}</td>
                          <td className="p-3 text-sm">
                            {row.candidates.map((candidate, index) => (
                              <p key={index} className="font-bold">
                                {optionLetters[index]}: {candidate}
                              </p>
                            ))}
                          </td>
                          <td className="p-3 font-black">{correctLetter}</td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => {
                                openQuestionInBank(row.questionId);
                                onClose();
                                navigate('/admin/galderak');
                              }}
                              className="border-4 border-neutral-900 px-2 py-1 text-xs font-black bg-indigo-200"
                            >
                              Editatu bankuan
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
