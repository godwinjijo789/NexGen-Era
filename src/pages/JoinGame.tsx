import React, { useState, useEffect } from 'react';
import { PageId, User, Participant } from '../types';
import { StorageDB, normalizeGamePin } from '../services/db';
import { getSupabaseErrorMessage } from '../lib/supabase';
import { extractJoinPinFromUrl } from '../utils/joinLink';
import { Play, ArrowRight, Zap, User as UserIcon } from 'lucide-react';

interface JoinGameProps {
  currentUser: User | null;
  setCurrentPage: (page: PageId) => void;
  onJoinedGame: (participant: Participant) => void;
}

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aiden',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Bella',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Daisy',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Fiona',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=George',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Hannah',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Cat',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Dog',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Panda',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Fox',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Lion',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Koala',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Penguin',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Rabbit',
];

export const JoinGame: React.FC<JoinGameProps> = ({ currentUser, setCurrentPage, onJoinedGame }) => {
  const [gamePin, setGamePin] = useState('');
  const [nickname, setNickname] = useState(currentUser?.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [error, setError] = useState('');

  useEffect(() => {
    const pinFromUrl = extractJoinPinFromUrl(window.location.search || window.location.href);
    if (pinFromUrl) {
      setGamePin(pinFromUrl);
    }
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPin = normalizeGamePin(gamePin);

    if (!/^\d{6}$/.test(normalizedPin) || !nickname.trim()) {
      setError('Please enter both a valid 6-digit game PIN and your nickname.');
      return;
    }

    try {
      const { participant } = await StorageDB.joinGame(normalizedPin, nickname, selectedAvatar);
      onJoinedGame(participant);
      setCurrentPage('student_waiting_room');
    } catch (error) {
      setError(getSupabaseErrorMessage(error, 'Unable to join this game. Check the PIN and try again.'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-3.5 sm:px-4 py-8 sm:py-12 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-emerald-600/15 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg shadow-emerald-500/30">
            <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-current" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Join Live Quiz</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Enter the 6-digit game PIN provided by your Event Co-Ordinator</p>
        </div>

        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs sm:text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 sm:mb-2">Game PIN (6 Digits)</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={gamePin}
              onChange={e => setGamePin(normalizeGamePin(e.target.value))}
              placeholder="123456"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 text-white text-center text-2xl sm:text-3xl font-black tracking-widest placeholder:text-slate-700 placeholder:text-xl sm:placeholder:text-2xl focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Team Nickname</label>
            <div className="relative">
              <UserIcon className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="Team Alpha"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Choose Avatar</label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 max-h-40 overflow-y-auto pr-1">
              {PRESET_AVATARS.map((avatarUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedAvatar(avatarUrl)}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl p-1 border-2 transition-all mx-auto bg-slate-950/60 overflow-hidden ${
                    selectedAvatar === avatarUrl ? 'border-emerald-500 scale-105 shadow-lg shadow-emerald-500/30 bg-emerald-500/10' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <img src={avatarUrl} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover rounded-xl" />
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 font-extrabold text-white text-lg shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 mt-2"
          >
            <span>Enter Lobby</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
