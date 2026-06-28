import { useEffect, useState } from 'react';
import { getAdminQuestionOptionAnalysis } from '../../services/admin';
import type { QuestionAnalyticsRow, QuestionOptionAnalysisRow } from '../../types/admin';
import { Dialog } from './Dialog';
import { cardStyle } from '../../styles';
import { TableSkeleton } from '../Skeleton';

type QuestionOptionDialogProps = {
  open: boolean;
  question: QuestionAnalyticsRow | null;
  onClose: () => void;
};

const optionLetters = ['A', 'B', 'C', 'D'];

export function QuestionOptionDialog({ open, question, onClose }: QuestionOptionDialogProps) {
  const [options, setOptions] = useState<QuestionOptionAnalysisRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !question) {
      setOptions([]);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setOptions(await getAdminQuestionOptionAnalysis(question.question_id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ezin izan da analisia kargatu.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [open, question]);

  return (
    <Dialog
      open={open}
      wide
      title={question ? `Galdera #${question.question_id}` : 'Distraktoreen analisia'}
      onClose={onClose}
    >
      {question && <p className="font-bold mb-4">{question.question}</p>}
      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="bg-red-100 border-4 border-red-900 p-4 font-bold">{error}</div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-3 md:hidden">
            {options.length === 0 ? (
              <p className="p-4 font-bold text-neutral-600">Ez dago daturik aukera honentzat.</p>
            ) : (
              options.map((row) => (
                <article
                  key={row.optionIndex}
                  className={`${cardStyle} p-4 space-y-2 ${
                    row.isCorrectOption === true ? 'bg-green-100' : ''
                  }`}
                >
                  <p className="font-black">
                    {optionLetters[row.optionIndex] ?? row.optionIndex}
                    {row.isCorrectOption === true && (
                      <span className="ml-2 text-xs uppercase text-green-800">Zuzena</span>
                    )}
                  </p>
                  <p className="font-bold break-anywhere">{row.optionText || '—'}</p>
                  <p className="text-sm font-bold">
                    Hautapenak: {row.selectedCount} · %:{' '}
                    {row.selectedPercent === null ? '—' : `${row.selectedPercent}%`}
                  </p>
                </article>
              ))
            )}
          </div>

          <div className={`${cardStyle} overflow-hidden hidden md:block`}>
            <table className="w-full text-left">
            <thead className="bg-neutral-900 text-white">
              <tr>
                <th className="p-3 text-xs font-black uppercase">Aukera</th>
                <th className="p-3 text-xs font-black uppercase">Testua</th>
                <th className="p-3 text-xs font-black uppercase">Hautapenak</th>
                <th className="p-3 text-xs font-black uppercase">%</th>
              </tr>
            </thead>
            <tbody>
              {options.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 font-bold text-neutral-600">
                    Ez dago daturik aukera honentzat.
                  </td>
                </tr>
              ) : (
                options.map((row) => (
                  <tr
                    key={row.optionIndex}
                    className={`border-t-4 border-neutral-900 ${
                      row.isCorrectOption === true ? 'bg-green-100' : 'bg-white'
                    }`}
                  >
                    <td className="p-3 font-black">
                      {optionLetters[row.optionIndex] ?? row.optionIndex}
                      {row.isCorrectOption === true && (
                        <span className="ml-2 text-xs font-black uppercase text-green-800">
                          Zuzena
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-bold">{row.optionText || '—'}</td>
                    <td className="p-3">{row.selectedCount}</td>
                    <td className="p-3">
                      {row.selectedPercent === null ? '—' : `${row.selectedPercent}%`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </Dialog>
  );
}
