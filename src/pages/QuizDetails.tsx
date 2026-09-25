import React from 'react';
import { PageId, Quiz } from '../types';
import { ArrowLeft, Play, BookOpen, Clock, CheckCircle2 } from 'lucide-react';

interface QuizDetailsProps {
  quiz: Quiz | null;
  setCurrentPage: (page: PageId) => void;
  onSelectQuizForGame: (quiz: Quiz) => void;
}

export const QuizDetails: React.FC<QuizDetailsProps> = ({ quiz, setCurrentPage, onSelectQuizForGame }) => {
  if (!quiz) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">No Quiz Selected</h2>
          <button onClick={() => setCurrentPage('my_quizzes')} className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold">
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      <div className="max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-5 sm:pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 mb-6 sm:mb-8">
          <button
            onClick={() => setCurrentPage('my_quizzes')}
            className="flex items-center space-x-1.5 text-slate-400 hover:text-white transition-colors text-xs sm:text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Quizzes</span>
          </button>

          <button
            onClick={() => {
              onSelectQuizForGame(quiz);
              setCurrentPage('start_live_game');
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Live Game</span>
          </button>
        </div>

        {/* Header Card */}
        <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-xl mb-6 sm:mb-8 space-y-3 sm:space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              {quiz.stream || quiz.subject || 'General'}
            </span>
            <span className={`text-xs font-bold px-3 py-0.5 rounded-full ${
              quiz.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              quiz.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {quiz.difficulty}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{quiz.title}</h1>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-400 pt-1">
            <span className="flex items-center space-x-1.5">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>{quiz.questions.length} Questions</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Created {new Date(quiz.createdAt).toLocaleDateString()}</span>
            </span>
          </div>
        </div>

        {/* Questions Preview List */}
        <h2 className="text-xl sm:text-2xl font-extrabold mb-4 sm:mb-6">Questions Breakdown</h2>
        <div className="space-y-3 sm:space-y-4">
          {quiz.questions.map((q, idx) => (
            <div key={q.id} className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-xl space-y-3 sm:space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-2.5 sm:space-x-3">
                  <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-xs sm:text-sm shrink-0">
                    {idx + 1}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white leading-snug">{q.text}</h3>
                </div>
                <span className="text-[11px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 shrink-0">
                  {q.timerSeconds}s
                </span>
              </div>

              {q.imageUrl && (
                <div className="max-w-md h-36 sm:h-48 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-800">
                  <img src={q.imageUrl} alt="Question visual" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-2">
                {q.options.map((opt, optIdx) => {
                  const isCorrect = optIdx === q.correctAnswer;
                  return (
                    <div
                      key={optIdx}
                      className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between ${
                        isCorrect ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold' : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                      }`}
                    >
                      <span className="truncate pr-2">{opt}</span>
                      {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
