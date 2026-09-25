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

      const syncedQuestion = game?.quiz?.questions[game.currentQuestionIndex];
      const existingResponse = StorageDB.getResponses().find(response =>
        response.gameId === game?.gameId &&
        response.participantId === participant?.participantId &&
        response.questionId === syncedQuestion?.id
      );

      if (game?.status === 'question_result') {
        setCurrentPage('question_result_screen');
      } else if (game?.status === 'finished') {
        setCurrentPage('final_results');
      } else if (game?.status === 'question_active') {
        setSelectedAnswer(existingResponse?.selectedAnswer ?? null);
        setIsLocked(Boolean(existingResponse));
      }
    };

    syncGameState();

    const unsubscribe = StorageDB.subscribe(() => {
      syncGameState();
    });

    const intervalId = window.setInterval(syncGameState, 500);
    return () => {
      unsubscribe();
      window.clearInterval(intervalId);
    };
  }, []);

  // Countdown timer for participant view
  useEffect(() => {
    if (currentQuestion && activeGame?.status === 'question_active') {
      const startedAt = activeGame.questionStartTime || Date.now();
      const updateTimeLeft = () => {
        const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
        setTimeLeft(Math.max(0, currentQuestion.timerSeconds - elapsedSeconds));
      };

      updateTimeLeft();
      const timer = setInterval(() => {
        updateTimeLeft();
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeGame?.status, activeGame?.currentQuestionIndex, activeGame?.questionStartTime, currentQuestion?.id, currentQuestion?.timerSeconds]);

  const handleSelectAnswer = (optIdx: number) => {
    if (isLocked || timeLeft <= 0 || !currentQuestion || !participant || !activeGame) return;
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

        {isLocked && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 inline-block mr-2 align-text-bottom" />
            Answer locked. Waiting for the host to show scores.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {participantVisibleOptions.map((opt, optIdx) => (
            <button
              key={optIdx}
              type="button"
              disabled={isLocked || timeLeft <= 0}
              onClick={() => handleSelectAnswer(optIdx)}
              className={`min-h-[64px] sm:min-h-[80px] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border text-white font-extrabold text-base sm:text-lg shadow-xl transition-all flex items-center space-x-3 sm:space-x-4 ${colors[optIdx]} ${selectedAnswer === optIdx ? 'ring-4 ring-white bg-white/30 scale-[1.02]' : ''} ${isLocked || timeLeft <= 0 ? 'cursor-default opacity-80' : 'active:scale-95'}`}
            >
              <span className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-slate-950/40 flex items-center justify-center text-base sm:text-lg font-black shrink-0">
                {letters[optIdx]}
              </span>
              <span className="flex-1 text-left break-words leading-tight">{opt}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="text-center text-xs text-slate-500 pb-2">
        Playing as: <span className="font-bold text-slate-300">{participant?.nickname}</span>
      </div>
    </div>
  );
};
