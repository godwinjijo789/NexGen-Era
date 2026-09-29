import React, { useEffect, useState } from 'react';
import { Question } from '../types';
import { CheckCircle2, Circle, Clock, Diamond, Square, Triangle, Users, X } from 'lucide-react';

interface QuizPreviewProps {
  title: string;
  coverImage?: string;
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

const answerStyles = [
  { background: 'bg-rose-600', shape: Triangle },
  { background: 'bg-blue-600', shape: Diamond },
  { background: 'bg-amber-500', shape: Circle },
  { background: 'bg-emerald-600', shape: Square },
];

export const QuizPreview: React.FC<QuizPreviewProps> = ({ title, coverImage, questions, onClose }) => {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(Math.max(1, questions[0]?.timerSeconds || 20));
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
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
    if (!question || isComplete || !hasStarted) return;
    const countdown = window.setInterval(() => {
      setTimeLeft(current => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(countdown);
  }, [question?.id, isComplete, hasStarted]);

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

  if (!question) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950 p-4 text-white" role="dialog" aria-modal="true" aria-label="Quiz preview">
        <div className="text-center">
          <p className="mb-4 text-slate-300">Add a question to preview this quiz.</p>
          <button type="button" onClick={onClose} className="rounded-lg bg-indigo-600 px-4 py-2 font-bold">Close</button>
        </div>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950 p-4 text-white sm:p-8" role="dialog" aria-modal="true" aria-label="Quiz preview">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:text-white sm:right-8 sm:top-8" aria-label="Close preview">
          <X className="h-5 w-5" />
        </button>
        <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-4xl flex-col items-center justify-center gap-6 py-12 text-center">
          {coverImage ? (
            <img src={coverImage} alt={`${title || 'Quiz'} cover`} className="max-h-[55vh] w-full rounded-lg object-cover shadow-2xl" />
          ) : (
            <div className="flex aspect-video max-h-[45vh] w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-500">
              No cover image
            </div>
          )}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-300">Quiz Preview</p>
            <h2 className="text-2xl font-black sm:text-4xl">{title || 'Untitled Quiz'}</h2>
          </div>
          <button type="button" onClick={() => setHasStarted(true)} className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-extrabold text-white hover:bg-indigo-500">
            Start Preview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-100 text-slate-900" role="dialog" aria-modal="true" aria-label="Quiz preview">
      <header className="relative flex min-h-14 items-center justify-center border-b border-slate-200 bg-white px-14 py-3 text-center shadow-sm">
        <h2 className="max-w-3xl break-words text-sm font-extrabold sm:text-xl">{title || 'Untitled Quiz'}... {question.text || 'Question text'}</h2>
        <button type="button" onClick={onClose} className="absolute right-3 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100" aria-label="Close preview">
            <X className="h-5 w-5" />
        </button>
      </header>

      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-6xl flex-col justify-between gap-4 p-3 sm:gap-6 sm:p-6">
        <div className="grid flex-1 grid-cols-[48px_minmax(0,1fr)_64px] items-center gap-2 sm:grid-cols-[80px_minmax(0,1fr)_100px] sm:gap-5">
          <div className={`flex aspect-square items-center justify-center rounded-full text-lg font-black text-white shadow-lg sm:text-2xl ${timeLeft <= 5 ? 'bg-rose-600' : 'bg-violet-600'}`}>
            <Clock className="mr-1 h-4 w-4 sm:h-5 sm:w-5" />{timeLeft}
          </div>

          <div className="flex min-h-48 items-center justify-center overflow-hidden bg-white sm:min-h-64">
            {(question.mediaUrl || question.imageUrl) ? (
              question.mediaType === 'video' ? (
                <video src={question.mediaUrl || question.imageUrl} controls className="max-h-[42vh] max-w-full object-contain" />
              ) : (
                <img src={question.mediaUrl || question.imageUrl} alt="Question visual" className="max-h-[42vh] max-w-full object-contain" />
              )
            ) : (
              <p className="px-4 text-center text-lg font-bold text-slate-500">{question.text || 'Question image'}</p>
            )}
          </div>

          <div className="text-center">
            <span className="block text-2xl font-black tabular-nums sm:text-3xl">{answeredTeams.filter(team => team.hasAnswered).length}</span>
            <span className="text-xs font-bold sm:text-sm">Answers</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          {options.map((option, index) => {
            const { background, shape: Shape } = answerStyles[index % answerStyles.length];
            return (
              <div key={`${index}-${option}`} className={`flex min-h-14 items-center gap-2 p-3 text-white shadow-sm sm:min-h-16 sm:gap-4 sm:px-5 ${background} ${isComplete && index === question.correctAnswer ? 'ring-4 ring-white ring-inset' : ''}`}>
                <Shape className="h-7 w-7 shrink-0 fill-current sm:h-9 sm:w-9" aria-hidden="true" />
                <span className="break-words text-sm font-extrabold sm:text-base">{option || `Option ${letters[index]}`}</span>
                {isComplete && index === question.correctAnswer && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0" />}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>Question {questionIndex + 1} of {questions.length} · Preview only</span>
          {isComplete ? (
            <button type="button" onClick={() => moveToQuestion(questionIndex + 1 < questions.length ? questionIndex + 1 : 0)} className="rounded-md bg-slate-800 px-4 py-2 font-bold text-white hover:bg-slate-700">
              {questionIndex + 1 < questions.length ? 'Next Question' : 'Restart Preview'}
            </button>
          ) : (
            <button type="button" onClick={() => moveToQuestion(questionIndex + 1 < questions.length ? questionIndex + 1 : 0)} className="rounded-md bg-sky-500 px-4 py-2 font-bold text-white hover:bg-sky-600">
              Skip
            </button>
          )}
        </div>
      </main>
    </div>
  );
};