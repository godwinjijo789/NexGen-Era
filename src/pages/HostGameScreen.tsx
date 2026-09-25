import React, { useState, useEffect, useRef } from 'react';
import { PageId, GameSession, Quiz, Participant, Response } from '../types';
import { StorageDB } from '../services/db';
import { buildJoinLink, buildQrCodeUrl } from '../utils/joinLink';
import { Play, Users, Trophy, ArrowRight, CheckCircle2, Clock, Zap, Square, AlertCircle, Copy, QrCode } from 'lucide-react';

interface HostGameScreenProps {
  game: GameSession | null;
  quiz: Quiz | null;
  setCurrentPage: (page: PageId) => void;
  onEndGame: () => void;
}

export const HostGameScreen: React.FC<HostGameScreenProps> = ({ game, quiz, setCurrentPage, onEndGame }) => {
  const [activeGame, setActiveGame] = useState<GameSession | null>(game || StorageDB.getActiveGame());
  const [participants, setParticipants] = useState<Participant[]>(StorageDB.getParticipants());
  const [responses, setResponses] = useState<Response[]>(StorageDB.getResponses());
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [joinLink, setJoinLink] = useState<string>('');
  const resultsInProgress = useRef(false);

  useEffect(() => {
    if (game?.gamePin || activeGame?.gamePin) {
      const pin = (game?.gamePin || activeGame?.gamePin || '').replace(/\D/g, '').slice(0, 6);
      setJoinLink(buildJoinLink(pin, window.location.origin));
    }
  }, [game, activeGame]);

  // Subscribe to real-time storage / broadcast sync
  useEffect(() => {
    const refreshLiveState = async () => {
      await StorageDB.refreshSharedState();
      setActiveGame(StorageDB.getActiveGame());
      setParticipants(StorageDB.getParticipants());
      setResponses(StorageDB.getResponses());
    };

    refreshLiveState();

    const unsubscribe = StorageDB.subscribe(() => {
      refreshLiveState();
    });

    const intervalId = window.setInterval(refreshLiveState, 500);
    return () => {
      unsubscribe();
      window.clearInterval(intervalId);
    };
  }, []);

  const currentQuiz = activeGame?.quiz || quiz || StorageDB.getQuizzes().find(q => q.quizId === activeGame?.quizId);
  const currentQuestion = currentQuiz?.questions[activeGame?.currentQuestionIndex || 0];
  const topParticipants = [...participants].sort((a, b) => b.score - a.score).slice(0, 10);

  // Use the shared start timestamp so the host timer cannot drift by interval length.
  useEffect(() => {
    if (activeGame?.status === 'question_active' && currentQuestion) {
      const deadline = (activeGame.questionStartTime || Date.now()) + currentQuestion.timerSeconds * 1000;
      const updateTimeLeft = () => {
        const remaining = Math.max(0, deadline - Date.now());
        setTimeLeft(Math.ceil(remaining / 1000));
      };

      updateTimeLeft();
      const displayTimer = window.setInterval(updateTimeLeft, 100);
      const finishTimer = window.setTimeout(() => {
        setTimeLeft(0);
        void handleShowResults();
      }, Math.max(0, deadline - Date.now()));

      return () => {
        window.clearInterval(displayTimer);
        window.clearTimeout(finishTimer);
      };
    }
  }, [activeGame?.status, activeGame?.currentQuestionIndex, activeGame?.questionStartTime, currentQuestion?.id, currentQuestion?.timerSeconds]);

  if (!activeGame || !currentQuiz) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <h2 className="text-2xl font-bold">No Active Game Session Found</h2>
          <button onClick={() => setCurrentPage('host_dashboard')} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleStartQuiz = () => {
    resultsInProgress.current = false;
    const updated: GameSession = {
      ...activeGame,
      status: 'question_active',
      currentQuestionIndex: 0,
      questionStartTime: Date.now(),
      quiz: currentQuiz || activeGame.quiz || quiz || null
    };
    StorageDB.setActiveGame(updated);
    setActiveGame(updated);
  };

  const handleShowResults = async () => {
    if (activeGame.status !== 'question_active' || resultsInProgress.current) return;
    resultsInProgress.current = true;

    await StorageDB.refreshSharedState();
    const syncedGame = StorageDB.getActiveGame() || activeGame;
    const syncedParticipants = StorageDB.getParticipants();
    const syncedResponses = StorageDB.getResponses();

    // Calculate scores for this question
    const q = currentQuiz.questions[syncedGame.currentQuestionIndex];
    const currentResponses = syncedResponses.filter(r => r.gameId === syncedGame.gameId && r.questionId === q.id);
    
    // Update participant scores
    const updatedParticipants = syncedParticipants.map(p => {
      const resp = currentResponses.find(r => r.participantId === p.participantId);
      if (resp && resp.isCorrect) {
        // Points calculation: base 1000 + speed bonus + difficulty multiplier
        const diffMultiplier = q.difficulty === 'Hard' ? 2 : q.difficulty === 'Medium' ? 1.5 : 1;
        const speedRatio = Math.max(0, (q.timerSeconds - resp.responseTime) / q.timerSeconds);
        const earned = Math.round((1000 + speedRatio * 500) * diffMultiplier);
        return {
          ...p,
          score: p.score + earned,
          correctAnswers: p.correctAnswers + 1
        };
      }
      return p;
    });

    // Sort by score and update ranks
    updatedParticipants.sort((a, b) => b.score - a.score);
    updatedParticipants.forEach((p, idx) => { p.rank = idx + 1; });

    StorageDB.saveParticipants(updatedParticipants);
    setParticipants(updatedParticipants);

    const updatedGame: GameSession = {
      ...syncedGame,
      status: 'question_result',
      quiz: currentQuiz || activeGame.quiz || quiz || null
    };
    StorageDB.setActiveGame(updatedGame);
    setActiveGame(updatedGame);
  };

  const handleNextOrLeaderboard = () => {
    const nextIdx = activeGame.currentQuestionIndex + 1;
    if (nextIdx >= currentQuiz.questions.length) {
      // Game Finished
      const updatedGame: GameSession = { ...activeGame, status: 'finished', endedAt: new Date().toISOString() };
      StorageDB.setActiveGame(updatedGame);
      setActiveGame(updatedGame);

      // Save to history
      const history = StorageDB.getHistory();
      const winner = participants.length > 0 ? participants[0] : null;
      history.unshift({
        historyId: `hist_${Date.now()}`,
        gameId: activeGame.gameId,
        quizTitle: currentQuiz.title,
        hostName: 'Host',
        totalParticipants: participants.length,
        startedAt: activeGame.startedAt,
        endedAt: new Date().toISOString(),
        winnerName: winner?.nickname,
        winnerScore: winner?.score,
        participants
      });
      StorageDB.saveHistory(history);
      setCurrentPage('final_results');
    } else {
      resultsInProgress.current = false;
      const updatedGame: GameSession = {
        ...activeGame,
        status: 'question_active',
        currentQuestionIndex: nextIdx,
        questionStartTime: Date.now(),
        quiz: currentQuiz || activeGame.quiz || quiz || null
      };
      StorageDB.setActiveGame(updatedGame);
      setActiveGame(updatedGame);
    }
  };

  const currentQuestionResponses = responses.filter(r => r.gameId === activeGame.gameId && r.questionId === currentQuestion?.id);

  const copyJoinLink = async () => {
    if (!joinLink) return;
    try {
      await navigator.clipboard.writeText(joinLink);
      alert('Join link copied to clipboard.');
    } catch {
      alert(`Join link: ${joinLink}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm sm:text-lg font-extrabold truncate max-w-[180px] sm:max-w-md">{currentQuiz.title}</h2>
            <p className="text-[11px] sm:text-xs text-slate-400">Live Game Session</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center space-x-2 sm:space-x-3">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-300">PIN:</span>
            <span className="text-lg sm:text-2xl font-black tracking-widest text-indigo-400">{activeGame.gamePin}</span>
          </div>

          <button
            onClick={() => {
              if (confirm('End this live game session?')) {
                setCurrentPage('host_dashboard');
                StorageDB.setActiveGame(null);
                onEndGame();
              }
            }}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-colors"
          >
            End Game
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 flex flex-col justify-center">
        {activeGame.status === 'waiting' && (
          <div className="text-center space-y-6 sm:space-y-8 max-w-3xl mx-auto w-full">
            <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-4 sm:space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm font-semibold animate-pulse">
                <Users className="w-4 h-4" />
                <span>Waiting for Participants to Join...</span>
              </div>

              <div>
                <span className="text-[11px] sm:text-xs uppercase tracking-widest font-extrabold text-slate-500">Join at NexGen Era with PIN</span>
                <div className="text-5xl sm:text-7xl md:text-8xl font-black tracking-wider sm:tracking-widest bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent my-3 sm:my-4 select-all">
                  {activeGame.gamePin}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                <div className="p-3 rounded-2xl bg-white/5 border border-slate-700 shadow-lg">
                  <img src={buildQrCodeUrl(joinLink || buildJoinLink(activeGame.gamePin, window.location.origin))} alt="Join game QR code" className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl bg-white p-2" />
                </div>

                <div className="flex flex-col items-start gap-2 text-left min-w-[220px]">
                  <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    <QrCode className="w-3.5 h-3.5" />
                    Mobile Join Link
                  </div>
                  <div className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs sm:text-sm text-slate-300 break-all">
                    {joinLink || buildJoinLink(activeGame.gamePin, window.location.origin)}
                  </div>
                  <button
                    type="button"
                    onClick={copyJoinLink}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20 px-3 py-2 text-xs sm:text-sm font-bold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy Join Link
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-2 text-slate-400 text-sm sm:text-base">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                <span className="font-bold text-white text-base sm:text-lg">{participants.length}</span>
                <span>Participants Joined</span>
              </div>

              {/* Joined Nicknames Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 max-h-48 overflow-y-auto p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/60 border border-slate-800">
                {participants.length === 0 ? (
                  <div className="col-span-full py-6 text-slate-500 text-xs sm:text-sm italic">
                    Waiting for players to enter PIN on their mobile or desktop devices...
                  </div>
                ) : (
                  participants.map(p => (
                    <div key={p.participantId} className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm font-bold text-indigo-300 truncate shadow-sm flex items-center justify-between">
                      <div className="flex items-center space-x-2 truncate">
                        {p.avatar ? (
                          <img src={p.avatar} alt={p.nickname} className="w-6 h-6 rounded-full object-cover bg-slate-800 shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">{p.nickname.charAt(0)}</div>
                        )}
                        <span className="truncate">{p.nickname}</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-1"></span>
                    </div>
                  ))
                )}
              </div>

              <button
                disabled={participants.length === 0}
                onClick={handleStartQuiz}
                className="w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 disabled:opacity-50 text-white font-extrabold text-base sm:text-lg shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 sm:space-x-3 active:scale-98"
              >
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                <span>Start Quiz Now</span>
              </button>
            </div>
          </div>
        )}

        {activeGame.status === 'question_active' && currentQuestion && (
          <div className="max-w-6xl mx-auto w-full grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_340px] gap-5 sm:gap-8">
            <div className="space-y-5 sm:space-y-8 text-center">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl">
                <span className="text-xs sm:text-sm font-bold text-indigo-400">
                  Q{activeGame.currentQuestionIndex + 1} of {currentQuiz.questions.length}
                </span>
                <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-extrabold text-xs sm:text-sm">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timeLeft}s</span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-emerald-400">
                  {currentQuestionResponses.length}/{participants.length} In
                </span>
              </div>

              <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-4 sm:space-y-6">
                <h2 className="text-xl sm:text-3xl font-extrabold text-white leading-snug">{currentQuestion.text}</h2>

                {(currentQuestion.mediaUrl || currentQuestion.imageUrl) && (
                  <div className="max-w-md mx-auto rounded-xl sm:rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                    {currentQuestion.mediaType === 'video' ? (
                      <video src={currentQuestion.mediaUrl || currentQuestion.imageUrl} controls className="w-full max-h-64 object-cover" />
                    ) : (
                      <img src={currentQuestion.mediaUrl || currentQuestion.imageUrl} alt="Question visual" className="w-full h-44 sm:h-64 object-cover" />
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2 sm:pt-4">
                  {currentQuestion.options.map((opt, optIdx) => {
                    const colors = ['bg-red-600/20 border-red-500/40 text-red-300', 'bg-blue-600/20 border-blue-500/40 text-blue-300', 'bg-amber-600/20 border-amber-500/40 text-amber-300', 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'];
                    const letters = ['A', 'B', 'C', 'D'];
                    return (
                      <div key={optIdx} className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl border ${colors[optIdx]} font-bold text-base sm:text-lg flex items-center space-x-3 sm:space-x-4 shadow-md`}>
                        <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-slate-950/80 flex items-center justify-center text-xs sm:text-sm font-extrabold shrink-0">
                          {letters[optIdx]}
                        </span>
                        <span className="flex-1 text-left break-words">{opt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleShowResults}
                className="w-full sm:w-auto px-6 sm:px-8 py-3.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/30 transition-all active:scale-98"
              >
                Skip Timer & Show Results
              </button>
            </div>

            <aside className="rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 shadow-2xl h-fit">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm sm:text-base font-extrabold text-white">Live Leaderboard</h3>
                <span className="px-2 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                  Top 10
                </span>
              </div>

              <div className="space-y-2.5">
                {topParticipants.length === 0 ? (
                  <div className="text-xs text-slate-500 italic py-6 text-center">No score yet</div>
                ) : (
                  topParticipants.map((p, idx) => (
                    <div key={p.participantId} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black ${idx === 0 ? 'bg-amber-500 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-orange-700 text-white' : 'bg-slate-800 text-slate-300'}`}>
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-white">{p.nickname}</div>
                          <div className="text-[10px] text-slate-400">{p.correctAnswers} correct</div>
                        </div>
                      </div>
                      <div className="text-sm font-black text-indigo-400">{p.score}</div>
                    </div>
                  ))
                )}
              </div>
            </aside>
          </div>
        )}

        {activeGame.status === 'question_result' && currentQuestion && (
          <div className="space-y-5 sm:space-y-8 max-w-4xl mx-auto w-full text-center">
            <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-4 sm:space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm font-bold">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Question Results</span>
              </div>

              <h3 className="text-lg sm:text-2xl font-bold text-white">Correct Answer:</h3>
              <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-lg sm:text-2xl font-extrabold max-w-xl mx-auto break-words">
                {currentQuestion.options[currentQuestion.correctAnswer]}
              </div>

              {/* Mini Leaderboard preview */}
              <div className="space-y-2 sm:space-y-3 pt-2 sm:pt-4 text-left max-w-xl mx-auto">
                <h4 className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Top Participants</h4>
                {participants.slice(0, 5).map((p, idx) => (
                  <div key={p.participantId} className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center space-x-2.5 sm:space-x-3 truncate">
                      <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                        idx === 0 ? 'bg-amber-500 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {idx + 1}
                      </span>
                      {p.avatar ? (
                        <img src={p.avatar} alt={p.nickname} className="w-7 h-7 rounded-full object-cover bg-slate-800 shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">{p.nickname.charAt(0)}</div>
                      )}
                      <span className="font-bold text-white text-sm sm:text-base truncate max-w-[120px] sm:max-w-xs">{p.nickname}</span>
                    </div>
                    <span className="font-extrabold text-indigo-400 text-xs sm:text-sm">{p.score} pts</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleNextOrLeaderboard}
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-base sm:text-lg shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 mx-auto active:scale-98"
            >
              <span>{activeGame.currentQuestionIndex + 1 >= currentQuiz.questions.length ? 'View Final Podium' : 'Next Question'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
