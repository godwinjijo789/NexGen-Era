import React, { useState, useEffect } from 'react';
import { PageId, GameSession, Participant, Response } from '../types';
import { StorageDB } from '../services/db';
import { useSound } from '../hooks/useSound';
import { CheckCircle2, XCircle, Trophy, Award, ArrowRight } from 'lucide-react';

interface QuestionResultScreenProps {
  participant: Participant | null;
  setCurrentPage: (page: PageId) => void;
}

export const QuestionResultScreen: React.FC<QuestionResultScreenProps> = ({ participant, setCurrentPage }) => {
  const [activeGame, setActiveGame] = useState<GameSession | null>(StorageDB.getActiveGame());
  const [participants, setParticipants] = useState<Participant[]>(StorageDB.getParticipants());
  const [responses, setResponses] = useState<Response[]>(StorageDB.getResponses());
  const { playSuccess, playError } = useSound();

  const currentQuiz = StorageDB.getQuizzes().find(q => q.quizId === activeGame?.quizId);
  const currentQuestion = currentQuiz?.questions[activeGame?.currentQuestionIndex || 0];

  const myResponse = responses.find(r => r.gameId === activeGame?.gameId && r.participantId === participant?.participantId && r.questionId === currentQuestion?.id);

  useEffect(() => {
    const syncGameState = async () => {
      await StorageDB.refreshSharedState();
      const game = StorageDB.getActiveGame();
      setActiveGame(game);
      setParticipants(StorageDB.getParticipants());
      setResponses(StorageDB.getResponses());

      if (game?.status === 'question_active') {
        setCurrentPage('student_question_screen');
      } else if (game?.status === 'finished') {
        setCurrentPage('final_results');
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

  useEffect(() => {
    if (myResponse) {
      if (myResponse.isCorrect) {
        playSuccess();
      } else {
        playError();
      }
    }
  }, []);
  const currentParticipant = participants.find(p => p.participantId === participant?.participantId);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-3.5 sm:px-4 py-8 sm:py-12">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-5 sm:space-y-6">
        {myResponse?.isCorrect ? (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
        ) : (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
            <XCircle className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
        )}

        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {myResponse?.isCorrect ? 'Correct! 🎉' : 'Incorrect 😢'}
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            {myResponse?.isCorrect ? `You earned +${myResponse.points} points!` : 'Better luck on the next question!'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 py-3 sm:py-4 border-y border-slate-800">
          <div>
            <div className="text-xl sm:text-2xl font-black text-indigo-400">{currentParticipant?.score || 0}</div>
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 font-bold mt-1">Total Score</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-amber-400">#{currentParticipant?.rank || '-'}</div>
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 font-bold mt-1">Current Rank</div>
          </div>
        </div>

        <div className="text-xs text-slate-400 italic">
          Waiting for host to move to the next question or leaderboard...
        </div>
      </div>
    </div>
  );
};
