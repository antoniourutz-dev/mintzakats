import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAdminQuestionAnalytics } from '../../services/admin';
import type { QuestionAnalyticsFilter, QuestionAnalyticsRow } from '../../types/admin';
import { cardStyle, buttonBaseStyle, inputStyle } from '../../styles';
import { TableSkeleton } from '../Skeleton';
import { QuestionOptionDialog } from './QuestionOptionDialog';

const filters: Array<{ id: QuestionAnalyticsFilter; label: string }> = [
  { id: 'all', label: 'Guztiak' },
  { id: 'no_attempts', label: 'Saiakerarik gabe' },
  { id: 'below_40', label: '< 40 %' },
  { id: 'between_40_60', label: '40–60 %' },
  { id: 'above_90', label: '> 90 %' },
];

function matchesFilter(row: QuestionAnalyticsRow, filter: QuestionAnalyticsFilter): boolean {
  switch (filter) {
    case 'no_attempts':
      return row.attempts === 0;
    case 'below_40':
      return row.attempts > 0 && row.accuracy_percent < 40;
    case 'between_40_60':
      return row.attempts > 0 && row.accuracy_percent >= 40 && row.accuracy_percent <= 60;
    case 'above_90':
      return row.attempts > 0 && row.accuracy_percent > 90;
    default:
      return true;
  }
}

export function QuestionAnalyticsPanel() {
  const [rows, setRows] = useState<QuestionAnalyticsRow[]>([]);
  const [filter, setFilter] = useState<QuestionAnalyticsFilter>('all');
  const [minAttempts, setMinAttempts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<QuestionAnalyticsRow | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRows(await getAdminQuestionAnalytics(minAttempts));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ezin izan da analisia kargatu.');
    } finally {
      setLoading(false);
    }
  }, [minAttempts]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(
    () => rows.filter((row) => matchesFilter(row, filter)),
    [filter, rows],
  );

  return (
    <div className="space-y-4">
      <div className={`${cardStyle} p-4 flex flex-wrap gap-3 items-end`}>
        <label className="font-bold text-sm">
          Saiakera minimoak
          <input
            type="number"
            min={0}
            value={minAttempts}
            onChange={(event) => setMinAttempts(Number(event.target.value) || 0)}
            className={`${inputStyle} mt-2 w-28`}
          />
        </label>
        <button type="button" onClick={() => void load()} className={`${buttonBaseStyle} bg-indigo-500`}>
          Freskatu
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`border-4 border-neutral-900 px-3 py-2 font-black text-sm ${
              filter === item.id ? 'bg-indigo-500' : 'bg-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="space-y-4">
          <div className="bg-red-100 border-4 border-red-900 p-4 font-bold">{error}</div>
          <button type="button" onClick={() => void load()} className={`${buttonBaseStyle} w-full`}>
            Saiatu berriro
          </button>
        </div>
      ) : (
        <div className={`${cardStyle} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead className="bg-neutral-900 text-white">
                <tr>
                  <th className="p-3 text-xs font-black uppercase">ID</th>
                  <th className="p-3 text-xs font-black uppercase">Galdera</th>
                  <th className="p-3 text-xs font-black uppercase">Saiakerak</th>
                  <th className="p-3 text-xs font-black uppercase">Asmatzeak</th>
                  <th className="p-3 text-xs font-black uppercase">%</th>
                  <th className="p-3 text-xs font-black uppercase">Azken erantzuna</th>
                  <th className="p-3 text-xs font-black uppercase">Ekintza</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 font-bold text-neutral-600">
                      Ez dago daturik filtro honetan.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.question_id} className="border-t-4 border-neutral-900">
                      <td className="p-3 font-black">{row.question_id}</td>
                      <td className="p-3 font-bold max-w-xs">{row.question}</td>
                      <td className="p-3">{row.attempts}</td>
                      <td className="p-3">{row.correct_count}</td>
                      <td className="p-3">{row.accuracy_percent}%</td>
                      <td className="p-3">{row.last_answered_at ?? '—'}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setSelected(row)}
                          className="border-4 border-neutral-900 px-2 py-1 text-xs font-black bg-white"
                        >
                          Aztertu
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <QuestionOptionDialog
        open={selected !== null}
        question={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
