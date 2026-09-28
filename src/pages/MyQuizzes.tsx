import React, { useState } from 'react';
import { PageId, User, Quiz, QuizFolder } from '../types';
import { StorageDB } from '../services/db';
import { PlusCircle, Play, BookOpen, Trash2, Search, ArrowLeft, BarChart3, Settings2, Save, FolderPlus, Folder } from 'lucide-react';

interface MyQuizzesProps {
  currentUser: User | null;
  setCurrentPage: (page: PageId) => void;
  onSelectQuiz: (quiz: Quiz) => void;
}

export const MyQuizzes: React.FC<MyQuizzesProps> = ({ currentUser, setCurrentPage, onSelectQuiz }) => {
  const [search, setSearch] = useState('');
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => StorageDB.getQuizzes());
  const [folders, setFolders] = useState<QuizFolder[]>(() => StorageDB.getFolders());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderDialog, setFolderDialog] = useState<'create' | 'settings' | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderSettings, setFolderSettings] = useState<QuizFolder | null>(null);
  const [settingsQuiz, setSettingsQuiz] = useState<Quiz | null>(null);
  const [settingsDraft, setSettingsDraft] = useState({
    showQuestionAndAnswersToParticipants: true,
    showMediaToParticipants: true,
  });

  const filteredQuizzes = quizzes.filter(q => {
    const matchesFolder = selectedFolderId === null || q.folderId === selectedFolderId;
    const matchesSearch = q.title.toLowerCase().includes(search.toLowerCase()) ||
      (q.stream || q.subject || '').toLowerCase().includes(search.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const openCreateFolder = () => {
    setFolderName('');
    setFolderDialog('create');
  };

  const handleCreateFolder = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = folderName.trim();
    if (!name || !currentUser) return;

    const folder: QuizFolder = {
      folderId: `folder_${Date.now()}`,
      hostId: currentUser.userId,
      name,
      aggregateScores: true,
      createdAt: new Date().toISOString(),
    };
    try {
      const updatedFolders = [folder, ...folders];
      await StorageDB.saveFolders(updatedFolders);
      setFolders(updatedFolders);
      setSelectedFolderId(folder.folderId);
      setFolderDialog(null);
    } catch {
      window.alert('Unable to create this folder. Please try again.');
    }
  };

  const openFolderSettings = (folder: QuizFolder) => {
    setFolderSettings(folder);
    setFolderName(folder.name);
    setFolderDialog('settings');
  };

  const saveFolderSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!folderSettings || !folderName.trim()) return;
    const updatedFolders = folders.map(folder => folder.folderId === folderSettings.folderId
      ? { ...folderSettings, name: folderName.trim() }
      : folder);
    try {
      await StorageDB.saveFolders(updatedFolders);
      setFolders(updatedFolders);
      setFolderDialog(null);
      setFolderSettings(null);
    } catch {
      window.alert('Unable to save folder settings. Please try again.');
    }
  };

  const toggleFolderScoreMode = async (folder: QuizFolder) => {
    const updatedFolders = folders.map(item => item.folderId === folder.folderId
      ? { ...item, aggregateScores: !item.aggregateScores }
      : item);
    try {
      await StorageDB.saveFolders(updatedFolders);
      setFolders(updatedFolders);
      setFolderSettings(updatedFolders.find(item => item.folderId === folder.folderId) || null);
    } catch {
      window.alert('Unable to save score settings. Please try again.');
    }
  };

  const assignQuizToFolder = async (quiz: Quiz, folderId: string) => {
    const updatedQuizzes = quizzes.map(item => item.quizId === quiz.quizId
      ? { ...item, folderId: folderId || undefined }
      : item);
    try {
      await StorageDB.saveQuizzes(updatedQuizzes);
      setQuizzes(updatedQuizzes);
    } catch {
      window.alert('Unable to update quiz folder. Please try again.');
    }
  };

  const handleDelete = async (quizId: string) => {
    const target = quizzes.find(q => q.quizId === quizId);
    if (!target) return;

    const confirmed = window.confirm(`Delete quiz "${target.title}"? This action cannot be undone.`);
    if (!confirmed) return;

    const allQuizzes = StorageDB.getQuizzes();
    const updated = allQuizzes.filter(q => q.quizId !== quizId);
    try {
      await StorageDB.saveQuizzes(updated);
      setQuizzes(updated);
    } catch {
      window.alert('Unable to delete this quiz. Please try again.');
    }
  };

  const openQuizSettings = (quiz: Quiz) => {
    setSettingsQuiz(quiz);
    setSettingsDraft({
      showQuestionAndAnswersToParticipants: quiz.showQuestionAndAnswersToParticipants ?? true,
      showMediaToParticipants: quiz.showMediaToParticipants ?? true,
    });
  };

  const saveQuizSettings = async () => {
    if (!settingsQuiz) return;
    const allQuizzes = StorageDB.getQuizzes();
    const updated = allQuizzes.map(q =>
      q.quizId === settingsQuiz.quizId
        ? {
            ...q,
            showQuestionAndAnswersToParticipants: settingsDraft.showQuestionAndAnswersToParticipants,
            showMediaToParticipants: settingsDraft.showMediaToParticipants,
          }
        : q
    );
    try {
      await StorageDB.saveQuizzes(updated);
      setQuizzes(updated);
      setSettingsQuiz(null);
    } catch {
      window.alert('Unable to save quiz settings. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-5 sm:pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <button
              onClick={() => setCurrentPage('host_dashboard')}
              className="flex items-center space-x-1.5 text-slate-400 hover:text-white transition-colors text-xs sm:text-sm font-semibold mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">My Quizzes ({quizzes.length})</h1>
            <p className="text-xs sm:text-sm text-slate-400">Organize quizzes into folders and launch live sessions.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <button
              onClick={openCreateFolder}
              className="w-full sm:w-auto px-4 py-3 rounded-xl sm:rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm shadow-lg transition-all flex items-center justify-center space-x-2"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Add Folder</span>
            </button>
            <button
              onClick={() => setCurrentPage('create_quiz')}
              className="w-full sm:w-auto px-5 py-3 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 active:scale-95"
            >
              <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Create New Quiz</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative w-full sm:max-w-md">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search quizzes by title or subject..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl sm:rounded-2xl pl-10 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 text-sm font-medium"
          />
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${selectedFolderId === null ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'}`}
          >
            All Quizzes ({quizzes.length})
          </button>
          {folders.map(folder => (
            <div key={folder.folderId} className="flex shrink-0 items-center rounded-xl border border-slate-800 bg-slate-900">
              <button
                type="button"
                onClick={() => setSelectedFolderId(folder.folderId)}
                className={`flex items-center gap-1.5 rounded-l-xl px-3 py-2 text-xs font-bold transition-colors ${selectedFolderId === folder.folderId ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'}`}
              >
                <Folder className="h-3.5 w-3.5" />
                <span>{folder.name} ({quizzes.filter(quiz => quiz.folderId === folder.folderId).length})</span>
              </button>
              <button
                type="button"
                onClick={() => openFolderSettings(folder)}
                title={`Settings for ${folder.name}`}
                className="rounded-r-xl border-l border-slate-800 px-2 py-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Quiz Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredQuizzes.length === 0 ? (
            <div className="col-span-full py-12 sm:py-16 text-center text-slate-500 bg-slate-900/40 rounded-2xl sm:rounded-3xl border border-slate-800 p-6">
              <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-40 text-indigo-400" />
              <p className="text-base sm:text-lg font-bold">No quizzes found.</p>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">Create your first quiz or generate one with AI!</p>
            </div>
          ) : (
            filteredQuizzes.map(quiz => (
              <div key={quiz.quizId} className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-col justify-between hover:border-indigo-500/50 transition-all shadow-xl group">
                <div>
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold">
                      {quiz.stream || quiz.subject || 'General'}
                    </span>
                    <span className={`font-bold px-2 py-0.5 rounded-full ${
                      quiz.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      quiz.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {quiz.difficulty}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-1.5 text-white group-hover:text-indigo-300 transition-colors line-clamp-1">{quiz.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 mb-4">{quiz.description}</p>
                  <select
                    value={quiz.folderId || ''}
                    onChange={event => void assignQuizToFolder(quiz, event.target.value)}
                    aria-label={`Folder for ${quiz.title}`}
                    className="mb-4 w-full rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-2 text-xs font-semibold text-slate-300 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">No folder</option>
                    {folders.map(folder => <option key={folder.folderId} value={folder.folderId}>{folder.name}</option>)}
                  </select>
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-4 sm:mb-6">
                    <span className="flex items-center space-x-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{quiz.questions.length} Questions</span>
                    </span>
                    <span>{new Date(quiz.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-3.5 border-t border-slate-800/80">
                  <button
                    onClick={() => {
                      onSelectQuiz(quiz);
                      setCurrentPage('start_live_game');
                    }}
                    className="w-full py-2.5 sm:py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center space-x-1.5 active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                    <span>Start Live Game</span>
                  </button>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        onSelectQuiz(quiz);
                        setCurrentPage('quiz_details');
                      }}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center space-x-1"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                    <button
                      onClick={() => openQuizSettings(quiz)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Quiz Settings"
                    >
                      <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(quiz.quizId)}
                      className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition-colors"
                      title="Delete Quiz"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {settingsQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-5">
              <h3 className="text-xl font-extrabold text-white">Quiz Settings</h3>
              <p className="text-xs text-slate-400 mt-1">{settingsQuiz.title}</p>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3 cursor-pointer">
                <div>
                  <div className="text-sm font-semibold text-white">Show question & answers to participants</div>
                  <div className="text-[11px] text-slate-400">Players can see the actual question and option text.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settingsDraft.showQuestionAndAnswersToParticipants}
                  onChange={e => setSettingsDraft({ ...settingsDraft, showQuestionAndAnswersToParticipants: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3 cursor-pointer">
                <div>
                  <div className="text-sm font-semibold text-white">Show media to participants</div>
                  <div className="text-[11px] text-slate-400">Allow uploaded photos or videos to appear during the live quiz.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settingsDraft.showMediaToParticipants}
                  onChange={e => setSettingsDraft({ ...settingsDraft, showMediaToParticipants: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSettingsQuiz(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveQuizSettings}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {folderDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <form onSubmit={folderDialog === 'create' ? handleCreateFolder : saveFolderSettings} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-extrabold text-white">{folderDialog === 'create' ? 'Add Folder' : 'Folder Settings'}</h3>
            <p className="mt-1 text-xs text-slate-400">Group quizzes and choose how their scores are tracked.</p>
            <label className="mt-5 block text-xs font-bold uppercase tracking-wider text-slate-400">Folder name</label>
            <input
              autoFocus
              value={folderName}
              onChange={event => setFolderName(event.target.value)}
              maxLength={80}
              required
              placeholder="Science Term 1"
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
            />
            {folderDialog === 'settings' && folderSettings && (
              <label className="mt-4 flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <span>
                  <span className="block text-sm font-semibold text-white">Combine scores across quizzes</span>
                  <span className="mt-1 block text-[11px] text-slate-400">Use one cumulative score for every quiz in this folder.</span>
                </span>
                <input
                  type="checkbox"
                  checked={folderSettings.aggregateScores}
                  onChange={() => void toggleFolderScoreMode(folderSettings)}
                  className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => { setFolderDialog(null); setFolderSettings(null); }} className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-300">Cancel</button>
              <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
