import React, { useState } from 'react';
import { PageId, User, Quiz } from '../types';
import { StorageDB } from '../services/db';
import { PlusCircle, Play, BookOpen, Trophy, Users, Sparkles, Clock, Trash2, ArrowRight } from 'lucide-react';

interface HostDashboardProps {
  currentUser: User | null;
  setCurrentPage: (page: PageId) => void;
  onSelectQuizForGame: (quiz: Quiz) => void;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({ currentUser, setCurrentPage, onSelectQuizForGame }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => 
    StorageDB.getQuizzes().filter(q => !currentUser || q.hostId === currentUser.userId || q.hostId === 'user_host_1')
  );
  const history = StorageDB.getHistory();
  const activeGame = StorageDB.getActiveGame();

  const totalParticipantsCount = history.reduce((acc, h) => acc + h.totalParticipants, 0);

  const handleDeleteQuiz = (quizId: string) => {
    const target = quizzes.find(q => q.quizId === quizId);
    if (!target) return;

    const confirmed = window.confirm(`Delete quiz "${target.title}"? This action cannot be undone.`);
    if (!confirmed) return;

    const allQuizzes = StorageDB.getQuizzes();
    const updatedAll = allQuizzes.filter(q => q.quizId !== quizId);
    StorageDB.saveQuizzes(updatedAll);
    setQuizzes(updatedAll.filter(q => !currentUser || q.hostId === currentUser.userId || q.hostId === 'user_host_1'));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-16">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-5 sm:pt-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6 sm:mb-8 bg-gradient-to-r from-indigo-900/30 via-slate-900/80 to-purple-900/30 p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-800 backdrop-blur-xl">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2 sm:mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Event Co-Ordinator Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Welcome back, {currentUser?.name || 'Event Co-Ordinator'}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Manage quizzes and launch live multiplayer game sessions.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setCurrentPage('create_quiz')}
              className="px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 active:scale-95"
            >
              <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Create New Quiz</span>
            </button>
            <button
              onClick={() => setCurrentPage('my_quizzes')}
              className="px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm sm:text-base border border-slate-700 transition-all flex items-center justify-center space-x-2 active:scale-95"
            >
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
              <span>My Quizzes ({quizzes.length})</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-10">
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <BookOpen className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="text-xl sm:text-3xl font-extrabold text-white">{quizzes.length}</div>
              <div className="text-xs sm:text-sm font-medium text-slate-400">Total Quizzes</div>
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Users className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="text-xl sm:text-3xl font-extrabold text-white">{totalParticipantsCount}</div>
              <div className="text-xs sm:text-sm font-medium text-slate-400">Participants</div>
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Play className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="text-xl sm:text-3xl font-extrabold text-white">{activeGame ? 1 : 0}</div>
              <div className="text-xs sm:text-sm font-medium text-slate-400">Live Active</div>
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Trophy className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="text-xl sm:text-3xl font-extrabold text-white">{history.length}</div>
              <div className="text-xs sm:text-sm font-medium text-slate-400">Past Games</div>
            </div>
          </div>
        </div>

        {/* Active Game Banner if any */}
        {activeGame && (
          <div className="mb-6 sm:mb-10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-900/40 via-slate-900 to-indigo-900/40 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse shrink-0">
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-400">Live Session Active</span>
                <h3 className="text-base sm:text-xl font-extrabold text-white">PIN: <span className="text-amber-300 tracking-widest">{activeGame.gamePin}</span></h3>
              </div>
            </div>
            <div className="flex items-center space-x-2.5 w-full sm:w-auto">
              <button
                onClick={() => setCurrentPage('host_game_screen')}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 active:scale-95"
              >
                <span>Manage Session</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (window.confirm('End this live session?')) {
                    StorageDB.setActiveGame(null);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-extrabold transition-all"
                title="End or Clear Stuck Session"
              >
                End Session
              </button>
            </div>
          </div>
        )}

        {/* Quizzes List */}
        <div>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-extrabold">Your Quiz Library</h2>
            <button
              onClick={() => setCurrentPage('my_quizzes')}
              className="text-xs sm:text-sm text-indigo-400 hover:text-indigo-300 font-bold flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {quizzes.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-2xl sm:rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-4">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
              <h3 className="text-lg font-bold text-slate-300">No Quizzes Created Yet</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">Create a quiz manually or generate one instantly using Google Gemini AI.</p>
              <button
                onClick={() => setCurrentPage('create_quiz')}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all"
              >
                Create First Quiz
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {quizzes.slice(0, 6).map(quiz => (
                <div key={quiz.quizId} className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-col justify-between hover:border-indigo-500/50 transition-all shadow-xl group">
                  <div>
                    <div className="flex items-center justify-between mb-3 text-xs">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold">
                        {quiz.subject}
                      </span>
                      <span className={`font-bold px-2 py-0.5 rounded-full ${
                        quiz.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        quiz.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {quiz.difficulty}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold mb-1.5 text-white group-hover:text-indigo-300 transition-colors line-clamp-1">{quiz.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 mb-4">{quiz.description}</p>
                    
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-4">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{quiz.questions.length} Questions</span>
                      </span>
                      <span>{new Date(quiz.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                    <button
                      onClick={() => {
                        onSelectQuizForGame(quiz);
                        setCurrentPage('start_live_game');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center space-x-1.5 active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Game</span>
                    </button>
                    <button
                      onClick={() => handleDeleteQuiz(quiz.quizId)}
                      className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition-colors shrink-0"
                      title="Delete Quiz"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
