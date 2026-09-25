import React, { useState, useEffect } from 'react';
import { PageId, GameSession, Participant } from '../types';
import { StorageDB } from '../services/db';
import { Users, Sparkles, Trophy } from 'lucide-react';

interface StudentWaitingRoomProps {
  participant: Participant | null;
  setCurrentPage: (page: PageId) => void;
}

export const StudentWaitingRoom: React.FC<StudentWaitingRoomProps> = ({ participant, setCurrentPage }) => {
  const [activeGame, setActiveGame] = useState<GameSession | null>(StorageDB.getActiveGame());
  const [participants, setParticipants] = useState<Participant[]>(StorageDB.getParticipants());

  useEffect(() => {
    const syncGameState = async () => {
      await StorageDB.refreshSharedState();
      const game = StorageDB.getActiveGame();
      setActiveGame(game);
      setParticipants(StorageDB.getParticipants());

      if (game?.status === 'question_active') {
        setCurrentPage('student_question_screen');
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

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-3.5 sm:px-4 py-8 sm:py-12 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-emerald-600/15 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 text-center space-y-5 sm:space-y-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 overflow-hidden">
          {participant?.avatar ? (
            <img src={participant.avatar} alt={participant.nickname} className="w-full h-full object-cover" />
          ) : (
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          )}
        </div>

        <div>
          <span className="text-[11px] sm:text-xs uppercase tracking-widest font-extrabold text-emerald-400">You're In, {participant?.nickname || 'Participant'}!</span>
          <h2 className="text-2xl sm:text-3xl font-black mt-1">Waiting for Host...</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 sm:mt-2">The quiz will start as soon as your Event Co-Ordinator launches it.</p>
        </div>

        <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-400">Game PIN</span>
            <span className="font-extrabold text-emerald-400 tracking-wider text-base sm:text-lg">{activeGame?.gamePin}</span>
          </div>
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-400">Participants Joined</span>
            <span className="font-extrabold text-white flex items-center space-x-1">
              <Users className="w-4 h-4 text-indigo-400 mr-1" />
              <span>{participants.length}</span>
            </span>
          </div>
        </div>

        <div className="text-[11px] sm:text-xs text-slate-500 italic">
          Tip: Answer correctly and quickly to earn speed bonus points!
        </div>
      </div>
    </div>
  );
};
