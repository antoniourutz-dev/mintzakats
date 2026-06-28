import { useCallback, useEffect, useState } from 'react';
import {
  searchEuskeraQuestions,
  updateEuskeraQuestion,
  validateEuskeraQuestionInput,
} from '../../services/admin';
import type { EuskeraQuestionRow } from '../../types/admin';
import { cardStyle, buttonBaseStyle, inputStyle } from '../../styles';
import { PanelSkeleton } from '../Skeleton';

const optionLetters = ['A', 'B', 'C', 'D'];

export function QuestionBankPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EuskeraQuestionRow[]>([]);
  const [selected, setSelected] = useState<EuskeraQuestionRow | null>(null);
  const [question, setQuestion] = useState('');
  const [candidates, setCandidates] = useState(['', '', '', '']);
  const [answer, setAnswer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async (search: string) => {
    try {
      setLoading(true);
      setError(null);
      setResults(await searchEuskeraQuestions(search, 50));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ezin izan dira galderak kargatu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load('');
  }, [load]);

  const selectQuestion = (item: EuskeraQuestionRow) => {
    setSelected(item);
    setQuestion(item.question);
    setCandidates([...item.candidates]);
    setAnswer(item.answer);
    setFeedback(null);
    setError(null);
  };

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
      await load(query);
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
        <label className="font-bold flex-1 min-w-[220px]">
          Bilatu
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={`${inputStyle} mt-2`}
            placeholder="ID edo testua"
          />
        </label>
        <button
          type="button"
          onClick={() => void load(query)}
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
          <button type="button" onClick={() => void load(query)} className={`${buttonBaseStyle} w-full`}>
            Saiatu berriro
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`${cardStyle} overflow-hidden`}>
            <div className="max-h-[28rem] overflow-y-auto">
              <table className="w-full text-left">
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
                        <td className="p-3 font-bold">{item.question}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`${cardStyle} p-4 space-y-4`}>
            {selected ? (
              <>
                <h2 className="text-xl font-black">Editatu galdera #{selected.id}</h2>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
