import React, { useState } from 'react';
import { PageId, User, Quiz, GameSession } from '../types';
import { StorageDB } from '../services/db';
import { Shield, Users, BookOpen, Play, Trash2, UserX, UserCheck, AlertTriangle } from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User | null;
  setCurrentPage: (page: PageId) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, setCurrentPage }) => {
  const [users, setUsers] = useState<User[]>(StorageDB.getUsers());
  const [quizzes, setQuizzes] = useState<Quiz[]>(StorageDB.getQuizzes());
  const [activeGame, setActiveGame] = useState<GameSession | null>(StorageDB.getActiveGame());
  const [history, setHistory] = useState(StorageDB.getHistory());

  const handleToggleDisableUser = (userId: string) => {
    const updated = users.map(u => u.userId === userId ? { ...u, isDisabled: !u.isDisabled } : u);
    StorageDB.saveUsers(updated);
    setUsers(updated);
  };

  const handleDeleteQuiz = (quizId: string) => {
    const target = quizzes.find(q => q.quizId === quizId);
    if (!target) return;

    const confirmed = window.confirm(`Delete quiz "${target.title}"? This action cannot be undone.`);
    if (!confirmed) return;

    const updated = quizzes.filter(q => q.quizId !== quizId);
    StorageDB.saveQuizzes(updated);
    setQuizzes(updated);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-5 sm:pt-8">
        <div className="flex items-center justify-between mb-6 sm:mb-8 bg-gradient-to-r from-purple-900/30 via-slate-900/80 to-indigo-900/30 p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-800 backdrop-blur-xl">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-2 sm:mb-3">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Administrator Center</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Platform Administration</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Manage users, moderate quiz sets, and oversee active sessions.</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-10">
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold">{users.length}</div>
              <div className="text-[11px] sm:text-xs text-slate-400 font-medium">Total Users</div>
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold">{quizzes.length}</div>
              <div className="text-[11px] sm:text-xs text-slate-400 font-medium">Total Quizzes</div>
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Play className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold">{activeGame ? 1 : 0}</div>
              <div className="text-[11px] sm:text-xs text-slate-400 font-medium">Active Session</div>
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold">{history.length}</div>
              <div className="text-[11px] sm:text-xs text-slate-400 font-medium">Past Games</div>
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

        {/* Users Management */}
        <div className="mb-6 sm:mb-10 space-y-3 sm:space-y-4">
          <h2 className="text-xl sm:text-2xl font-extrabold">User Management</h2>
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            {users.map(u => (
              <div key={u.userId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/80 border border-slate-800 gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 shrink-0">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm sm:text-base flex items-center space-x-2">
                      <span className="truncate max-w-[160px] sm:max-w-none">{u.name}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        {u.role}
                      </span>
                      {u.isDisabled && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-none">{u.email}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-auto">
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => handleToggleDisableUser(u.userId)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1 ${
                        u.isDisabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {u.isDisabled ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Enable Account</span>
                        </>
                      ) : (
                        <>
                          <UserX className="w-3.5 h-3.5" />
                          <span>Disable Account</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quizzes Moderation */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-xl sm:text-2xl font-extrabold">All Platform Quizzes ({quizzes.length})</h2>
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            {quizzes.length === 0 ? (
              <div className="text-slate-500 text-xs sm:text-sm py-4 text-center">No quizzes found on the platform.</div>
            ) : (
              quizzes.map(q => (
                <div key={q.quizId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/80 border border-slate-800 gap-3">
                  <div>
                    <h4 className="font-bold text-white text-sm sm:text-base">{q.title}</h4>
                    <p className="text-xs text-slate-400">{q.subject} • {q.questions.length} Questions • {q.difficulty}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteQuiz(q.quizId)}
                    className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-colors flex items-center space-x-1.5 self-end sm:self-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
