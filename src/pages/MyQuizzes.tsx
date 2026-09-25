import React, { useState } from 'react';
import { PageId, User, Quiz } from '../types';
import { StorageDB } from '../services/db';
import { PlusCircle, Play, BookOpen, Trash2, Search, ArrowLeft, BarChart3, Copy } from 'lucide-react';

interface MyQuizzesProps {
  currentUser: User | null;
  setCurrentPage: (page: PageId) => void;
  onSelectQuiz: (quiz: Quiz) => void;
}

export const MyQuizzes: React.FC<MyQuizzesProps> = ({ currentUser, setCurrentPage, onSelectQuiz }) => {
  const [search, setSearch] = useState('');
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => StorageDB.getQuizzes());

  const filteredQuizzes = quizzes.filter(q => 
    q.title.toLowerCase().includes(search.toLowerCase()) || 
    (q.stream || q.subject || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (quizId: string) => {
    const allQuizzes = StorageDB.getQuizzes();
    const updated = allQuizzes.filter(q => q.quizId !== quizId);
    StorageDB.saveQuizzes(updated);
    setQuizzes(updated);
  };

  const handleDuplicate = (quiz: Quiz) => {
    const duplicated: Quiz = {
      ...quiz,
      quizId: `quiz_${Date.now()}`,
      title: `${quiz.title} (Copy)`,
      createdAt: new Date().toISOString()
    };
    const allQuizzes = StorageDB.getQuizzes();
    const updated = [duplicated, ...allQuizzes];
    StorageDB.saveQuizzes(updated);
    setQuizzes(updated);
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
            <p className="text-xs sm:text-sm text-slate-400">Manage, edit, duplicate, and launch your quiz sets.</p>
          </div>

          <div className="flex items-center">
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
                      onClick={() => handleDuplicate(quiz)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Duplicate Quiz"
                    >
                      <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
    </div>
  );
};
