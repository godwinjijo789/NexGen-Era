import { User, Quiz, QuizFolder, GameSession, Participant, Response, GameHistoryRecord } from '../types';

import { getSupabaseErrorMessage, supabase } from '../lib/supabase';

type Row = Record<string, any>;

let currentUser: User | null = null;
let users: User[] = [];
let quizzes: Quiz[] = [];
let folders: QuizFolder[] = [];
let activeGame: GameSession | null = null;
let currentParticipant: Participant | null = null;
let participants: Participant[] = [];
let responses: Response[] = [];
let history: GameHistoryRecord[] = [];
let serverClockOffset = 0;
const listeners = new Set<(event: any) => void>();
const gameChannels = new Map<string, { channel: ReturnType<typeof supabase.channel>; watchers: number }>();
let gameLoadSequence = 0;

const emit = (event: any) => listeners.forEach(listener => listener(event));

const getGameChannel = (gameId: string) => {
  const existing = gameChannels.get(gameId);
  if (existing) return existing;
  const registration = { channel: supabase.channel(`game-${gameId}`), watchers: 0 };
  gameChannels.set(gameId, registration);
  return registration;
};

const broadcastGameState = (gameId: string, gameRow: Row, participantRows: Array<Row | Participant> = participants, responseRows: Array<Row | Response> = responses) => {
  const registration = gameChannels.get(gameId);
  if (!registration?.watchers) return;
  const message = {
    type: 'broadcast',
    event: 'game_state',
    payload: { game: gameRow, participants: participantRows, responses: responseRows },
  } as const;
  void registration.channel.send(message);
};

export const normalizeGamePin = (value: unknown): string => String(value ?? '').replace(/\D/g, '').slice(0, 6);

const toUser = (row: Row): User => ({
  userId: row.id,
  name: row.name,
  email: row.email || '',
  role: row.role,
  participantId: row.participant_id || undefined,
  avatar: row.avatar || undefined,
  createdAt: row.created_at,
  isDisabled: row.is_disabled,
});

const toQuiz = (row: Row): Quiz => ({
  quizId: row.quiz_id,
  hostId: row.host_id,
  folderId: row.folder_id || undefined,
  title: row.title,
  description: row.description || undefined,
  stream: row.stream,
  subject: row.subject || undefined,
  difficulty: row.difficulty,
  showQuestionAndAnswersToParticipants: row.show_question_and_answers_to_participants,
  showMediaToParticipants: row.show_media_to_participants,
  questions: row.questions || [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toFolder = (row: Row): QuizFolder => ({
  folderId: row.folder_id,
  hostId: row.host_id,
  name: row.name,
  aggregateScores: row.aggregate_scores,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toParticipant = (row: Row): Participant => ({
  participantId: row.participant_id,
  gameId: row.game_id,
  nickname: row.nickname,
  studentId: row.student_id || undefined,
  avatar: row.avatar || undefined,
  score: row.score,
  correctAnswers: row.correct_answers,
  rank: row.rank,
  joinedAt: row.joined_at,
  isOnline: row.is_online,
});

const toResponse = (row: Row): Response => ({
  responseId: row.response_id,
  gameId: row.game_id,
  participantId: row.participant_id,
  questionId: row.question_id,
  selectedAnswer: row.selected_answer,
  isCorrect: row.is_correct,
  responseTime: Number(row.response_time),
  points: row.points,
  submittedAt: row.submitted_at,
});

const toGame = (row: Row, quiz?: Quiz): GameSession => ({
  gameId: row.game_id,
  quizId: row.quiz_id,
  folderId: quiz?.folderId || row.quiz_snapshot?.folderId || undefined,
  hostId: row.host_id,
  gamePin: row.game_pin,
  status: row.status,
  currentQuestionIndex: row.current_question_index,
  questionStartTime: row.question_start_time ? new Date(row.question_start_time).getTime() : undefined,
  updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
  startedAt: row.started_at,
  endedAt: row.ended_at || undefined,
  quiz: quiz || row.quiz_snapshot,
});

const toHistory = (row: Row): GameHistoryRecord => ({
  historyId: row.history_id,
  gameId: row.game_id,
  folderId: row.folder_id || undefined,
  quizTitle: row.quiz_title,
  hostName: row.host_name,
  totalParticipants: row.total_participants,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  winnerName: row.winner_name || undefined,
  winnerScore: row.winner_score ?? undefined,
  participants: row.participants || [],
});

const quizRow = (quiz: Quiz) => ({
  quiz_id: quiz.quizId,
  host_id: quiz.hostId,
  folder_id: quiz.folderId || null,
  title: quiz.title,
  description: quiz.description || null,
  stream: quiz.stream || quiz.subject || 'General',
  subject: quiz.subject || null,
  difficulty: quiz.difficulty,
  show_question_and_answers_to_participants: quiz.showQuestionAndAnswersToParticipants ?? true,
  show_media_to_participants: quiz.showMediaToParticipants ?? true,
  questions: quiz.questions,
});

const requireSuccess = <T,>(result: { data: T; error: { message: string } | null }): T => {
  if (result.error) throw new Error(result.error.message);
  return result.data;
};

const syncServerClock = async () => {
  const requestStartedAt = Date.now();
  const result = await supabase.rpc('get_server_time');
  const serverTime = requireSuccess(result) as string;
  const requestFinishedAt = Date.now();
  const midpoint = requestStartedAt + (requestFinishedAt - requestStartedAt) / 2;
  serverClockOffset = new Date(serverTime).getTime() - midpoint;
};

const synchronizedNow = () => Date.now() + serverClockOffset;

async function loadGame(gameId: string) {
  const requestSequence = ++gameLoadSequence;
  const gameRow = requireSuccess(await supabase.from('games').select('*').eq('game_id', gameId).single()) as Row;
  let quiz = gameRow.quiz_snapshot as Quiz;
  if (gameRow.host_id === currentUser?.userId) {
    const result = await supabase.from('quizzes').select('*').eq('quiz_id', gameRow.quiz_id).single();
    if (!result.error) quiz = toQuiz(result.data as Row);
  }
  const isHost = gameRow.host_id === currentUser?.userId;
  const [participantResult, responseResult] = await Promise.all([
    supabase.from('game_participants').select('*').eq('game_id', gameId).order('joined_at'),
    isHost
      ? supabase.from('game_responses').select('*').eq('game_id', gameId).order('submitted_at')
      : supabase.rpc('get_game_responses', { p_game_id: gameId }),
  ]);
  if (requestSequence !== gameLoadSequence) return;
  participants = (requireSuccess(participantResult) as Row[]).map(toParticipant);
  if (currentParticipant?.gameId === gameId) {
    currentParticipant = participants.find(item => item.participantId === currentParticipant?.participantId) || currentParticipant;
  }
  responses = (responseResult.error ? [] : responseResult.data as Row[]).map(toResponse);
  activeGame = toGame(gameRow, quiz);
  emit({ type: 'GAME_UPDATED', game: activeGame });
  emit({ type: 'PARTICIPANTS_UPDATED', participants });
  emit({ type: 'RESPONSES_UPDATED', responses });
}

export const StorageDB = {
  getUsers: () => users,
  getCurrentUser: () => currentUser,
  getQuizzes: () => quizzes,
  getFolders: () => folders,
  getActiveGame: () => activeGame,
  getCurrentParticipant: () => currentParticipant,
  getParticipants: () => participants,
  getResponses: () => responses,

  getHistory: () => history,
  getSynchronizedNow: () => synchronizedNow(),

  async getProfile(userId: string) {
    const result = await supabase.from('profiles').select('*').eq('id', userId).single();
    return toUser(requireSuccess(result) as Row);
  },

  setCurrentUser(user: User | null) {
    currentUser = user;
    emit({ type: 'CURRENT_USER_UPDATED' });
  },

  async updateProfile(user: User) {
    if (currentUser && user.email.toLowerCase() !== currentUser.email.toLowerCase()) {
      const authResult = await supabase.auth.updateUser({ email: user.email.trim() });
      if (authResult.error) throw new Error(authResult.error.message);
    }
    const result = await supabase.from('profiles').update({ name: user.name, avatar: user.avatar || null }).eq('id', user.userId);
    if (result.error) throw new Error(result.error.message);
    currentUser = user;
    users = users.map(existing => existing.userId === user.userId ? user : existing);
    emit({ type: 'CURRENT_USER_UPDATED' });
  },

  async initialize(user: User | null) {
    currentUser = user;
    if (!user) {
      users = [];
      quizzes = [];
      folders = [];
      history = [];
      activeGame = null;
      currentParticipant = null;
      participants = [];
      responses = [];
      emit({ type: 'RESET' });
      return;
    }

    try {
      await syncServerClock();
    } catch {
      serverClockOffset = 0;
    }

    const [quizResult, folderResult, historyResult] = await Promise.all([
      supabase.from('quizzes').select('*').order('created_at', { ascending: false }),
      supabase.from('quiz_folders').select('*').order('created_at', { ascending: false }),
      supabase.from('game_history').select('*').order('started_at', { ascending: false }),
    ]);
    quizzes = (requireSuccess(quizResult) as Row[]).map(toQuiz);
    folders = (folderResult.error ? [] : (folderResult.data as Row[])).map(toFolder);
    history = (requireSuccess(historyResult) as Row[]).map(toHistory);

    if (user.role === 'admin') {
      const profileResult = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      users = (requireSuccess(profileResult) as Row[]).map(toUser);
    } else {
      users = [user];
    }

    if (user.role === 'host' || user.role === 'admin') {
      const gameResult = await supabase.from('games').select('*').neq('status', 'finished').order('updated_at', { ascending: false }).limit(1);
      const gameRows = requireSuccess(gameResult) as Row[];
      if (gameRows[0]) await loadGame(gameRows[0].game_id);
      else {
        activeGame = null;
        participants = [];
        responses = [];
      }
    } else {
      const joinedResult = await supabase.from('game_participants').select('*').eq('user_id', user.userId).order('joined_at', { ascending: false }).limit(1);
      const joinedRows = (requireSuccess(joinedResult) as Row[]);
      if (joinedRows[0]) {
        currentParticipant = toParticipant(joinedRows[0]);
        await loadGame(joinedRows[0].game_id);
      }
      else {
        currentParticipant = null;
        activeGame = null;
        participants = [];
        responses = [];
      }
    }
    emit({ type: 'DATA_LOADED' });
  },

  async refreshSharedState() {
    if (activeGame?.gameId) await loadGame(activeGame.gameId);
  },

  async saveUsers(nextUsers: User[]) {
    for (const user of nextUsers) {
      const result = await supabase.from('profiles').update({
        name: user.name,
        avatar: user.avatar || null,
        is_disabled: user.isDisabled ?? false,
      }).eq('id', user.userId);
      if (result.error) throw new Error(result.error.message);
    }
    users = nextUsers;
    if (currentUser) currentUser = nextUsers.find(user => user.userId === currentUser?.userId) || currentUser;
    emit({ type: 'USERS_UPDATED' });
  },

  async saveQuizzes(nextQuizzes: Quiz[]) {
    const previousIds = new Set(quizzes.map(quiz => quiz.quizId));
    const nextIds = new Set(nextQuizzes.map(quiz => quiz.quizId));
    if (nextQuizzes.length) {
      const result = await supabase.from('quizzes').upsert(nextQuizzes.map(quizRow), { onConflict: 'quiz_id' });
      if (result.error) throw new Error(result.error.message);
    }
    const removedIds = [...previousIds].filter(id => !nextIds.has(id));
    if (removedIds.length) {
      const result = await supabase.from('quizzes').delete().in('quiz_id', removedIds);
      if (result.error) throw new Error(result.error.message);
    }
    quizzes = nextQuizzes;
    emit({ type: 'QUIZZES_UPDATED' });
  },

  async saveFolders(nextFolders: QuizFolder[]) {
    const previousIds = new Set(folders.map(folder => folder.folderId));
    const nextIds = new Set(nextFolders.map(folder => folder.folderId));
    if (nextFolders.length) {
      const result = await supabase.from('quiz_folders').upsert(nextFolders.map(folder => ({
        folder_id: folder.folderId,
        host_id: folder.hostId,
        name: folder.name.trim(),
        aggregate_scores: folder.aggregateScores,
      })), { onConflict: 'folder_id' });
      if (result.error) throw new Error(result.error.message);
    }
    const removedIds = [...previousIds].filter(id => !nextIds.has(id));
    if (removedIds.length) {
      const result = await supabase.from('quiz_folders').delete().in('folder_id', removedIds);
      if (result.error) throw new Error(result.error.message);
    }
    folders = nextFolders;
    emit({ type: 'FOLDERS_UPDATED' });
  },

  async startGame(quiz: Quiz, gamePin: string) {
    const result = await supabase.rpc('start_game', { p_quiz_id: quiz.quizId, p_game_pin: normalizeGamePin(gamePin) });
    const gameRow = requireSuccess(result) as Row;
    activeGame = toGame(gameRow, quiz);
    participants = [];
    responses = [];
    emit({ type: 'GAME_UPDATED', game: activeGame });
    return activeGame;
  },

  async joinGame(gamePin: string, nickname: string, avatar: string) {
    const sessionResult = await supabase.auth.getSession();
    if (!sessionResult.data.session) {
      const anonResult = await supabase.auth.signInAnonymously();
      if (anonResult.error) throw new Error(anonResult.error.message);
      if (anonResult.data.user) {
        const profileResult = await supabase.from('profiles').select('*').eq('id', anonResult.data.user.id).single();
        if (!profileResult.error) currentUser = toUser(profileResult.data as Row);
      }
    }

    try {
      await syncServerClock();
    } catch {
      serverClockOffset = 0;
    }

    const result = await supabase.rpc('join_game', {
      p_game_pin: normalizeGamePin(gamePin),
      p_nickname: nickname.trim(),
      p_avatar: avatar || null,
    });
    const payload = requireSuccess(result) as { game: Row; participant: Row };
    activeGame = toGame(payload.game);
    const joinedParticipant = toParticipant(payload.participant);
    currentParticipant = joinedParticipant;
    currentUser = currentUser || null;
    await loadGame(activeGame.gameId);
    return { game: activeGame, participant: joinedParticipant };
  },

  async setActiveGame(game: GameSession | null) {
    if (!game) {
      if (activeGame && (currentUser?.userId === activeGame.hostId || currentUser?.role === 'admin') && activeGame.status !== 'finished') {
        const result = await supabase.from('games').update({ status: 'finished', ended_at: new Date().toISOString() }).eq('game_id', activeGame.gameId);
        if (result.error) throw new Error(result.error.message);
      }
      activeGame = null;
      emit({ type: 'GAME_UPDATED', game: null });
      return;
    }

    const update = {
      status: game.status,
      current_question_index: game.currentQuestionIndex,
      question_start_time: game.status === 'question_active'
        ? new Date(synchronizedNow()).toISOString()
        : game.questionStartTime ? new Date(game.questionStartTime).toISOString() : null,
      ended_at: game.endedAt || null,
    };
    const result = await supabase.from('games').update(update).eq('game_id', game.gameId).select('*').single();
    const row = requireSuccess(result) as Row;
    activeGame = toGame(row, game.quiz || activeGame?.quiz);
    broadcastGameState(game.gameId, row);
    emit({ type: 'GAME_UPDATED', game: activeGame });
  },

  async revealGameResults(gameId: string) {
    const result = await supabase.rpc('reveal_game_results', { p_game_id: gameId });
    const applySnapshot = (gameRow: Row, participantRows: Row[]) => {
      activeGame = toGame(gameRow, activeGame?.quiz);
      participants = participantRows.map(toParticipant);
      if (currentParticipant?.gameId === gameId) {
        currentParticipant = participants.find(item => item.participantId === currentParticipant?.participantId) || currentParticipant;
      }
      broadcastGameState(gameId, gameRow, participantRows, responses);
      emit({ type: 'GAME_UPDATED', game: activeGame });
      emit({ type: 'PARTICIPANTS_UPDATED', participants });
      return { game: activeGame, participants };
    };

    if (result.error) {
      console.error('reveal_game_results error:', result.error);
      throw new Error(result.error.message);
    }

    const payload = result.data as { game?: Row; participants?: Row[] } | null;
    if (payload?.game && Array.isArray(payload.participants)) {
      return applySnapshot(payload.game, payload.participants);
    }

    throw new Error('The results response was incomplete. Please retry.');
  },

  async submitResponse(response: Response) {
    const result = await supabase.rpc('submit_game_response', {
      p_game_id: response.gameId,
      p_participant_id: response.participantId,
      p_selected_answer: response.selectedAnswer,
    });
    requireSuccess(result);
    const savedResponse = { ...response, isCorrect: false, points: 0 };
    responses = [...responses.filter(item => !(item.participantId === response.participantId && item.questionId === response.questionId)), savedResponse];
    emit({ type: 'RESPONSES_UPDATED', responses });
    return savedResponse;
  },

  async saveHistory(nextHistory: GameHistoryRecord[]) {
    const latest = nextHistory[0];
    if (latest && currentUser) {
      const result = await supabase.from('game_history').upsert({
        history_id: latest.historyId,
        game_id: latest.gameId,
        folder_id: latest.folderId || null,
        host_id: currentUser.userId,
        quiz_title: latest.quizTitle,
        host_name: latest.hostName === 'Host' ? currentUser.name : latest.hostName || currentUser.name,
        total_participants: latest.totalParticipants,
        started_at: latest.startedAt,
        ended_at: latest.endedAt,
        winner_name: latest.winnerName || null,
        winner_score: latest.winnerScore ?? null,
        participants: latest.participants,
      }, { onConflict: 'game_id' });
      if (result.error) throw new Error(result.error.message);
    }
    history = nextHistory;
    emit({ type: 'HISTORY_UPDATED' });
  },

  async clearHistory() {
    if (!currentUser || currentUser.role !== 'host') {
      throw new Error('Only a host can clear quiz history.');
    }
    const result = await supabase.from('game_history').delete().eq('host_id', currentUser.userId);
    if (result.error) throw new Error(result.error.message);
    history = [];
    emit({ type: 'HISTORY_UPDATED' });
  },

  subscribe(callback: (event: any) => void) {
    listeners.add(callback);
    return () => { listeners.delete(callback); };
  },

  watchGame(gameId: string) {
    const registration = getGameChannel(gameId);
    registration.watchers += 1;
    if (registration.watchers === 1) {
      const channel = registration.channel;
      const refresh = () => {
        void this.refreshSharedState().catch(error => {
          console.error('[Realtime] Unable to refresh game state:', { gameId, error });
          emit({ type: 'REALTIME_ERROR' });
          if (typeof window !== 'undefined') window.dispatchEvent(new Event('supabase_realtime_error'));
        });
      };

      channel
        .on('broadcast', { event: 'game_state' }, ({ payload }) => {
          if (!payload?.game) return;
          activeGame = toGame(payload.game, activeGame?.quiz);
          if (Array.isArray(payload.participants)) {
            participants = (payload.participants as Row[]).map(row => row.participant_id ? toParticipant(row) : row as Participant);
            if (currentParticipant?.gameId === gameId) {
              currentParticipant = participants.find(item => item.participantId === currentParticipant?.participantId) || currentParticipant;
            }
          }
          if (Array.isArray(payload.responses)) responses = payload.responses as Response[];
          emit({ type: 'GAME_UPDATED', game: activeGame });
          emit({ type: 'PARTICIPANTS_UPDATED', participants });
          emit({ type: 'RESPONSES_UPDATED', responses });
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `game_id=eq.${gameId}` }, payload => {
          refresh();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_participants', filter: `game_id=eq.${gameId}` }, payload => {
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as Row;
          if (!row?.participant_id) return;
          if (payload.eventType === 'DELETE') {
            participants = participants.filter(item => item.participantId !== row.participant_id);
          } else {
            const updatedParticipant = toParticipant(row);
            const exists = participants.some(item => item.participantId === updatedParticipant.participantId);
            participants = exists
              ? participants.map(item => item.participantId === updatedParticipant.participantId ? updatedParticipant : item)
              : [...participants, updatedParticipant];
            if (currentParticipant?.participantId === updatedParticipant.participantId) {
              currentParticipant = updatedParticipant;
            }
          }
          emit({ type: 'PARTICIPANTS_UPDATED', participants });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_responses', filter: `game_id=eq.${gameId}` }, refresh)
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[Realtime] Game subscription error:', { gameId, status });
          emit({ type: 'REALTIME_ERROR' });
          if (typeof window !== 'undefined') window.dispatchEvent(new Event('supabase_realtime_error'));
        } else if (status === 'SUBSCRIBED' && typeof window !== 'undefined') {
          window.dispatchEvent(new Event('supabase_realtime_restored'));
        }
      });
    }

    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      registration.watchers -= 1;
      if (registration.watchers === 0 && gameChannels.get(gameId) === registration) {
        gameChannels.delete(gameId);
        void supabase.removeChannel(registration.channel);
      }
    };
  },
};
