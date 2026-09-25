import React, { useState } from 'react';
import { PageId, User } from '../types';
import { StorageDB } from '../services/db';
import { Sound } from '../services/sound';
import { User as UserIcon, Mail, Save, ArrowLeft, Volume2, Image as ImageIcon, CheckCircle2, Check, Sun, Moon } from 'lucide-react';

interface ProfileSettingsProps {
  currentUser: User | null;
  setCurrentPage: (page: PageId) => void;
  onUserUpdated: (user: User) => void;
}

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zack',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Mimi',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna'
];

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ currentUser, setCurrentPage, onUserUpdated }) => {
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('nexgen_sound') !== 'false';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('nexgen_theme') as 'dark' | 'light') || 'dark';
  });

  const handleSoundToggle = (checked: boolean) => {
    setSoundEnabled(checked);
    localStorage.setItem('nexgen_sound', String(checked));
    if (checked) {
      Sound.playSuccess();
    }
  };

  const handleThemeToggle = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('nexgen_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    document.documentElement.classList.toggle('light-theme', newTheme === 'light');
    if (soundEnabled) {
      Sound.playSuccess();
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Please Sign In</h2>
          <button onClick={() => setCurrentPage('login')} className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const handleSave = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!name.trim()) return;

    const updated: User = {
      ...currentUser,
      name: name.trim(),
      email: email.trim(),
      avatar: avatar.trim()
    };

    StorageDB.setCurrentUser(updated);
    const existingUsers = StorageDB.getUsers();
    const userIndex = existingUsers.findIndex(u => u.userId === updated.userId);
    let updatedUsers: User[];
    if (userIndex >= 0) {
      updatedUsers = existingUsers.map(u => u.userId === updated.userId ? updated : u);
    } else {
      updatedUsers = [...existingUsers, updated];
    }
    StorageDB.saveUsers(updatedUsers);

    onUserUpdated(updated);

    Sound.playSuccess();
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      <div className="max-w-3xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-5 sm:pt-8">
        <button
          onClick={() => {
            if (currentUser.role === 'host') setCurrentPage('host_dashboard');
            else if (currentUser.role === 'admin') setCurrentPage('admin_dashboard');
            else setCurrentPage('join_game');
          }}
          className="flex items-center space-x-1.5 text-slate-400 hover:text-white transition-colors text-xs sm:text-sm font-semibold mb-4 sm:mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-5 pb-5 sm:pb-6 border-b border-slate-800">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 border border-indigo-500/40 flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-white overflow-hidden shadow-lg shrink-0">
              {avatar ? (
                <img src={avatar} alt={name} className="w-full h-full object-cover" />
              ) : (
                name.charAt(0) || 'U'
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">{name}</h1>
              <span className="inline-block mt-1 px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                {currentUser.role}
              </span>
            </div>
          </div>

          {saveSuccess && (
            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-bold flex items-center space-x-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Profile changes saved successfully!</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5 sm:space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Profile Avatar</label>
              
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3 mb-4">
                {PRESET_AVATARS.map((presetUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAvatar(presetUrl);
                      setSaveSuccess(false);
                    }}
                    className={`aspect-square rounded-xl sm:rounded-2xl border-2 p-1 overflow-hidden transition-all hover:scale-105 active:scale-95 ${
                      avatar === presetUrl ? 'border-indigo-500 bg-indigo-500/20 shadow-lg shadow-indigo-500/30' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <img src={presetUrl} alt={`Avatar preset ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                  </button>
                ))}
              </div>

              <div className="relative">
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={avatar}
                  onChange={e => {
                    setAvatar(e.target.value);
                    setSaveSuccess(false);
                  }}
                  placeholder="Or paste custom image URL..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl sm:rounded-2xl pl-10 pr-4 py-2.5 sm:py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    setSaveSuccess(false);
                  }}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl sm:rounded-2xl pl-10 pr-4 py-2.5 sm:py-3 text-white focus:outline-none focus:border-indigo-500 text-xs sm:text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setSaveSuccess(false);
                  }}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl sm:rounded-2xl pl-10 pr-4 py-2.5 sm:py-3 text-white focus:outline-none focus:border-indigo-500 text-xs sm:text-sm font-medium"
                />
              </div>
            </div>

            {/* Appearance Theme Control */}
            <div className="p-4 rounded-xl sm:rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Appearance Theme</h4>
                  <p className="text-xs text-slate-400">Switch between dark mode and light mode interface.</p>
                </div>
              </div>
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleThemeToggle('dark')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                    theme === 'dark' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeToggle('light')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                    theme === 'light' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </button>
              </div>
            </div>

            {/* Sound Effects Control */}
            <div className="p-4 rounded-xl sm:rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Game Sound Effects</h4>
                  <p className="text-xs text-slate-400">Play audio for countdowns, answers, and podium fanfare.</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={e => handleSoundToggle(e.target.checked)}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleSave()}
                className={`w-full sm:w-auto px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-extrabold text-sm sm:text-base shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-95 cursor-pointer ${
                  saveSuccess
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    <span>Changes Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
