import React, { useEffect, useState } from 'react';
import { Question } from '../types';
import { CheckCircle2, Clock, Users, X } from 'lucide-react';

interface QuizPreviewProps {
  title: string;
  questions: Question[];
  onClose: () => void;
}

const simulatedTeams = [
  { name: 'Blue Comets', progress: 0.2, offset: 0 },
  { name: 'Quiz Masters', progress: 0.4, offset: 1 },
  { name: 'Bright Minds', progress: 0.65, offset: 2 },
  { name: 'Fast Thinkers', progress: 0.85, offset: 3 },
  { name: 'The Challengers', progress: 1, offset: 0 },
];

export const QuizPreview: React.FC<QuizPreviewProps> = ({ title, questions, onClose }) => {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(Math.max(1, questions[0]?.timerSeconds || 20));
  const [isComplete, setIsComplete] = useState(false);
  const question = questions[questionIndex] || questions[0];
  const duration = Math.max(1, question?.timerSeconds || 20);
  const elapsed = duration - timeLeft;
  const options = question?.options.length ? question.options : ['Option A', 'Option B', 'Option C', 'Option D'];
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const answeredTeams = simulatedTeams.map((team, index) => ({
    ...team,
    hasAnswered: index < 4 && elapsed >= Math.max(1, Math.ceil(duration * team.progress)),
    answerIndex: index === 0 ? question?.correctAnswer ?? 0 : ((question?.correctAnswer ?? 0) + team.offset) % options.length,
  }));

  useEffect(() => {
    if (!question || isComplete) return;
    const countdown = window.setInterval(() => {
      setTimeLeft(current => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(countdown);
  }, [question?.id, isComplete]);

  useEffect(() => {
    if (timeLeft === 0 && question) setIsComplete(true);
  }, [timeLeft, question]);

  const moveToQuestion = (nextIndex: number) => {
    const nextQuestion = questions[nextIndex];
    if (!nextQuestion) return;
    setQuestionIndex(nextIndex);
    setTimeLeft(Math.max(1, nextQuestion.timerSeconds || 20));
    setIsComplete(false);
  };

  if (!question) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/95 p-3 text-white backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-label="Quiz preview">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-center py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Quiz Preview</p>
            <h2 className="truncate text-base font-extrabold sm:text-xl">{title || 'Untitled Quiz'}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:text-white" aria-label="Close preview">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <main className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-indigo-300">Question {questionIndex + 1} of {questions.length}</span>
              <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-black ${timeLeft <= 5 ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'}`}>
                <Clock className="h-4 w-4" /> {timeLeft}s
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className={`h-full transition-[width] duration-1000 ${timeLeft <= 5 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${(timeLeft / duration) * 100}%` }} />
            </div>

            <h3 className="text-lg font-extrabold leading-snug sm:text-2xl">{question.text || 'Question text will appear here'}</h3>

            {(question.mediaUrl || question.imageUrl) && (
              question.mediaType === 'video' ? (
                <video src={question.mediaUrl || question.imageUrl} controls className="mx-auto max-h-48 max-w-full rounded-lg" />
              ) : (
                <img src={question.mediaUrl || question.imageUrl} alt="Question preview" className="mx-auto max-h-48 max-w-full rounded-lg object-contain" />
              )
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              {options.map((option, index) => (
                <div key={`${index}-${option}`} className={`flex min-h-12 items-center gap-3 rounded-lg border p-3 text-sm font-semibold ${isComplete && index === question.correctAnswer ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-950/70 text-slate-200'}`}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-800 text-xs font-black">{letters[index]}</span>
                  <span className="break-words">{option || `Option ${letters[index]}`}</span>
                  {isComplete && index === question.correctAnswer && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-400" />}
                </div>
              ))}
            </div>

            {isComplete && <p className="text-sm font-bold text-emerald-300">Time is up. Correct answer: {options[question.correctAnswer] || 'Not selected'}</p>}
          </main>

          <aside className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold">Teams answering</h3>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400"><Users className="h-3.5 w-3.5" /> {answeredTeams.filter(team => team.hasAnswered).length}/{simulatedTeams.length}</span>
            </div>
            <div className="space-y-2">
              {answeredTeams.map((team, index) => (
                <div key={team.name} className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
                  <span className="truncate text-xs font-bold text-white">{team.name}</span>
                  <span className={`shrink-0 text-[10px] font-semibold ${team.hasAnswered ? 'text-emerald-300' : 'text-slate-500'}`}>
                    {team.hasAnswered ? `Answered · ${letters[team.answerIndex]}` : 'Thinking...'}
                    {isComplete && team.hasAnswered && team.answerIndex === question.correctAnswer ? ' · Correct' : ''}
                  </span>
                </div>
              ))}
            </div>
            <p className="border-t border-slate-800 pt-3 text-[11px] text-slate-400">Preview only. Simulated answers and timer are not saved to game history.</p>
            {isComplete && (
              <button
                type="button"
                onClick={() => moveToQuestion(questionIndex + 1 < questions.length ? questionIndex + 1 : 0)}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500"
              >
                {questionIndex + 1 < questions.length ? 'Next Question' : 'Restart Preview'}
              </button>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};