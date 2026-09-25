import React, { useState } from 'react';
import { User, PageId, GameSession } from '../types';
import { StorageDB } from '../services/db';
import { Zap, Play, BookOpen, Shield, LogOut, Home, History, Sparkles, Settings, Menu, X, PlusCircle } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  activeGame: GameSession | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUser, currentPage, setCurrentPage, activeGame, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const quizzes = StorageDB.getQuizzes();
  const participants = StorageDB.getParticipants();

  const handleNav = (page: PageId) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
  };

  const handleSignOut = () => {
    setMobileMenuOpen(false);
    onLogout();
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-2xl bg-slate-950/90 border-b border-slate-800/80 text-white shadow-2xl">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <div 
          onClick={() => {
            if (!currentUser) handleNav('landing');
            else if (currentUser.role === 'host') handleNav('host_dashboard');
            else if (currentUser.role === 'admin') handleNav('admin_dashboard');
            else handleNav('landing');
          }} 
          className="flex items-center space-x-2.5 sm:space-x-3.5 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-all">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="text-lg sm:text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                NexGen Era
              </span>
              <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-extrabold tracking-wider uppercase">
                Pro
              </span>
            </div>
            <span className="hidden sm:block text-xs text-slate-400 font-medium tracking-wide">Live Interactive Gaming</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {currentUser?.role === 'host' && (
            <>
              <button
                onClick={() => handleNav('host_dashboard')}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 ${
                  currentPage === 'host_dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => handleNav('my_quizzes')}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 ${
                  currentPage === 'my_quizzes' || currentPage === 'create_quiz' || currentPage === 'edit_quiz' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>My Quizzes ({quizzes.length})</span>
              </button>
              <button
                onClick={() => handleNav('quiz_history')}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 ${
                  currentPage === 'quiz_history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <History className="w-4 h-4" />
                <span>History</span>
              </button>
            </>
          )}

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => handleNav('admin_dashboard')}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 ${
                currentPage === 'admin_dashboard' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin Center</span>
            </button>
          )}

          {(!currentUser || currentUser.role === 'participant') && (
            <button
              onClick={() => handleNav('join_game')}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:scale-105"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Join Game PIN</span>
            </button>
          )}
        </nav>

        {/* Desktop Profile & Actions */}
        <div className="hidden md:flex items-center space-x-3">
          {currentUser ? (
            <div className="flex items-center space-x-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 pr-3 shadow-xl">
              <div
                onClick={() => handleNav('profile_settings')}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-extrabold text-white cursor-pointer overflow-hidden shadow-md shadow-indigo-500/30 hover:scale-105 transition-transform"
              >
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  currentUser.name.charAt(0)
                )}
              </div>
              <div 
                onClick={() => handleNav('profile_settings')}
                className="text-left cursor-pointer group"
              >
                <div className="text-xs font-extrabold text-slate-100 group-hover:text-indigo-300 transition-colors truncate max-w-[120px]">{currentUser.name}</div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-indigo-400">{currentUser.role}</div>
              </div>

              <button
                onClick={() => handleNav('profile_settings')}
                title="Settings"
                className={`p-1.5 rounded-xl transition-colors ${currentPage === 'profile_settings' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleNav('login')}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => handleNav('join_game')}
                className="px-4 py-2 rounded-xl text-sm font-extrabold bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105"
              >
                Get Started
              </button>
            </div>
          )}
        </div>

        {/* Mobile Header Right Controls: Quick Action & Hamburger Menu */}
        <div className="flex items-center space-x-2 md:hidden">
          {(!currentUser || currentUser.role === 'participant') && (
            <button
              onClick={() => handleNav('join_game')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 flex items-center space-x-1"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>PIN</span>
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
            className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition-all"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-indigo-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800/90 bg-slate-950/98 backdrop-blur-2xl px-4 py-5 space-y-4 shadow-2xl animate-in slide-in-from-top duration-200">
          {currentUser && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div 
                onClick={() => handleNav('profile_settings')}
                className="flex items-center space-x-3 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-extrabold text-white overflow-hidden shadow-md">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    currentUser.name.charAt(0)
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-white truncate max-w-[160px]">{currentUser.name}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">{currentUser.role}</div>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleNav('profile_settings')}
                  title="Profile Settings"
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="p-2 text-slate-400 hover:text-red-400 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Navigation Links for Mobile */}
          <div className="space-y-1.5">
            {currentUser?.role === 'host' && (
              <>
                <button
                  onClick={() => handleNav('host_dashboard')}
                  className={`w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center space-x-3 ${
                    currentPage === 'host_dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Event Co-Ordinator Dashboard</span>
                </button>
                <button
                  onClick={() => handleNav('create_quiz')}
                  className={`w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center space-x-3 ${
                    currentPage === 'create_quiz' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create New Quiz</span>
                </button>
                <button
                  onClick={() => handleNav('my_quizzes')}
                  className={`w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${
                    currentPage === 'my_quizzes' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <BookOpen className="w-4 h-4" />
                    <span>My Quizzes</span>
                  </div>
                  <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">{quizzes.length}</span>
                </button>
                <button
                  onClick={() => handleNav('quiz_history')}
                  className={`w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center space-x-3 ${
                    currentPage === 'quiz_history' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>Game History</span>
                </button>
              </>
            )}

            {currentUser?.role === 'admin' && (
              <button
                onClick={() => handleNav('admin_dashboard')}
                className={`w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center space-x-3 ${
                  currentPage === 'admin_dashboard' ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin Center</span>
              </button>
            )}

            <button
              onClick={() => handleNav('join_game')}
              className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center space-x-3 ${
                currentPage === 'join_game' ? 'bg-emerald-600 text-white' : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Join Game with PIN</span>
            </button>
          </div>

          {!currentUser && (
            <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
              <button
                onClick={() => handleNav('login')}
                className="w-full py-3 rounded-xl text-sm font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors text-center"
              >
                Sign In
              </button>
              <button
                onClick={() => handleNav('join_game')}
                className="w-full py-3 rounded-xl text-sm font-extrabold bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white shadow-lg shadow-emerald-500/25 transition-all text-center"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
