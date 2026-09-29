import React, { useState } from 'react';
import { PageId, Quiz, GameSession, User } from '../types';
import { StorageDB, normalizeGamePin } from '../services/db';
import { getSupabaseErrorMessage } from '../lib/supabase';
import { Play, ArrowLeft, Zap } from 'lucide-react';

interface StartLiveGameProps {
  quiz: Quiz | null;
  currentUser: User | null;
  setCurrentPage: (page: PageId) => void;
  onGameStarted: (game: GameSession) => void;
}

export const StartLiveGame: React.FC<StartLiveGameProps> = ({ quiz, currentUser, setCurrentPage, onGameStarted }) => {
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [error, setError] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);

  if (!quiz) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">No Quiz Selected</h2>
          <button onClick={() => setCurrentPage('my_quizzes')} className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold">
            Select a Quiz
          </button>
        </div>
      </div>
    );
  }

  const handleLaunchGame = async () => {
    const createGamePin = () => {
      const digits = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10).toString()).join('');
      return normalizeGamePin(digits);
    };

    setIsLaunching(true);
    setError('');
    try {
      if (quiz.quizId.startsWith('folder_session_')) {
        await StorageDB.saveFolderSessionQuiz(quiz);
      }
      const newGame = await StorageDB.startGame(quiz, createGamePin());
      onGameStarted(newGame);
      setCurrentPage('host_game_screen');
    } catch (launchError) {
      setError(getSupabaseErrorMessage(launchError, 'Unable to start this game. Please try again.'));
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-3.5 sm:px-6 py-8 sm:py-12">
      <div className="max-w-xl w-full bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl relative space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentPage('my_quizzes')}
            className="flex items-center space-x-1.5 text-slate-400 hover:text-white transition-colors font-semibold text-xs sm:text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Quizzes</span>
          </button>
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            {quiz.subject}
          </span>
        </div>

        <div className="text-center space-y-2">
          {quiz.coverImage && <img src={quiz.coverImage} alt={`${quiz.title} cover`} className="mx-auto mb-4 block max-h-[45vh] max-w-full w-auto rounded-xl bg-slate-950/50 object-contain" />}
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/30 mb-3 sm:mb-4">
            <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Launch Live Session</h1>
          <p className="text-slate-400 text-xs sm:text-sm">You are about to start a live game for:</p>
          <h2 className="text-lg sm:text-xl font-bold text-indigo-300">{quiz.title}</h2>
        </div>

        {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

        <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-400">Total Questions</span>
            <span className="font-bold text-white">{quiz.questions.length} Questions</span>
          </div>
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-400">Difficulty</span>
            <span className="font-bold text-white">{quiz.difficulty}</span>
          </div>
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-400">Capacity</span>
            <span className="font-bold text-emerald-400">Up to 100 Players</span>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl bg-slate-950/40 border border-slate-800">
            <input
              type="checkbox"
              checked={randomizeQuestions}
              onChange={e => setRandomizeQuestions(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
            />
            <span className="text-xs sm:text-sm font-medium text-slate-300">Randomize question order for participants</span>
          </label>
        </div>

        <button
          onClick={handleLaunchGame}
          disabled={isLaunching}
          className="w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-base sm:text-lg shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 active:scale-95"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>{isLaunching ? 'Starting Live Game...' : 'Launch Live Game Session'}</span>
        </button>
      </div>
    </div>
  );
};
