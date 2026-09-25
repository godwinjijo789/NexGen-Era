import React, { useState, useEffect } from 'react';
import { PageId, GameSession, Quiz, Participant, Response } from '../types';
import { StorageDB } from '../services/db';
import { useSound } from '../hooks/useSound';
import { Clock, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

interface StudentQuestionScreenProps {
  participant: Participant | null;
  setCurrentPage: (page: PageId) => void;
}

export const StudentQuestionScreen: React.FC<StudentQuestionScreenProps> = ({ participant, setCurrentPage }) => {
  const [activeGame, setActiveGame] = useState<GameSession | null>(StorageDB.getActiveGame());
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const { playClick, playSuccess, playError } = useSound();

  const currentQuiz = activeGame?.quiz || StorageDB.getQuizzes().find(q => q.quizId === activeGame?.quizId);
  const currentQuestion = currentQuiz?.questions[activeGame?.currentQuestionIndex || 0];
  const shouldShowFullQuestionToParticipants = currentQuiz?.showQuestionAndAnswersToParticipants !== false;
  const shouldShowMediaToParticipants = currentQuiz?.showMediaToParticipants !== false;
  const participantVisibleOptions = shouldShowFullQuestionToParticipants
    ? currentQuestion?.options ?? []
    : ['Option A', 'Option B', 'Option C', 'Option D'];

  useEffect(() => {
    const syncGameState = async () => {
      await StorageDB.refreshSharedState();
      const game = StorageDB.getActiveGame();
      setActiveGame(game);

      if (game?.status === 'question_result') {
        setCurrentPage('question_result_screen');
      } else if (game?.status === 'finished') {
        setCurrentPage('final_results');
      } else if (game?.status === 'question_active') {
        setSelectedAnswer(null);
        setIsLocked(false);
      }
    };

    syncGameState();

    const unsubscribe = StorageDB.subscribe(() => {
      syncGameState();
    });

    const intervalId = window.setInterval(syncGameState, 1500);
    return () => {
      unsubscribe();
      window.clearInterval(intervalId);
    };
  }, []);

  // Countdown timer for participant view
  useEffect(() => {
    if (currentQuestion) {
      setTimeLeft(currentQuestion.timerSeconds);
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeGame?.currentQuestionIndex]);

  const handleSelectAnswer = (optIdx: number) => {
    if (isLocked || !currentQuestion || !participant || !activeGame) return;
    setSelectedAnswer(optIdx);
    setIsLocked(true);

    const isCorrect = optIdx === currentQuestion.correctAnswer;
    playClick();
    if (isCorrect) {
      playSuccess();
    } else {
      playError();
    }
    const responseTime = currentQuestion.timerSeconds - timeLeft;
    const diffMultiplier = currentQuestion.difficulty === 'Hard' ? 2 : currentQuestion.difficulty === 'Medium' ? 1.5 : 1;
    const speedRatio = Math.max(0, (currentQuestion.timerSeconds - responseTime) / currentQuestion.timerSeconds);
    const points = isCorrect ? Math.round((1000 + speedRatio * 500) * diffMultiplier) : 0;

    const newResponse: Response = {
      responseId: `resp_${Date.now()}_${participant.participantId}`,
      gameId: activeGame.gameId,
      participantId: participant.participantId,
      questionId: currentQuestion.id,
      selectedAnswer: optIdx,
      isCorrect,
      responseTime,
      points,
      submittedAt: new Date().toISOString()
    };

    const responses = StorageDB.getResponses();
    StorageDB.saveResponses([...responses, newResponse]);
  };

  if (!currentQuestion || !activeGame) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold">Waiting for next question...</h2>
        </div>
      </div>
    );
  }

  const colors = [
    'bg-red-600 hover:bg-red-500 active:bg-red-700 border-red-500 shadow-red-600/30',
    'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 border-blue-500 shadow-blue-600/30',
    'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 border-amber-500 shadow-amber-600/30',
    'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 border-emerald-500 shadow-emerald-600/30'
  ];
  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-3.5 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-xs sm:text-sm shadow-md">
            {(activeGame.currentQuestionIndex || 0) + 1}
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-300">
            Question {(activeGame.currentQuestionIndex || 0) + 1} of {currentQuiz?.questions.length || '?'}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-extrabold text-xs sm:text-sm">
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Main Question & Answer Buttons */}
      <div className="max-w-4xl mx-auto w-full py-4 sm:py-8 space-y-4 sm:space-y-6 text-center">
        {shouldShowFullQuestionToParticipants && (
          <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white leading-snug break-words px-1">
            {currentQuestion.text}
          </h2>
        )}

        {shouldShowMediaToParticipants && (currentQuestion.mediaUrl || currentQuestion.imageUrl) && (
          <div className="max-w-md mx-auto rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800 shadow-xl">
            {currentQuestion.mediaType === 'video' ? (
              <video src={currentQuestion.mediaUrl || currentQuestion.imageUrl} controls className="w-full max-h-64 object-cover" />
            ) : (
              <img src={currentQuestion.mediaUrl || currentQuestion.imageUrl} alt="Question visual" className="w-full h-40 sm:h-56 object-cover" />
            )}
          </div>
        )}

        {isLocked ? (
          <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-3 sm:space-y-4 animate-pulse">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mx-auto">
              <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white">Answer Locked In!</h3>
            <p className="text-slate-400 text-xs sm:text-sm">Waiting for other participants and timer to end...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {participantVisibleOptions.map((opt, optIdx) => (
              <button
                key={optIdx}
                onClick={() => handleSelectAnswer(optIdx)}
                className={`min-h-[64px] sm:min-h-[80px] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border text-white font-extrabold text-base sm:text-lg shadow-xl transition-all active:scale-95 flex items-center space-x-3 sm:space-x-4 ${colors[optIdx]}`}
              >
                <span className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-slate-950/40 flex items-center justify-center text-base sm:text-lg font-black shrink-0">
                  {letters[optIdx]}
                </span>
                <span className="flex-1 text-left break-words leading-tight">{opt}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="text-center text-xs text-slate-500 pb-2">
        Playing as: <span className="font-bold text-slate-300">{participant?.nickname}</span>
      </div>
    </div>
  );
};
