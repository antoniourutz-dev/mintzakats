import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  applyAnswerToQuestion,
  getActiveQuestionIndex,
  isRunCompleted,
  openTodayRankedGame,
  submitRankedAnswer,
  type RankedAnswerResult,
  type RankedQuestion,
} from '../services/rankedGame';
import { buttonBaseStyle } from '../styles';
import { PanelSkeleton } from './Skeleton';

type RankedGameViewProps = {
  onExit: () => void;
};

export function RankedGameView({ onExit }: RankedGameViewProps) {
  const [questions, setQuestions] = useState<RankedQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const [phase, setPhase] = useState<'playing' | 'finished'>('playing');
  const [finalScore, setFinalScore] = useState(0);
  const [runCompleted, setRunCompleted] = useState(false);
  const submittingRef = useRef(false);

  const loadGame = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const nextQuestions = await openTodayRankedGame();

      if (isRunCompleted(nextQuestions)) {
        setQuestions(nextQuestions);
        setPhase('finished');
        setFinalScore(nextQuestions.filter((item) => item.isCorrect).length);
        return;
      }

      const index = getActiveQuestionIndex(nextQuestions);
      const current = nextQuestions[index];

      setQuestions(nextQuestions);
      setCurrentIndex(index);
      setPhase('playing');
      setSelectedAnswer(current?.answered ? current.selectedAnswer : null);
      setShowResult(Boolean(current?.answered));
      setCorrectAnswer(null);
      setRunCompleted(false);
      setLiveMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ezin izan da erronka kargatu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGame();
  }, [loadGame]);

  const question = questions[currentIndex];
  const score = useMemo(
    () => questions.filter((item) => item.isCorrect).length,
    [questions],
  );

  const handleAnswer = async (index: number) => {
    if (!question || showResult || submittingRef.current || question.answered) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSelectedAnswer(index);

    try {
      const result: RankedAnswerResult = await submitRankedAnswer(
        question.runId,
        question.questionId,
        index,
      );

      setQuestions((prev) =>
        prev.map((item) =>
          item.questionId === question.questionId
            ? applyAnswerToQuestion(item, result)
            : item,
        ),
      );
      setCorrectAnswer(result.correctAnswer);
      setRunCompleted(result.runCompleted);
      setShowResult(true);
      setLiveMessage(
        result.isCorrect
          ? 'Erantzun zuzena.'
          : `Erantzun okerra. Erantzun zuzena: ${String.fromCharCode(65 + result.correctAnswer)}.`,
      );
    } catch (err) {
      setSelectedAnswer(null);
      setError(err instanceof Error ? err.message : 'Ezin izan da erantzuna bidali.');
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const nextQuestion = () => {
    if (!questions.length) return;

    if (runCompleted || isRunCompleted(questions)) {
      setFinalScore(score);
      setPhase('finished');
      return;
    }

    const nextIndex = getActiveQuestionIndex(questions);
    const next = questions[nextIndex];
    setCurrentIndex(nextIndex);
    setSelectedAnswer(next?.answered ? next.selectedAnswer : null);
    setShowResult(Boolean(next?.answered));
    setCorrectAnswer(null);
    setRunCompleted(false);
    setLiveMessage('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 p-6 pb-24">
        <div className="max-w-xl mx-auto">
          <PanelSkeleton />
        </div>
      </div>
    );
  }

  if (error && !questions.length) {
    return (
      <div className="min-h-screen bg-neutral-50 p-6 flex items-center justify-center">
        <div className="max-w-lg w-full space-y-4">
          <div className="bg-red-100 border-4 border-red-900 p-4 font-bold text-center">{error}</div>
          <button type="button" onClick={() => void loadGame()} className={`${buttonBaseStyle} w-full`}>
            Saiatu berriro
          </button>
          <button type="button" onClick={onExit} className={`${buttonBaseStyle} w-full`}>
            Itzuli hasierara
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="bg-white border-4 border-neutral-900 p-8 w-full max-w-lg text-center shadow-[12px_12px_0_0_rgba(23,23,23,1)]">
          <Trophy size={64} className="mx-auto text-yellow-500 mb-6" />
          <h2 className="text-3xl font-black mb-4 uppercase">Gaurko erronka amaitu duzu</h2>
          <p className="text-2xl font-bold mb-8">
            {finalScore}/{questions.length || 20}
          </p>
          <button type="button" onClick={onExit} className={`${buttonBaseStyle} w-full`}>
            <RefreshCw size={24} className="mb-2" />
            HASIERARA ITZULI
          </button>
        </div>
      </div>
    );
  }

  if (!question) {
    return null;
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-neutral-50 p-4 sm:p-6">
      <div className="max-w-xl mx-auto w-full">
        <header className="flex justify-between items-center mb-8">
          <button
            type="button"
            onClick={onExit}
            className="bg-white border-4 border-neutral-900 p-2 shadow-[2px_2px_0_0_rgba(23,23,23,1)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-indigo-500"
            aria-label="Irten erronkatik"
          >
            <RefreshCw size={24} />
          </button>
          <div className="font-extrabold bg-white border-4 border-neutral-900 px-6 py-2 shadow-[4px_4px_0_0_rgba(23,23,23,1)]">
            {score} / {questions.length}
          </div>
        </header>

        <p className="sr-only" aria-live="polite">
          {liveMessage}
        </p>

        {error && (
          <div className="bg-red-100 border-4 border-red-900 p-4 mb-4 font-bold text-center">{error}</div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={question.questionId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white border-4 border-neutral-900 p-5 sm:p-8 shadow-[8px_8px_0_0_rgba(23,23,23,1)]"
          >
            <p className="text-sm text-neutral-500 font-bold mb-2 uppercase">
              Galdera {question.questionPosition} / {questions.length}
            </p>
            <h2 className="text-xl sm:text-2xl font-black mb-6 leading-tight break-anywhere">{question.question}</h2>

            <div className="space-y-4">
              {question.candidates.map((candidate, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = showResult && correctAnswer === index;
                const isWrong = showResult && isSelected && correctAnswer !== index;

                let classes = 'border-4 border-neutral-900 bg-white hover:bg-neutral-100';
                if (isCorrect) classes = 'bg-green-400 border-4 border-neutral-900';
                else if (isWrong) classes = 'bg-red-400 border-4 border-neutral-900';
                else if (showResult) classes = 'bg-neutral-200 border-4 border-neutral-200 text-neutral-500';

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => void handleAnswer(index)}
                    disabled={showResult || submitting || question.answered}
                    className={`w-full text-left p-4 font-bold flex items-center shadow-[4px_4px_0_0_rgba(23,23,23,1)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-indigo-500 ${classes}`}
                  >
                    <span className="min-w-[2.5rem] h-10 flex items-center justify-center rounded-full bg-white border-4 border-neutral-900 font-black mr-3">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1 break-words">{candidate}</span>
                  </button>
                );
              })}
            </div>

            {showResult && (
              <button
                type="button"
                onClick={nextQuestion}
                className="w-full mt-8 bg-neutral-900 text-white py-4 font-extrabold text-lg shadow-[4px_4px_0_0_rgba(23,23,23,1)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-indigo-500"
              >
                {runCompleted || isRunCompleted(questions) ? 'Amaitu erronka' : 'Hurrengo galdera'}
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
