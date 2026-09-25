import React, { useEffect } from 'react';
import { PageId, Quiz } from '../types';
import { StorageDB } from '../services/db';
import { useSound } from '../hooks/useSound';
import { Confetti } from '../components/Confetti';
import { Trophy, Home, Play } from 'lucide-react';

interface FinalResultsProps {
  quiz: Quiz | null;
  setCurrentPage: (page: PageId) => void;
}

export const FinalResults: React.FC<FinalResultsProps> = ({ quiz, setCurrentPage }) => {
  const participants = StorageDB.getParticipants().sort((a, b) => b.score - a.score);
  const winner = participants.length > 0 ? participants[0] : null;
  const top3 = participants.slice(0, 3);
  const { playVictory } = useSound();

  useEffect(() => {
    playVictory();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20 relative overflow-hidden">
      <Confetti />
      
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-amber-500/10 rounded-full blur-[100px] sm:blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-6 sm:pt-12 relative z-10 space-y-6 sm:space-y-8">
        <div className="text-center space-y-2 sm:space-y-3">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/40 animate-bounce">
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-slate-950" />
          </div>
          <span className="text-[11px] sm:text-xs uppercase tracking-widest font-black text-amber-400">Final Results & Rankings</span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">Quiz Complete! 🏆</h1>
          {winner && (
            <p className="text-sm sm:text-lg text-slate-300 font-semibold px-2">
              Winner: <span className="text-amber-300 font-bold">{winner.nickname}</span> with <span className="text-indigo-400 font-bold">{winner.score}</span> points!
            </p>
          )}
        </div>

        {/* Top 3 Podium */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-3 sm:pt-6 items-end">
          {/* 2nd Place */}
          {top3[1] ? (
            <div className="p-3 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800 text-center space-y-2 sm:space-y-3 shadow-xl transform translate-y-3 sm:translate-y-4">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-300 text-slate-950 font-black flex items-center justify-center mx-auto text-sm sm:text-lg shadow-md">
                2nd
              </div>
              <div>
                <div className="font-extrabold text-white text-xs sm:text-lg truncate">{top3[1].nickname}</div>
                <div className="text-xs sm:text-sm font-black text-indigo-400">{top3[1].score} pts</div>
              </div>
            </div>
          ) : <div />}

          {/* 1st Place */}
          {top3[0] ? (
            <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-amber-500/20 via-slate-900/90 to-slate-900 border border-amber-500/40 text-center space-y-2 sm:space-y-4 shadow-2xl scale-105">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-3xl bg-amber-500 text-slate-950 font-black flex items-center justify-center mx-auto text-base sm:text-2xl shadow-xl shadow-amber-500/40">
                1st
              </div>
              <div>
                <div className="font-black text-white text-sm sm:text-xl truncate">{top3[0].nickname}</div>
                <div className="text-xs sm:text-base font-black text-amber-300">{top3[0].score} pts</div>
              </div>
            </div>
          ) : <div />}

          {/* 3rd Place */}
          {top3[2] ? (
            <div className="p-3 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800 text-center space-y-2 sm:space-y-3 shadow-xl transform translate-y-6 sm:translate-y-8">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-700 text-white font-black flex items-center justify-center mx-auto text-sm sm:text-lg shadow-md">
                3rd
              </div>
              <div>
                <div className="font-extrabold text-white text-xs sm:text-lg truncate">{top3[2].nickname}</div>
                <div className="text-xs sm:text-sm font-black text-indigo-400">{top3[2].score} pts</div>
              </div>
            </div>
          ) : <div />}
        </div>

        {/* Full Rankings Table */}
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-3 sm:space-y-4 mt-8 sm:mt-12">
          <h3 className="text-lg sm:text-xl font-extrabold text-white">Full Leaderboard</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {participants.map((p, idx) => (
              <div key={p.participantId} className="flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm flex items-center justify-center shrink-0 ${
                    idx === 0 ? 'bg-amber-500 text-slate-950 shadow-md' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-white text-sm sm:text-base truncate max-w-[140px] sm:max-w-xs">{p.nickname}</div>
                    {p.studentId && <div className="text-[11px] text-slate-500 font-medium">{p.studentId}</div>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-indigo-400 text-sm sm:text-base">{p.score}</div>
                  <div className="text-[10px] text-slate-500">{p.correctAnswers} correct</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <button
            onClick={() => {
              StorageDB.setActiveGame(null);
              setCurrentPage('host_dashboard');
            }}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl sm:rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm sm:text-base border border-slate-700 transition-all flex items-center justify-center space-x-2 active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
          <button
            onClick={() => {
              StorageDB.setActiveGame(null);
              setCurrentPage('join_game');
            }}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Join Another Game</span>
          </button>
        </div>
      </div>
    </div>
  );
};
