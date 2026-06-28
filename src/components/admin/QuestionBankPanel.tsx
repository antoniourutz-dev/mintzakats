import { useCallback, useEffect, useState } from 'react';
import {
  searchEuskeraQuestions,
  updateEuskeraQuestion,
  validateEuskeraQuestionInput,
  ADMIN_BANK_QUESTION_ID_KEY,
} from '../../services/admin';
import type { EuskeraQuestionRow } from '../../types/admin';
import { cardStyle, buttonBaseStyle, inputStyle } from '../../styles';
import { PanelSkeleton } from '../Skeleton';

const optionLetters = ['A', 'B', 'C', 'D'];
const PAGE_SIZE = 50;

function resolveSelection(
  items: EuskeraQuestionRow[],
  current: EuskeraQuestionRow | null,
): EuskeraQuestionRow | null {
  if (current && items.some((item) => item.id === current.id)) {
    return current;
  }
  return items[0] ?? null;
}

export function QuestionBankPanel() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [results, setResults] = useState<EuskeraQuestionRow[]>([]);
  const [selected, setSelected] = useState<EuskeraQuestionRow | null>(null);
  const [question, setQuestion] = useState('');
  const [candidates, setCandidates] = useState(['', '', '', '']);
  const [answer, setAnswer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);

  const load = useCallback(async (search: string, pageIndex: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await searchEuskeraQuestions(search, PAGE_SIZE, pageIndex * PAGE_SIZE);
      setResults(data);
      setSelected((current) => resolveSelection(data, current));
    } catch (err) {
      setResults([]);
      setSelected(null);
      setError(err instanceof Error ? err.message : 'Ezin izan dira galderak kargatu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const pendingId = sessionStorage.getItem(ADMIN_BANK_QUESTION_ID_KEY);
    if (!pendingId) {
      return;
    }
    sessionStorage.removeItem(ADMIN_BANK_QUESTION_ID_KEY);
    setQuery(pendingId);
    setPage(0);
  }, []);

  useEffect(() => {
    void load(query, page);
  }, [query, page, load]);

  useEffect(() => {
    if (!selected) {
      setQuestion('');
      setCandidates(['', '', '', '']);
      setAnswer(0);
      return;
    }

    setQuestion(selected.question);
    setCandidates([...selected.candidates]);
    setAnswer(selected.answer);
  }, [selected]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(0);
  };

  const runSearchNow = () => {
    setPage(0);
    void load(query, 0);
  };

  const hasNextPage = results.length >= PAGE_SIZE;

  const selectQuestion = (item: EuskeraQuestionRow) => {
    setSelected(item);
    setFeedback(null);
    setError(null);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      setMobileEditorOpen(true);
    }
  };

  const editorForm = selected ? (
    <>
      <h2 className="text-xl font-black break-anywhere">Editatu galdera #{selected.id}</h2>
      <label className="block font-bold">
        Enuntziatua
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className={`${inputStyle} mt-2 min-h-24`}
        />
      </label>
      {candidates.map((candidate, index) => (
        <label key={index} className="block font-bold">
          Aukera {optionLetters[index]}
          <input
            type="text"
            value={candidate}
            onChange={(event) => {
              const next = [...candidates];
              next[index] = event.target.value;
              setCandidates(next);
            }}
            className={`${inputStyle} mt-2`}
          />
        </label>
      ))}
      <fieldset>
        <legend className="font-bold mb-2">Erantzun zuzena</legend>
        <div className="flex flex-wrap gap-2">
          {optionLetters.map((letter, index) => (
            <label key={letter} className="font-bold flex items-center gap-2">
              <input
                type="radio"
                name="correct-answer"
                checked={answer === index}
                onChange={() => setAnswer(index)}
                className="w-5 h-5 border-4 border-neutral-900"
              />
              {letter}
            </label>
          ))}
        </div>
      </fieldset>
      {error && (
        <div className="bg-red-100 border-4 border-red-900 p-3 font-bold text-sm" role="alert">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className={`${buttonBaseStyle} bg-indigo-500 w-full disabled:opacity-60`}
      >
        {saving ? 'GORDETZEN...' : 'Gorde aldaketak'}
      </button>
    </>
  ) : (
    <p className="font-bold text-neutral-600">Hautatu galdera bat editatzeko.</p>
  );

  const questionList = (
    <>
      <div className={`${cardStyle} overflow-hidden`}>
        <div className="max-h-[28rem] overflow-y-auto">
          <div className="md:hidden divide-y-4 divide-neutral-900">
            {results.length === 0 ? (
              <p className="p-4 font-bold text-neutral-600">Ez da emaitzarik aurkitu.</p>
            ) : (
              results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectQuestion(item)}
                  className={`w-full text-left p-4 ${
                    selected?.id === item.id ? 'bg-indigo-100' : 'bg-white'
                  }`}
                >
                  <p className="text-xs font-bold uppercase text-neutral-500">#{item.id}</p>
                  <p className="font-bold break-anywhere mt-1">{item.question}</p>
                </button>
              ))
            )}
          </div>
          <table className="w-full text-left hidden md:table">
            <thead className="bg-neutral-900 text-white sticky top-0">
              <tr>
                <th className="p-3 text-xs font-black uppercase">ID</th>
                <th className="p-3 text-xs font-black uppercase">Galdera</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-4 font-bold text-neutral-600">
                    Ez da emaitzarik aurkitu.
                  </td>
                </tr>
              ) : (
                results.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-t-2 border-neutral-300 cursor-pointer ${
                      selected?.id === item.id ? 'bg-indigo-100' : 'bg-white'
                    }`}
                    onClick={() => selectQuestion(item)}
                  >
                    <td className="p-3 font-black">{item.id}</td>
                    <td className="p-3 font-bold break-anywhere">{item.question}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 p-3 border-t-4 border-neutral-900 bg-neutral-50">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0 || loading}
            className={`${buttonBaseStyle} text-sm disabled:opacity-40`}
          >
            Aurrekoa
          </button>
          <span className="font-black text-sm">Orria {page + 1}</span>
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={!hasNextPage || loading}
            className={`${buttonBaseStyle} text-sm disabled:opacity-40`}
          >
            Hurrengoa
          </button>
        </div>
      </div>
    </>
  );

  const handleSave = async () => {
    if (!selected) return;

    const validationError = validateEuskeraQuestionInput(question, candidates, answer);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await updateEuskeraQuestion({
        questionId: selected.id,
        question,
        candidates,
        answer,
      });
      setFeedback('Galdera eguneratu da.');
      await load(query, page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ezin izan da galdera gorde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-yellow-100 border-4 border-yellow-700 p-4 font-bold">
        Aldaketak etorkizuneko erronketan aplikatuko dira. Dagoeneko sortutako erronkek beren
        historiako kopia gordetzen dute.
      </div>

      {feedback && (
        <div className="bg-green-100 border-4 border-green-800 p-3 font-bold" role="status">
          {feedback}
        </div>
      )}

      <div className={`${cardStyle} p-4 flex flex-wrap gap-3`}>
        <label className="font-bold flex-1 min-w-0 w-full">
          Bilatu
          <input
            type="search"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            className={`${inputStyle} mt-2`}
            placeholder="ID edo testua"
          />
        </label>
        <button
          type="button"
          onClick={runSearchNow}
          className={`${buttonBaseStyle} bg-indigo-500 self-end`}
        >
          Bilatu
        </button>
      </div>

      {loading ? (
        <PanelSkeleton />
      ) : error && !selected ? (
        <div className="space-y-4">
          <div className="bg-red-100 border-4 border-red-900 p-4 font-bold">{error}</div>
          <button
            type="button"
            onClick={() => void load(query, page)}
            className={`${buttonBaseStyle} w-full`}
          >
            Saiatu berriro
          </button>
        </div>
      ) : (
        <>
          {mobileEditorOpen && selected && (
            <div className="lg:hidden fixed inset-0 z-50 bg-neutral-50 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div className="max-w-xl mx-auto w-full space-y-4">
                <button
                  type="button"
                  onClick={() => setMobileEditorOpen(false)}
                  className={`${buttonBaseStyle} w-full text-sm py-3`}
                >
                  ← Itzuli zerrendara
                </button>
                <div className={`${cardStyle} p-4 space-y-4`}>{editorForm}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full max-w-full">
            <div className={mobileEditorOpen ? 'hidden lg:block' : 'block'}>{questionList}</div>

            <div className={`${cardStyle} p-4 space-y-4 hidden lg:block`}>{editorForm}</div>
          </div>
        </>
      )}
    </div>
  );
}
