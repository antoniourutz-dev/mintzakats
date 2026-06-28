import { useCallback, useState } from 'react';
import { RefreshCw, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Question } from '../types';
import { getGameDayInfo } from '../services/dailySchedule';
import { fetchTodaysQuestions } from '../services/questions';
import { buttonBaseStyle } from '../styles';

type PracticeGameViewProps = {
  onExit: () => void;
};

export function PracticeGameView({ onExit }: PracticeGameViewProps) {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameOver'>('intro');
  const [gameQuestions, setGameQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState('');

  const startPractice = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const questions = await fetchTodaysQuestions(getGameDayInfo());
      setGameQuestions(questions);
      setCurrentIndex(0);
      setScore(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setLiveMessage('');
      setGameState('playing');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Errore bat gertatu da galderak kargatzerakoan.',
      );
      setGameState('intro');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAnswer = (index: number) => {
    if (showResult) return;
    const isCorrect = index === gameQuestions[currentIndex].answer;
    setSelectedAnswer(index);
    setShowResult(true);
    setLiveMessage(isCorrect ? 'Erantzun zuzena.' : 'Erantzun okerra.');
    if (isCorrect) {
      setScore((current) => current + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIndex + 1 < gameQuestions.length) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setLiveMessage('');
    } else {
      setGameState('gameOver');
    }
  };

  if (gameState === 'intro') {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-lg w-full text-center space-y-6">
          <h2 className="text-3xl font-black uppercase">Entrenamendua</h2>
          <p className="font-bold text-neutral-600">Entrenamendua · ez du ranking-erako balio</p>
          {error && (
            <div className="bg-red-100 border-4 border-red-900 p-4 font-bold">{error}</div>
          )}
          <button
            type="button"
            onClick={() => void startPractice()}
            disabled={loading}
            className={`${buttonBaseStyle} bg-indigo-500 hover:bg-indigo-400 w-full disabled:opacity-60`}
          >
            {loading ? 'KARGATZEN...' : 'HASI ENTRENAMENDUA'}
          </button>
          <button type="button" onClick={onExit} className={`${buttonBaseStyle} w-full`}>
            Itzuli
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'gameOver') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="bg-white border-4 border-neutral-900 p-8 w-full max-w-lg text-center shadow-[12px_12px_0_0_rgba(23,23,23,1)]">
          <h2 className="text-3xl font-black mb-4 uppercase">Entrenamendua amaitu da</h2>
          <p className="text-2xl font-bold mb-8">
            {score}/{gameQuestions.length}
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void startPractice()}
              disabled={loading}
              className={`${buttonBaseStyle} bg-indigo-500 hover:bg-indigo-400 w-full disabled:opacity-60`}
            >
              Berriro jokatu
            </button>
            <button type="button" onClick={onExit} className={`${buttonBaseStyle} w-full`}>
              Hasierara itzuli
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = gameQuestions[currentIndex];

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <button
            type="button"
            onClick={onExit}
            className="bg-white border-4 border-neutral-900 p-2 focus-visible:outline focus-visible:outline-4 focus-visible:outline-indigo-500"
            aria-label="Irten entrenamendutik"
          >
            <RefreshCw size={24} />
          </button>
          <div className="font-extrabold bg-white border-4 border-neutral-900 px-6 py-2">
            {score}/{gameQuestions.length}
          </div>
        </header>

        <p className="sr-only" aria-live="polite">
          {liveMessage}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white border-4 border-neutral-900 p-5 sm:p-8 shadow-[8px_8px_0_0_rgba(23,23,23,1)]"
          >
            <p className="text-sm font-bold text-neutral-500 mb-2 uppercase">
              Galdera {currentIndex + 1}/{gameQuestions.length}
            </p>
            <h2 className="text-2xl font-black mb-6">{question.question}</h2>

            <div className="space-y-4">
              {question.candidates.map((candidate, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = index === question.answer;
                let classes = 'border-4 border-neutral-900 bg-white hover:bg-neutral-100';
                if (showResult) {
                  if (isCorrect) classes = 'bg-green-400 border-4 border-neutral-900';
                  else if (isSelected) classes = 'bg-red-400 border-4 border-neutral-900';
                  else classes = 'bg-neutral-200 border-4 border-neutral-200 text-neutral-500';
                }

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleAnswer(index)}
                    disabled={showResult}
                    className={`w-full text-left p-4 font-bold flex items-center shadow-[4px_4px_0_0_rgba(23,23,23,1)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-indigo-500 ${classes}`}
                  >
                    <span className="min-w-[2.5rem] h-10 flex items-center justify-center rounded-full bg-white border-4 border-neutral-900 font-black mr-3">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{candidate}</span>
                  </button>
                );
              })}
            </div>

            {showResult && (
              <button
                type="button"
                onClick={nextQuestion}
                className="w-full mt-8 bg-neutral-900 text-white py-4 font-extrabold focus-visible:outline focus-visible:outline-4 focus-visible:outline-indigo-500"
              >
                {currentIndex + 1 < gameQuestions.length ? 'Hurrengo galdera' : 'Emaitza ikusi'}
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
