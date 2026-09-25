import React from 'react';
import { PageId, User } from '../types';
import { Zap, Play, Sparkles, Trophy, Users, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  setCurrentPage: (page: PageId) => void;
  currentUser: User | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({ setCurrentPage, currentUser }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Hero Section */}
      <div className="relative pt-8 pb-16 sm:pt-16 sm:pb-24 lg:pt-24 lg:pb-32 overflow-hidden">
        {/* Background glow gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-indigo-600/20 rounded-full blur-[90px] sm:blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/3 right-5 sm:right-10 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-pink-600/15 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs sm:text-sm font-semibold mb-6 sm:mb-8 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400 shrink-0" />
              <span>Next-Gen Real-Time Learning</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-5 sm:mb-8 leading-[1.15]">
              Transform Lessons Into <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                Thrilling Live Competitions
              </span>
            </h1>

            <p className="text-sm sm:text-lg lg:text-xl text-slate-300 mb-8 sm:mb-10 leading-relaxed max-w-2xl mx-auto px-2">
              Engage participants instantly with synchronized questions, live countdown timers, speed scoring, and real-time leaderboards.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-5 w-full max-w-md sm:max-w-none mx-auto">
              <button
                onClick={() => setCurrentPage('join_game')}
                className="w-full sm:w-auto min-h-[52px] px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-base sm:text-lg shadow-xl shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center space-x-2.5"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Join Game with PIN</span>
              </button>

              <button
                onClick={() => {
                  if (currentUser?.role === 'host') setCurrentPage('host_dashboard');
                  else setCurrentPage(currentUser ? 'host_dashboard' : 'login');
                }}
                className="w-full sm:w-auto min-h-[52px] px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base sm:text-lg shadow-xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center space-x-2.5"
              >
                <span>Host a Quiz</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="mt-14 sm:mt-24 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl group hover:border-indigo-500/50 transition-all shadow-xl">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 sm:mb-6">
                <Zap className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-white">Instant Real-Time Sync</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Seamless synchronization across all participants' phones and tablets. Questions and countdowns update simultaneously.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl group hover:border-purple-500/50 transition-all shadow-xl">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 sm:mb-6">
                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-white">AI Quiz Generator</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Generate tailored quizzes in seconds using Google Gemini AI. Enter any topic to get questions and options instantly.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl group hover:border-pink-500/50 transition-all shadow-xl">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-pink-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-4 sm:mb-6">
                <Trophy className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-white">Dynamic Scoring & Podiums</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Advanced scoring rewarding accuracy and speed, complete with podium celebrations, audio effects, and reports.
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-10 sm:mt-16 p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-indigo-900/30 via-slate-900/60 to-purple-900/30 border border-slate-800 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl sm:text-4xl font-extrabold text-indigo-400 mb-0.5">100%</div>
              <div className="text-[11px] sm:text-sm font-medium text-slate-400">Live Sync</div>
            </div>
            <div>
              <div className="text-2xl sm:text-4xl font-extrabold text-purple-400 mb-0.5">50</div>
              <div className="text-[11px] sm:text-sm font-medium text-slate-400">Q Limit</div>
            </div>
            <div>
              <div className="text-2xl sm:text-4xl font-extrabold text-pink-400 mb-0.5">0s</div>
              <div className="text-[11px] sm:text-sm font-medium text-slate-400">Delay</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
