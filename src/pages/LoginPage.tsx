import React, { useState } from 'react';
import { PageId, User } from '../types';
import { getApiBaseUrl, StorageDB } from '../services/db';
import { Zap, Lock, Mail, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  setCurrentPage: (page: PageId) => void;
  onLogin: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ setCurrentPage, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const API_URL = getApiBaseUrl();
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Invalid email or password. Please use the registered credentials.');
        return;
      }

      const found: User = data.user;

      if (found.isDisabled) {
        setError('This account has been disabled by an administrator.');
        return;
      }

      const users = StorageDB.getUsers();
      StorageDB.saveUsers([...users.filter(u => u.email.toLowerCase() !== found.email.toLowerCase()), found]);
      onLogin(found);

      if (found.role === 'host') setCurrentPage('host_dashboard');
      else if (found.role === 'admin') setCurrentPage('admin_dashboard');
      else setCurrentPage('join_game');
    } catch (error) {
      setError('Unable to reach the authentication server. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-3.5 sm:px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-indigo-600/15 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg shadow-indigo-600/30">
            <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome Back to NexGen Era</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Sign in to your account or launch a quick demo</p>
        </div>

        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs sm:text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 sm:mb-2">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="coordinator@nexgenerapro.edu"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl sm:rounded-2xl pl-10 pr-4 py-2.5 sm:py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-medium text-xs sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 sm:mb-2">Password</label>
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
            className="w-full py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 active:scale-95"
          >
            <span>Sign In</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800/80 text-center space-y-3">
          <p className="text-xs text-slate-400">
            Don't have an account?{' '}
            <button
              onClick={() => setCurrentPage('register')}
              className="text-indigo-400 hover:text-indigo-300 font-bold ml-1"
            >
              Register here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
