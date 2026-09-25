import React, { useState } from 'react';
import { PageId, User, Quiz, Question, Difficulty } from '../types';
import { StorageDB } from '../services/db';
import { generateQuizWithAI } from '../services/ai';
import { PlusCircle, Sparkles, Trash2, Copy, ArrowUp, ArrowDown, Save, ArrowLeft, Image as ImageIcon, CheckCircle2, Clock } from 'lucide-react';

interface CreateQuizProps {
  currentUser: User | null;
  setCurrentPage: (page: PageId) => void;
  onQuizSaved: (quiz: Quiz) => void;
}

export const CreateQuiz: React.FC<CreateQuizProps> = ({ currentUser, setCurrentPage, onQuizSaved }) => {
  const [title, setTitle] = useState('');
  const [stream, setStream] = useState('General');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [defaultTimer, setDefaultTimer] = useState<number>(20);

  const handleApplyTimerToAll = (seconds: number) => {
    setDefaultTimer(seconds);
    const updated = questions.map(q => ({
      ...q,
      timerSeconds: seconds
    }));
    setQuestions(updated);
  };
  
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: `q_${Date.now()}_1`,
      text: 'What is the capital city of France?',
      options: ['London', 'Berlin', 'Paris', 'Madrid'],
      correctAnswer: 2, // Paris
      timerSeconds: 20,
      difficulty: 'Easy',
      imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600'
    }
  ]);

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiTopicInput, setAiTopicInput] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAddQuestion = () => {
    if (questions.length >= 50) {
      setErrorMessage('Maximum limit of 50 questions reached for a quiz set.');
      return;
    }
    setErrorMessage('');
    const newQ: Question = {
      id: `q_${Date.now()}_${questions.length + 1}`,
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      timerSeconds: 20,
      difficulty: 'Medium'
    };
    setQuestions([...questions, newQ]);
    setActiveQuestionIndex(questions.length);
  };

  const handleUpdateQuestionField = (field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[activeQuestionIndex] = {
      ...updated[activeQuestionIndex],
      [field]: value
    };
    setQuestions(updated);
  };

  const handleUpdateOption = (optIndex: number, value: string) => {
    const updated = [...questions];
    const currentOptions = [...updated[activeQuestionIndex].options] as [string, string, string, string];
    currentOptions[optIndex] = value;
    updated[activeQuestionIndex].options = currentOptions;
    setQuestions(updated);
  };

  const handleDeleteQuestion = (index: number) => {
    if (questions.length === 1) {
      alert('A quiz must have at least one question.');
      return;
    }
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    setActiveQuestionIndex(Math.max(0, index - 1));
  };

  const handleDuplicateQuestion = (index: number) => {
    if (questions.length >= 50) {
      alert('Maximum limit of 50 questions reached.');
      return;
    }
    const target = questions[index];
    const duplicated: Question = {
      ...target,
      id: `q_${Date.now()}_dup`,
      text: `${target.text} (Copy)`
    };
    const updated = [...questions];
    updated.splice(index + 1, 0, duplicated);
    setQuestions(updated);
    setActiveQuestionIndex(index + 1);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setQuestions(updated);
    setActiveQuestionIndex(targetIdx);
  };

  const handleGenerateAI = async () => {
    if (!aiTopicInput.trim()) {
      setErrorMessage('Please enter a topic for AI generation.');
      return;
    }
    setIsGeneratingAI(true);
    setErrorMessage('');
    try {
      const generated = await generateQuizWithAI(aiTopicInput, 5, difficulty);
      setQuestions([...questions, ...generated]);
      setShowAiModal(false);
      setAiTopicInput('');
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to generate questions with AI.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSaveQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!title.trim()) {
      setErrorMessage('Please enter a quiz title before saving.');
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].text.trim()) {
        setErrorMessage(`Question #${i + 1} text is empty. Please enter question text.`);
        setActiveQuestionIndex(i);
        return;
      }
    }

    const newQuiz: Quiz = {
      quizId: `quiz_${Date.now()}`,
      hostId: currentUser?.userId || 'user_host_1',
      title,
      stream,
      difficulty,
      questions,
      createdAt: new Date().toISOString()
    };

    const existing = StorageDB.getQuizzes();
    StorageDB.saveQuizzes([newQuiz, ...existing]);
    onQuizSaved(newQuiz);
    setCurrentPage('my_quizzes');
  };

  const currentQ = questions[activeQuestionIndex] || questions[0];

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-5 sm:pt-8">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 mb-6 sm:mb-8">
          <button
            onClick={() => setCurrentPage('host_dashboard')}
            className="flex items-center space-x-1.5 text-slate-400 hover:text-white transition-colors text-xs sm:text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-2.5 sm:space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="flex-1 sm:flex-none px-3.5 sm:px-4 py-2.5 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600/30 font-bold text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition-all"
            >
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Generate with AI</span>
            </button>
            <button
              type="button"
              onClick={handleSaveQuiz}
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-1.5 active:scale-95"
            >
              <Save className="w-4 h-4 shrink-0" />
              <span>Save Quiz</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="text-red-400 hover:text-red-300 text-xs font-bold ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleSaveQuiz} className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column: Quiz Info & Question List */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-xl space-y-4">
              <h3 className="text-base sm:text-lg font-extrabold text-white">Quiz Details</h3>
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Quiz Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Advanced World Geography"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 sm:py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-medium text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Timer Countdown (All Questions)</span>
                  <span className="text-[10px] text-indigo-400 font-bold">Applies to all</span>
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={defaultTimer}
                    onChange={e => handleApplyTimerToAll(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 sm:py-3 text-white focus:outline-none focus:border-indigo-500 font-medium text-xs sm:text-sm cursor-pointer"
                  >
                    <option value={10}>10 Seconds per question</option>
                    <option value={15}>15 Seconds per question</option>
                    <option value={20}>20 Seconds per question</option>
                    <option value={30}>30 Seconds per question</option>
                    <option value={45}>45 Seconds per question</option>
                    <option value={60}>60 Seconds per question</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Stream</label>
                  <input
                    type="text"
                    value={stream}
                    onChange={e => setStream(e.target.value)}
                    placeholder="e.g. Science, Arts"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-medium text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as Difficulty)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-medium text-xs sm:text-sm"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Questions Navigator */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-extrabold text-white">Questions ({questions.length}/50)</h3>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30 text-xs font-bold flex items-center space-x-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Question</span>
                </button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    onClick={() => setActiveQuestionIndex(idx)}
                    className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      activeQuestionIndex === idx ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md' : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-medium truncate">{q.text || `Question ${idx + 1}`}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-semibold shrink-0 ml-1">{q.timerSeconds}s</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Question Editor */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-xl space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                    {activeQuestionIndex + 1}
                  </span>
                  <h3 className="text-xl font-extrabold text-white">Question Editor</h3>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(activeQuestionIndex, 'up')}
                    disabled={activeQuestionIndex === 0}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(activeQuestionIndex, 'down')}
                    disabled={activeQuestionIndex === questions.length - 1}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateQuestion(activeQuestionIndex)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(activeQuestionIndex)}
                    className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Question Text</label>
                <textarea
                  rows={3}
                  required
                  value={currentQ.text}
                  onChange={e => handleUpdateQuestionField('text', e.target.value)}
                  placeholder="Enter question text here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-medium resize-none text-base"
                />
              </div>



              {/* 4 Answer Choices */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Answer Choices (Select the correct answer)
                </label>
                <div className="space-y-3">
                  {currentQ.options.map((opt, optIdx) => {
                    const letters = ['A', 'B', 'C', 'D'];
                    const bgColors = ['bg-red-500/10 border-red-500/30', 'bg-blue-500/10 border-blue-500/30', 'bg-amber-500/10 border-amber-500/30', 'bg-emerald-500/10 border-emerald-500/30'];
                    const textColors = ['text-red-400', 'text-blue-400', 'text-amber-400', 'text-emerald-400'];
                    const isCorrect = currentQ.correctAnswer === optIdx;

                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center space-x-3 p-3 rounded-2xl border transition-all ${
                          isCorrect ? 'bg-indigo-600/20 border-indigo-500 shadow-md' : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleUpdateQuestionField('correctAnswer', optIdx)}
                          className={`w-9 h-9 rounded-xl font-extrabold text-sm flex items-center justify-center transition-all ${
                            isCorrect ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                          title={isCorrect ? 'Correct Answer' : 'Mark as Correct'}
                        >
                          {letters[optIdx]}
                        </button>

                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={e => handleUpdateOption(optIdx, e.target.value)}
                          placeholder={`Enter Answer ${letters[optIdx]}...`}
                          className="flex-1 bg-transparent border-none text-white placeholder:text-slate-600 focus:outline-none font-medium"
                        />

                        {isCorrect && (
                          <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Correct</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* AI Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white">Generate Quiz with AI</h3>
                <p className="text-xs text-slate-400">Powered by Google Gemini</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Quiz Topic or Subject</label>
              <input
                type="text"
                value={aiTopicInput}
                onChange={e => setAiTopicInput(e.target.value)}
                placeholder="e.g. Artificial Intelligence, Solar System, World History..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-medium text-sm"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isGeneratingAI}
                onClick={handleGenerateAI}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center space-x-2"
              >
                {isGeneratingAI ? (
                  <span>Generating...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Questions</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
