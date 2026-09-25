import React, { useState } from 'react';
import { PageId, User, UserRole } from '../types';
import { StorageDB } from '../services/db';
import { Zap, Lock, Mail, User as UserIcon, ArrowRight, BookOpen, Play } from 'lucide-react';

interface RegisterPageProps {
  setCurrentPage: (page: PageId) => void;
  onLogin: (user: User) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ setCurrentPage, onLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('participant');
  const [participantId, setParticipantId] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          participantId: role === 'participant' ? (participantId || `PART-${Math.floor(1000 + Math.random() * 9000)}`) : undefined,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'user')}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Unable to create account.');
        return;
      }

      const newUser: User = {
        ...data.user,
        password,
      };

      const users = StorageDB.getUsers();
      StorageDB.saveUsers([...users.filter(u => u.email.toLowerCase() !== newUser.email.toLowerCase()), newUser]);
      onLogin(newUser);

      if (role === 'host') setCurrentPage('host_dashboard');
      else setCurrentPage('join_game');
    } catch (error) {
      setError('Unable to reach the authentication server. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-3.5 sm:px-4 py-8 sm:py-12 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-indigo-600/15 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg shadow-indigo-600/30">
            <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Create NexGen Era Account</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Join the next-generation live gaming platform</p>
        </div>

        {error && (
          <div className="mb-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs sm:text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">I am joining as a...</label>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setRole('host')}
                className={`p-3 rounded-xl sm:rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
                  role === 'host' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Event Co-Ordinator / Host</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('participant')}
                className={`p-3 rounded-xl sm:rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
                  role === 'participant' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Play className="w-4 h-4" />
                <span>Participant</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Full Name</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl sm:rounded-2xl pl-10 pr-4 py-2.5 sm:py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-medium text-xs sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="alex@nexgenerapro.edu"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl sm:rounded-2xl pl-10 pr-4 py-2.5 sm:py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-medium text-xs sm:text-sm"
              />
            </div>
          </div>

          {role === 'participant' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Participant ID (Optional)</label>
              <input
                type="text"
                value={participantId}
                onChange={e => setParticipantId(e.target.value)}
                placeholder="PART-2026"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl sm:rounded-2xl px-4 py-2.5 sm:py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-medium text-xs sm:text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl sm:rounded-2xl pl-10 pr-4 py-2.5 sm:py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-medium text-xs sm:text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 active:scale-95 mt-2"
          >
            <span>Create Account</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </form>

        <div className="mt-5 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <button
              onClick={() => setCurrentPage('login')}
              className="text-indigo-400 hover:text-indigo-300 font-bold ml-1"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
