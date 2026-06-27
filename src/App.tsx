/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { Question } from './types';
import { RefreshCw, Trophy, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getGameDayInfo } from './services/dailySchedule';
import { fetchTodaysQuestions } from './services/questions';

const buttonBaseStyle =
  'bg-white border-4 border-neutral-900 p-4 flex flex-col items-center text-center transition-all hover:shadow-[8px_8px_0_0_rgba(23,23,23,1)] shadow-[4px_4px_0_0_rgba(23,23,23,1)]';

export default function App() {
  const [gameState, setGameState] = useState<'home' | 'playing' | 'gameOver'>('home');
  const [gameQuestions, setGameQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTodaysGame = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const questions = await fetchTodaysQuestions(getGameDayInfo());

      setGameQuestions(questions);
      setCurrentIndex(0);
      setScore(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setGameState('playing');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Errore bat gertatu da galderak kargatzerakoan.',
      );
      setGameState('home');
    } finally {
      setLoading(false);
    }
  }, []);

  const exitGame = () => {
    setGameState('home');
    setShowResult(false);
  };

  const handleAnswer = (index: number) => {
    if (showResult) return;

    setSelectedAnswer(index);
    setShowResult(true);

    if (index === gameQuestions[currentIndex].answer) {
      setScore((current) => current + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIndex + 1 < gameQuestions.length) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setGameState('gameOver');
    }
  };

  if (gameState === 'home') {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4 sm:p-6 text-neutral-900">
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-neutral-900 mb-2 tracking-tighter text-center">
          MINTZAKATS
        </h1>
        <p className="text-sm sm:text-base font-bold text-neutral-600 mb-4 text-center">
          Eguneko 20 galdera · asteko zikloa
        </p>
        <div className="w-24 sm:w-40 h-2 sm:h-3 bg-neutral-900 mb-8 md:mb-10"></div>

        {error && (
          <div className="bg-red-100 border-4 border-red-900 p-4 mb-8 font-bold w-full max-w-lg text-center">
            {error}
          </div>
        )}

        <button
          onClick={startTodaysGame}
          disabled={loading}
          className="bg-indigo-500 text-neutral-900 border-4 border-neutral-900 p-4 flex flex-col items-center text-center transition-all hover:bg-indigo-400 hover:shadow-[8px_8px_0_0_rgba(23,23,23,1)] shadow-[4px_4px_0_0_rgba(23,23,23,1)] w-full max-w-lg py-6 md:py-8 disabled:opacity-60"
        >
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-4 border-neutral-900 flex items-center justify-center bg-white mb-3 text-neutral-900">
            {loading ? '…' : <Play size={32} fill="currentColor" />}
          </div>
          <span className="text-xl md:text-2xl font-black tracking-tighter leading-none uppercase">
            {loading ? 'KARGATZEN...' : 'HASI GAURKO JOKOA'}
          </span>
        </button>
      </div>
    );
  }

  if (gameState === 'gameOver') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white border-4 border-neutral-900 p-8 sm:p-12 w-full max-w-lg text-center shadow-[12px_12px_0_0_rgba(23,23,23,1)]">
          <Trophy size={48} className="mx-auto text-yellow-500 mb-6 sm:hidden" />
          <Trophy size={64} className="mx-auto text-yellow-500 mb-6 hidden sm:block" />
          <h2 className="text-3xl sm:text-5xl font-black text-neutral-900 mb-6 tracking-tighter uppercase">
            Gaurko jokoa!
          </h2>
          <p className="text-xl sm:text-2xl text-neutral-700 mb-8 sm:mb-10 font-bold">
            ZURE EMAITZA:{' '}
            <span className="font-black text-indigo-600">
              {score} / {gameQuestions.length}
            </span>
          </p>
          <div className="space-y-4">
            <button
              onClick={startTodaysGame}
              disabled={loading}
              className={`${buttonBaseStyle} bg-indigo-500 hover:bg-indigo-400 w-full disabled:opacity-60`}
            >
              <Play size={24} className="mb-2" />
              BERRIRO JOKATU
            </button>
            <button onClick={() => setGameState('home')} className={`${buttonBaseStyle} w-full`}>
              <RefreshCw size={24} className="mb-2" />
              HASIERARA ITZULI
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
            onClick={exitGame}
            className="bg-white border-4 border-neutral-900 p-2 shadow-[2px_2px_0_0_rgba(23,23,23,1)] hover:shadow-[4px_4px_0_0_rgba(23,23,23,1)] transition-all"
          >
            <RefreshCw size={24} className="text-neutral-900" />
          </button>
          <div className="font-extrabold text-neutral-900 bg-white border-4 border-neutral-900 px-6 py-2 shadow-[4px_4px_0_0_rgba(23,23,23,1)] text-lg">
            {score} / {gameQuestions.length}
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white border-4 border-neutral-900 p-5 sm:p-8 shadow-[8px_8px_0_0_rgba(23,23,23,1)]"
          >
            <div className="h-3 sm:h-4 bg-neutral-200 border-2 border-neutral-900 mb-6 sm:mb-8 p-1">
              <div
                className="h-full bg-neutral-900 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / gameQuestions.length) * 100}%` }}
              ></div>
            </div>

            <p className="text-[10px] sm:text-sm text-neutral-500 font-bold mb-2 tracking-wider uppercase">
              Galdera {currentIndex + 1} / {gameQuestions.length}
            </p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-neutral-900 mb-6 sm:mb-8 tracking-tight leading-tight">
              {question.question}
            </h2>

            <div className="space-y-4">
              {question.candidates.map((candidate, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = index === question.answer;

                let buttonStateClasses = 'border-4 border-neutral-900 bg-white hover:bg-neutral-100';
                if (showResult) {
                  if (isCorrect) {
                    buttonStateClasses = 'bg-green-400 border-4 border-neutral-900 text-neutral-900';
                  } else if (isSelected) {
                    buttonStateClasses = 'bg-red-400 border-4 border-neutral-900 text-neutral-900';
                  } else {
                    buttonStateClasses = 'bg-neutral-200 border-4 border-neutral-200 text-neutral-500';
                  }
                }

                return (
                  <motion.button
                    key={index}
                    whileHover={{ scale: showResult ? 1 : 1.01 }}
                    whileTap={{ scale: showResult ? 1 : 0.99 }}
                    onClick={() => handleAnswer(index)}
                    disabled={showResult}
                    transition={{ duration: 0.2 }}
                    className={`w-full text-left p-3 sm:p-4 font-bold text-base sm:text-lg flex items-center shadow-[4px_4px_0_0_rgba(23,23,23,1)] ${buttonStateClasses}`}
                  >
                    <span className="min-w-[2.5rem] h-10 flex items-center justify-center rounded-full bg-white border-4 border-neutral-900 text-neutral-900 font-black mr-3 sm:mr-4">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1 break-words">{candidate}</span>
                  </motion.button>
                );
              })}
            </div>

            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8"
              >
                <button
                  onClick={nextQuestion}
                  className="w-full bg-neutral-900 text-white py-4 font-extrabold text-lg shadow-[4px_4px_0_0_rgba(23,23,23,1)] hover:shadow-[8px_8px_0_0_rgba(23,23,23,1)] transition-all"
                >
                  {currentIndex + 1 < gameQuestions.length ? 'HURRENGO GALDERA' : 'EMAITZA IKUSI'}
                </button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
