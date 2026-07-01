import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  applyAnswerToPracticeQuestion,
  getActivePracticeQuestionIndex,
  isPracticeRunCompleted,
  openPastChallengePractice,
  submitPastChallengePracticeAnswer,
  toPracticeErrorMessage,
  type PracticeAnswerResult,
  type PracticeQuestion,
} from '../services/pastChallengePractice';
import { formatGameDate } from '../utils/datetime';
import { useLoadingTimeout } from '../hooks/useLoadingTimeout';
import { buttonBaseStyle } from '../styles';
import { PanelSkeleton } from './Skeleton';

type PastChallengePracticeViewProps = {
  gameDate: string;
  shouldLoadGame: boolean;
  onExitToCatalog: () => void;
  onExitHome: () => void;
};

function applyOpenedPracticeState(
  nextQuestions: PracticeQuestion[],
  setters: {
    setQuestions: (questions: PracticeQuestion[]) => void;
    setCurrentIndex: (index: number) => void;
    setPhase: (phase: 'playing' | 'finished') => void;
    setFinalScore: (score: number) => void;
    setSelectedAnswer: (answer: number | null) => void;
    setShowResult: (show: boolean) => void;
    setCorrectAnswer: (answer: number | null) => void;
    setRunCompleted: (completed: boolean) => void;
    setLiveMessage: (message: string) => void;
  },
): boolean {
  if (isPracticeRunCompleted(nextQuestions)) {
    setters.setQuestions(nextQuestions);
    setters.setPhase('finished');
    setters.setFinalScore(nextQuestions.filter((item) => item.isCorrect).length);
    return true;
  }

  const index = getActivePracticeQuestionIndex(nextQuestions);
  const current = nextQuestions[index];

  setters.setQuestions(nextQuestions);
  setters.setCurrentIndex(index);
  setters.setPhase('playing');
  setters.setSelectedAnswer(current?.answered ? current.selectedAnswer : null);
  setters.setShowResult(Boolean(current?.answered));
  setters.setCorrectAnswer(null);
  setters.setRunCompleted(false);
  setters.setLiveMessage('');

  return false;
}

export function PastChallengePracticeView({
  gameDate,
  shouldLoadGame,
  onExitToCatalog,
  onExitHome,
}: PastChallengePracticeViewProps) {
  const openRequestRef = useRef<Promise<PracticeQuestion[]> | null>(null);
  const hasLoadedGameRef = useRef(false);
  const submittingRef = useRef(false);

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [initialLoadPending, setInitialLoadPending] = useState(true);
  const [isOpeningGame, setIsOpeningGame] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const [phase, setPhase] = useState<'playing' | 'finished'>('playing');
  const [finalScore, setFinalScore] = useState(0);
  const [runCompleted, setRunCompleted] = useState(false);

  const loadPracticeOnce = useCallback(async (): Promise<PracticeQuestion[]> => {
    if (openRequestRef.current) {
      return openRequestRef.current;
    }

    const request = openPastChallengePractice(gameDate);
    openRequestRef.current = request;

    try {
      return await request;
    } finally {
      openRequestRef.current = null;
    }
  }, [gameDate]);

  const openGame = useCallback(() => {
    if (isOpeningGame || openRequestRef.current) {
      return;
    }

    setIsOpeningGame(true);
    setError(null);

    void loadPracticeOnce()
      .then((loadedQuestions) => {
        applyOpenedPracticeState(loadedQuestions, {
          setQuestions,
          setCurrentIndex,
          setPhase,
          setFinalScore,
          setSelectedAnswer,
          setShowResult,
          setCorrectAnswer,
          setRunCompleted,
          setLiveMessage,
        });
      })
      .catch((loadError) => {
        setError(toPracticeErrorMessage(loadError));
      })
      .finally(() => {
        setIsOpeningGame(false);
        setInitialLoadPending(false);
      });
  }, [isOpeningGame, loadPracticeOnce]);

  useEffect(() => {
    if (!shouldLoadGame || hasLoadedGameRef.current) {
      return;
    }

    hasLoadedGameRef.current = true;
    openGame();
  }, [shouldLoadGame, openGame]);

  const loadingTimedOut = useLoadingTimeout(initialLoadPending || isOpeningGame);

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
      const result: PracticeAnswerResult = await submitPastChallengePracticeAnswer(
        question.practiceRunId,
        question.questionId,
        index,
      );

      setQuestions((prev) =>
        prev.map((item) =>
          item.questionId === question.questionId
            ? applyAnswerToPracticeQuestion(item, result)
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
      setError(toPracticeErrorMessage(err));
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const nextQuestion = () => {
    if (!questions.length) {
      return;
    }

    if (runCompleted || isPracticeRunCompleted(questions)) {
      setFinalScore(score);
      setPhase('finished');
      return;
    }

    const nextIndex = getActivePracticeQuestionIndex(questions);
    const next = questions[nextIndex];
    setCurrentIndex(nextIndex);
    setSelectedAnswer(next?.answered ? next.selectedAnswer : null);
    setShowResult(Boolean(next?.answered));
    setCorrectAnswer(null);
    setRunCompleted(false);
    setLiveMessage('');
  };

  const practiceBanner = (
    <div className="mb-4 bg-amber-100 border-4 border-amber-900 px-4 py-2 text-center font-black uppercase text-sm">
      Praktika modua · Ez du sailkapenerako balio
    </div>
  );

  if (loadingTimedOut && initialLoadPending && !questions.length && !error) {
    return (
      <div className="min-h-screen bg-neutral-50 p-6 flex items-center justify-center">
        <div className="max-w-lg w-full space-y-4">
          {practiceBanner}
          <div className="bg-red-100 border-4 border-red-900 p-4 font-bold text-center">
            Ezin izan da edukia kargatu.
          </div>
          <button
            type="button"
            onClick={openGame}
            disabled={isOpeningGame}
            className={`${buttonBaseStyle} w-full disabled:opacity-60`}
          >
            Saiatu berriro
          </button>
          <button type="button" onClick={onExitToCatalog} className={`${buttonBaseStyle} w-full`}>
            Itzuli zerrendara
          </button>
        </div>
      </div>
    );
  }

  if (initialLoadPending) {
    return (
      <div className="min-h-screen bg-neutral-50 p-6 pb-24">
        <div className="max-w-xl mx-auto">
          {practiceBanner}
          <PanelSkeleton />
        </div>
      </div>
    );
  }

  if (error && !questions.length) {
    return (
      <div className="min-h-screen bg-neutral-50 p-6 flex items-center justify-center">
        <div className="max-w-lg w-full space-y-4">
          {practiceBanner}
          <div className="bg-red-100 border-4 border-red-900 p-4 font-bold text-center">{error}</div>
          <button
            type="button"
            onClick={openGame}
            disabled={isOpeningGame}
            className={`${buttonBaseStyle} w-full disabled:opacity-60`}
          >
            {isOpeningGame ? 'Kargatzen...' : 'Saiatu berriro'}
          </button>
          <button type="button" onClick={onExitToCatalog} className={`${buttonBaseStyle} w-full`}>
            Itzuli zerrendara
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="bg-white border-4 border-neutral-900 p-8 w-full max-w-lg text-center shadow-[12px_12px_0_0_rgba(23,23,23,1)] space-y-4">
          {practiceBanner}
          <h2 className="text-2xl font-black uppercase">Praktika-saioa amaituta</h2>
          <p className="font-bold text-neutral-700">
            Emaitza honek ez du sailkapenean eraginik.
          </p>
          <p className="text-2xl font-bold">
            {finalScore}/{questions.length || 20}
          </p>
          <button type="button" onClick={onExitToCatalog} className={`${buttonBaseStyle} w-full`}>
            Beste erronka bat praktikatu
          </button>
          <button type="button" onClick={onExitHome} className={`${buttonBaseStyle} w-full bg-white`}>
            Hasierara itzuli
          </button>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-neutral-50 p-6 flex items-center justify-center">
        <div className="max-w-lg w-full space-y-4">
          {practiceBanner}
          <div className="bg-red-100 border-4 border-red-900 p-4 font-bold text-center">
            Ezin izan da erronka kargatu.
          </div>
          <button type="button" onClick={openGame} disabled={isOpeningGame} className={`${buttonBaseStyle} w-full`}>
            Saiatu berriro
          </button>
          <button type="button" onClick={onExitToCatalog} className={`${buttonBaseStyle} w-full`}>
            Itzuli zerrendara
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-neutral-50 p-4 sm:p-6">
      <div className="max-w-xl mx-auto w-full">
        {practiceBanner}
        <p className="text-sm font-bold text-neutral-600 mb-4 text-center">
          {formatGameDate(gameDate)}
        </p>

        <header className="flex justify-between items-center mb-8">
          <button
            type="button"
            onClick={onExitToCatalog}
            className="bg-white border-4 border-neutral-900 p-2 shadow-[2px_2px_0_0_rgba(23,23,23,1)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-indigo-500"
            aria-label="Irten praktikatik"
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
            <h2 className="text-xl sm:text-2xl font-black mb-6 leading-tight break-anywhere">
              {question.question}
            </h2>

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
                {runCompleted || isPracticeRunCompleted(questions)
                  ? 'Amaitu praktika'
                  : 'Hurrengo galdera'}
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
