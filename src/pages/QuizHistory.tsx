import React, { useState } from 'react';
import { PageId, User, GameHistoryRecord } from '../types';
import { StorageDB } from '../services/db';
import { History, ArrowLeft, Download, Trophy, Users, Calendar, Folder, Trash2 } from 'lucide-react';

interface QuizHistoryProps {
  currentUser: User | null;
  setCurrentPage: (page: PageId) => void;
}

export const QuizHistory: React.FC<QuizHistoryProps> = ({ currentUser, setCurrentPage }) => {
  const [history, setHistory] = useState(StorageDB.getHistory());
  const [isClearing, setIsClearing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const folders = StorageDB.getFolders();
  const combinedFolderScores = folders
    .filter(folder => folder.aggregateScores)
    .map(folder => {
      const totals = new Map<string, { nickname: string; score: number; correctAnswers: number }>();
      const folderGames = history.filter(record => record.folderId === folder.folderId);
      folderGames.forEach(record => record.participants.forEach(participant => {
        const key = participant.nickname.trim().toLowerCase();
        const current = totals.get(key) || { nickname: participant.nickname, score: 0, correctAnswers: 0 };
        current.score += participant.score;
        current.correctAnswers += participant.correctAnswers;
        totals.set(key, current);
      }));
      return {
        folder,
        gameCount: folderGames.length,
        participants: [...totals.values()].sort((first, second) => second.score - first.score),
      };
    })
    .filter(summary => summary.gameCount > 0 && summary.participants.length > 0);

  const handleExportCSV = (record: GameHistoryRecord) => {
    const escapeCsvCell = (value: string | number) => {
      const text = String(value);
      const safeText = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replace(/"/g, '""')}"`;
    };
    const rows = [
      ['Rank', 'Nickname', 'Participant ID', 'Score', 'Correct Answers'],
      ...record.participants.map((participant, index) => [
        index + 1,
        participant.nickname,
        participant.participantId || '',
        participant.score,
        participant.correctAnswers,
      ]),
    ];
    const csvContent = rows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n');
    const encodedUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `NexGen_Era_Results_${record.quizTitle.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all completed quiz logs? This cannot be undone.')) return;
    setIsClearing(true);
    setErrorMessage('');
    try {
      await StorageDB.clearHistory();
      setHistory(StorageDB.getHistory());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to clear quiz logs. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-5 sm:pt-8">
        <div className="flex items-start justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <button
              onClick={() => setCurrentPage('host_dashboard')}
              className="flex items-center space-x-1.5 text-slate-400 hover:text-white transition-colors text-xs sm:text-sm font-semibold mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Quiz Session History</h1>
            <p className="text-xs sm:text-sm text-slate-400">Review past completed game sessions, winner stats, and export CSV reports.</p>
          </div>
          {currentUser?.role === 'host' && history.length > 0 && (
            <button
              type="button"
              onClick={() => void handleClearHistory()}
              disabled={isClearing}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50 sm:px-4 sm:py-2.5 sm:text-sm"
            >
              <Trash2 className="h-4 w-4" />
              {isClearing ? 'Clearing...' : 'Clear Logs'}
            </button>
          )}
        </div>

        {errorMessage && <div role="alert" className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{errorMessage}</div>}

        {combinedFolderScores.length > 0 && (
          <section className="mb-8 space-y-4">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-extrabold text-white">
                <Folder className="h-5 w-5 text-indigo-400" />
                Combined Folder Scores
              </h2>
              <p className="mt-1 text-xs text-slate-400">Scores are cumulative because these folders have “Combine scores across quizzes” enabled.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {combinedFolderScores.map(summary => (
                <div key={summary.folder.folderId} className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white">{summary.folder.name}</h3>
                      <p className="text-[11px] text-slate-400">{summary.gameCount} completed quiz session{summary.gameCount === 1 ? '' : 's'}</p>
                    </div>
                    <Trophy className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="space-y-2">
                    {summary.participants.slice(0, 5).map((participant, index) => (
                      <div key={participant.nickname.toLowerCase()} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                        <span className="text-sm font-bold text-slate-200">#{index + 1} {participant.nickname}</span>
                        <span className="text-sm font-black text-indigo-400">{participant.score} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {history.length === 0 ? (
          <div className="p-8 sm:p-12 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3 sm:space-y-4">
            <History className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg sm:text-xl font-bold text-slate-300">No Past Sessions Yet</h3>
            <p className="text-slate-500 text-xs sm:text-sm">Completed live game sessions will appear here automatically.</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {history.map(record => (
              <div key={record.historyId} className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
                <div className="space-y-2 w-full md:w-auto">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] sm:text-xs font-semibold">
                      Completed Session
                    </span>
                    <span className="text-[11px] sm:text-xs text-slate-500 flex items-center space-x-1">
                      <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span>{new Date(record.startedAt).toLocaleString()}</span>
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-extrabold text-white">{record.quizTitle}</h3>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-slate-400">
                    <span className="flex items-center space-x-1.5">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>{record.totalParticipants} Participants</span>
                    </span>
                    {record.winnerName && (
                      <span className="flex items-center space-x-1.5">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span>Winner: <strong className="text-amber-300">{record.winnerName}</strong> ({record.winnerScore} pts)</span>
                      </span>
                    )}
                  </div>

                  {!!record.quizBreakdown?.length && (
                    <details className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                      <summary className="cursor-pointer text-xs font-bold text-indigo-300">
                        Scores by quiz ({record.quizBreakdown.length})
                      </summary>
                      <div className="mt-3 max-h-64 space-y-3 overflow-y-auto">
                        {record.quizBreakdown.map(quizResult => (
                          <section key={quizResult.quizId}>
                            <h4 className="mb-1 text-xs font-bold text-slate-200">{quizResult.quizTitle}</h4>
                            <div className="space-y-1">
                              {quizResult.participants.map(participant => (
                                <div key={participant.participantId} className="flex items-center justify-between gap-3 rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px]">
                                  <span className="truncate text-slate-300">#{participant.rank} {participant.nickname}</span>
                                  <span className="shrink-0 font-bold text-indigo-300">{participant.score} pts</span>
                                </div>
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    </details>
                  )}
                </div>

                <button
                  onClick={() => handleExportCSV(record)}
                  className="w-full md:w-auto px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all active:scale-95 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
