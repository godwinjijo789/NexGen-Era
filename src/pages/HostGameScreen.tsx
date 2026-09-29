import React, { useState, useEffect, useRef } from 'react';
import { PageId, GameSession, Quiz, Participant, Response } from '../types';
import { StorageDB } from '../services/db';
import { getSupabaseErrorMessage } from '../lib/supabase';
import { buildJoinLink, buildQrCodeUrl } from '../utils/joinLink';
import { Play, Users, Trophy, ArrowRight, CheckCircle2, Clock, Zap, Square, Circle, Diamond, Triangle, AlertCircle, Copy, QrCode } from 'lucide-react';

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
  const [actionError, setActionError] = useState('');
  const [isRevealing, setIsRevealing] = useState(false);
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
      try {
        await StorageDB.refreshSharedState();
        setActiveGame(StorageDB.getActiveGame());
        setParticipants(StorageDB.getParticipants());
        setResponses(StorageDB.getResponses());
      } catch (error) {
        setActionError(getSupabaseErrorMessage(error, 'Unable to load live game data. Check your connection.'));
      }
    };

    refreshLiveState();

    const unsubscribe = StorageDB.subscribe(() => {
      setActiveGame(StorageDB.getActiveGame());
      setParticipants(StorageDB.getParticipants());
      setResponses(StorageDB.getResponses());
    });

    const stopWatching = (game || StorageDB.getActiveGame())?.gameId
      ? StorageDB.watchGame((game || StorageDB.getActiveGame())!.gameId)
      : undefined;
    return () => {
      unsubscribe();
      stopWatching?.();
    };
  }, []);

  const currentQuiz = activeGame?.quiz || quiz || StorageDB.getQuizzes().find(q => q.quizId === activeGame?.quizId);
  const currentQuestionIndex = activeGame?.currentQuestionIndex ?? 0;
  const currentQuestion = currentQuiz?.questions[currentQuestionIndex];
  const topParticipants = [...participants].sort((a, b) => b.score - a.score);
  const topTenParticipants = topParticipants.slice(0, 10);
  const currentSourceQuestionIds = new Set(currentQuiz?.questions
    .filter(question => question.sourceQuizId === currentQuestion?.sourceQuizId)
    .map(question => question.id) || []);
  const currentSourceQuizLeaderboard = participants.map(participant => ({
    ...participant,
    quizPoints: responses
      .filter(response => response.gameId === activeGame?.gameId &&
        response.participantId === participant.participantId &&
        currentSourceQuestionIds.has(response.questionId))
      .reduce((total, response) => total + response.points, 0),
  })).sort((first, second) => second.quizPoints - first.quizPoints || first.joinedAt.localeCompare(second.joinedAt));
  const isFolderQuizComplete = Boolean(currentQuiz?.isArchived && currentQuestion?.sourceQuizId &&
    currentQuiz.questions[currentQuestionIndex + 1]?.sourceQuizId !== currentQuestion.sourceQuizId);

  const persistGame = async (updatedGame: GameSession | null) => {
    setActionError('');
    try {
      await StorageDB.setActiveGame(updatedGame);
    } catch (error) {
      setActionError(getSupabaseErrorMessage(error, 'Unable to save the game update. Please retry.'));
    }
  };

  // Use the shared start timestamp so the host timer cannot drift by interval length.
  useEffect(() => {
    if (activeGame?.status === 'question_active' && currentQuestion) {
      const deadline = (activeGame.questionStartTime || StorageDB.getSynchronizedNow()) + currentQuestion.timerSeconds * 1000;
      const updateTimeLeft = () => {
        const remaining = Math.max(0, deadline - StorageDB.getSynchronizedNow());
        setTimeLeft(Math.ceil(remaining / 1000));
      };

      updateTimeLeft();
      const displayTimer = window.setInterval(updateTimeLeft, 100);
      const finishTimer = window.setTimeout(() => {
        setTimeLeft(0);
        void handleShowResults();
      }, Math.max(0, deadline - StorageDB.getSynchronizedNow()));

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
      questionStartTime: StorageDB.getSynchronizedNow(),
      quiz: currentQuiz || activeGame.quiz || quiz || null
    };
    void persistGame(updated);
    setActiveGame(updated);
  };

  const handleShowResults = async () => {
    if (activeGame.status !== 'question_active' || resultsInProgress.current) return;
    resultsInProgress.current = true;
    setIsRevealing(true);
    try {
      const result = await StorageDB.revealGameResults(activeGame.gameId);
      setActiveGame(result.game);
      setParticipants(result.participants);
      setResponses(StorageDB.getResponses());
    } catch (error) {
      resultsInProgress.current = false;
      console.error('reveal_game_results error:', error);
      const fallback = error instanceof Error ? error.message : 'Unable to reveal results. Please retry.';
      setActionError(getSupabaseErrorMessage(error, fallback));
    } finally {
      setIsRevealing(false);
    }
  };

  const handleNextOrLeaderboard = () => {
    const nextIdx = activeGame.currentQuestionIndex + 1;
    if (nextIdx >= currentQuiz.questions.length) {
      // Game Finished
      const updatedGame: GameSession = { ...activeGame, status: 'finished', endedAt: new Date().toISOString() };
      void persistGame(updatedGame);
      setActiveGame(updatedGame);

      // Save to history
      const history = StorageDB.getHistory();
      const finalParticipants = [...participants].sort((first, second) => second.score - first.score);
      const winner = finalParticipants[0] || null;
      const quizBreakdown = currentQuiz.isArchived
        ? StorageDB.getQuizzes()
          .filter(sourceQuiz => sourceQuiz.folderId === currentQuiz.folderId)
          .map(sourceQuiz => {
            const sourceQuestionIds = new Set(sourceQuiz.questions.map(question => `${sourceQuiz.quizId}_${question.id}`));
            const sourceParticipants = participants.map(participant => {
              const sourceResponses = responses.filter(response =>
                response.gameId === activeGame.gameId &&
                response.participantId === participant.participantId &&
                sourceQuestionIds.has(response.questionId)
              );
              return {
                ...participant,
                score: sourceResponses.reduce((total, response) => total + response.points, 0),
                correctAnswers: sourceResponses.filter(response => response.isCorrect).length,
                rank: 0,
              };
            }).sort((first, second) => second.score - first.score || first.joinedAt.localeCompare(second.joinedAt));
            sourceParticipants.forEach((participant, index) => { participant.rank = index + 1; });
            return {
              quizId: sourceQuiz.quizId,
              quizTitle: sourceQuiz.title,
              participants: sourceParticipants,
            };
          })
        : undefined;
      history.unshift({
        historyId: `hist_${Date.now()}`,
        gameId: activeGame.gameId,
        folderId: currentQuiz.folderId,
        quizTitle: currentQuiz.title,
        hostName: 'Host',
        totalParticipants: participants.length,
        startedAt: activeGame.startedAt,
        endedAt: new Date().toISOString(),
        winnerName: winner?.nickname,
        winnerScore: winner?.score,
        participants: finalParticipants,
        quizBreakdown
      });
      void StorageDB.saveHistory(history).catch(error => {
        setActionError(getSupabaseErrorMessage(error, 'Unable to save game history. Please retry.'));
      });
      setCurrentPage('final_results');
    } else {
      resultsInProgress.current = false;
      const updatedGame: GameSession = {
        ...activeGame,
        status: 'question_active',
        currentQuestionIndex: nextIdx,
        questionStartTime: StorageDB.getSynchronizedNow(),
        quiz: currentQuiz || activeGame.quiz || quiz || null
      };
      void persistGame(updatedGame);
      setActiveGame(updatedGame);
    }
  };

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
      {actionError && <div role="alert" className="border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-center text-sm text-red-300">{actionError}</div>}
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
                void persistGame(null);
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
          <div className="text-center space-y-6 sm:space-y-8 max-w-5xl mx-auto w-full">
            <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-4 sm:space-y-6">
              {currentQuiz.coverImage && (
                <img src={currentQuiz.coverImage} alt={`${currentQuiz.title} cover`} className="mx-auto block max-h-[50vh] max-w-full w-auto rounded-xl bg-slate-950/50 object-contain" />
              )}
              <h1 className="text-xl font-black text-white sm:text-3xl">{currentQuiz.title}</h1>
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
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-3 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
            <aside className="order-2 min-w-0 rounded-xl border border-slate-800 bg-slate-900/90 p-3 shadow-xl sm:rounded-2xl sm:p-4 xl:order-none xl:col-start-2 xl:row-start-1">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-white sm:text-base">Top 10 Teams</h3>
                <span className="shrink-0 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                  {participants.length} players
                </span>
              </div>
              <div className="grid max-h-80 grid-cols-2 gap-1.5 overflow-y-auto sm:gap-2 xl:max-h-[calc(100vh-230px)] xl:grid-cols-1">
                {topTenParticipants.length === 0 ? (
                  <div className="col-span-full py-6 text-center text-xs italic text-slate-500">No scores yet</div>
                ) : (
                  topTenParticipants.map((p, idx) => (
                    <div key={p.participantId} className="flex min-w-0 items-center justify-between gap-1 rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[9px] font-black ${idx === 0 ? 'bg-amber-500 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-orange-700 text-white' : 'bg-slate-800 text-slate-300'}`}>
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-white">{p.nickname}</div>
                          <div className="text-[9px] text-slate-400">{p.correctAnswers} correct</div>
                        </div>
                      </div>
                      <div className="ml-1 shrink-0 text-xs font-black text-indigo-400">{p.score} pts</div>
                    </div>
                  ))
                )}
              </div>
            </aside>

            <section className="order-1 min-w-0 overflow-hidden rounded-xl bg-slate-100 text-slate-900 shadow-2xl sm:rounded-2xl xl:order-none xl:col-start-1 xl:row-start-1">
              <header className="border-b border-slate-200 bg-white px-3 py-3 text-center sm:px-5">
                {currentQuiz.coverImage && <img src={currentQuiz.coverImage} alt={`${currentQuiz.title} cover`} className="mx-auto mb-2 max-h-16 max-w-full object-contain" />}
                <h2 className="break-words text-sm font-extrabold sm:text-lg">{currentQuiz.title}... {currentQuestion.text}</h2>
              </header>

              <div className={`grid items-center justify-items-center gap-2 p-2 sm:gap-4 sm:p-4 ${currentQuestion.mediaUrl || currentQuestion.imageUrl ? 'min-h-48 grid-cols-[52px_minmax(0,1fr)] sm:min-h-64 sm:grid-cols-[80px_minmax(0,1fr)]' : 'min-h-20 grid-cols-1 sm:min-h-24'}`}>
                <div className="flex aspect-square items-center justify-center rounded-full bg-violet-600 text-lg font-black text-white shadow-lg sm:text-2xl">
                  <Clock className="mr-1 h-4 w-4 sm:h-5 sm:w-5" />{timeLeft}
                </div>

                {(currentQuestion.mediaUrl || currentQuestion.imageUrl) && (
                  <div className="flex min-h-40 items-center justify-center overflow-hidden bg-white sm:min-h-56">
                    {currentQuestion.mediaType === 'video' ? (
                      <video src={currentQuestion.mediaUrl || currentQuestion.imageUrl} controls className="max-h-[38vh] max-w-full object-contain" />
                    ) : (
                      <img src={currentQuestion.mediaUrl || currentQuestion.imageUrl} alt="Question visual" className="max-h-[38vh] max-w-full object-contain" />
                    )}
                  </div>
                )}

              </div>

              <div className="grid grid-cols-2 gap-1.5 p-1.5 sm:gap-2 sm:p-2">
                {currentQuestion.options.map((opt, optIdx) => {
                  const colors = ['bg-rose-600', 'bg-blue-600', 'bg-amber-500', 'bg-emerald-600'];
                  const shapes = [Triangle, Diamond, Circle, Square];
                  const Shape = shapes[optIdx % shapes.length];
                  return (
                    <div key={optIdx} className={`flex min-h-14 items-center gap-2 p-2.5 text-white sm:min-h-16 sm:gap-4 sm:px-5 ${colors[optIdx % colors.length]}`}>
                      <Shape className="h-7 w-7 shrink-0 fill-current sm:h-9 sm:w-9" aria-hidden="true" />
                      <span className="break-words text-sm font-extrabold sm:text-base">{opt}</span>
                    </div>
                  );
                })}
              </div>

              <footer className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-2.5 sm:px-4">
                <span className="text-xs font-semibold text-slate-500">Question {activeGame.currentQuestionIndex + 1} of {currentQuiz.questions.length}</span>
                <button
                  disabled={isRevealing}
                  onClick={handleShowResults}
                  className="rounded-md bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-600 disabled:opacity-60 sm:text-sm"
                >
                  {isRevealing ? 'Revealing Results...' : 'Skip Timer & Show Results'}
                </button>
              </footer>
            </section>
          </div>
        )}

        {activeGame.status === 'question_result' && currentQuestion && (
          <div className="space-y-5 sm:space-y-8 max-w-4xl mx-auto w-full text-center">
            <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-4 sm:space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm font-bold">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Question Results</span>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Question {activeGame.currentQuestionIndex + 1}
                </p>
                <h2 className="text-lg sm:text-2xl font-extrabold text-white leading-snug">{currentQuestion.text}</h2>
              </div>

              {isFolderQuizComplete && (
                <section className="mx-auto max-w-2xl rounded-xl border border-indigo-500/20 bg-slate-950/70 p-4 text-left sm:p-5">
                  <h3 className="text-base font-extrabold text-white sm:text-lg">{currentQuestion.sourceQuizTitle} · Team Points</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {currentQuestion.excludeFromFolderTotal
                      ? 'Separate score: these points are not added to the folder total.'
                      : 'These points are included in the folder total.'}
                  </p>
                  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                    {currentSourceQuizLeaderboard.map((participant, index) => (
                      <div key={participant.participantId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                        <span className="min-w-0 truncate text-sm font-semibold text-white">{index + 1}. {participant.nickname}</span>
                        <span className="shrink-0 text-sm font-black text-indigo-300">{participant.quizPoints} pts</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="mx-auto max-h-80 max-w-xl space-y-2 overflow-y-auto pt-2 text-left sm:space-y-3 sm:pt-4">
                <h4 className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">All Teams · Total Points</h4>
                {topParticipants.map((p, idx) => (
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
              <span>{activeGame.currentQuestionIndex + 1 >= currentQuiz.questions.length ? 'View Final Podium' : isFolderQuizComplete ? 'Next Quiz' : 'Next Question'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
