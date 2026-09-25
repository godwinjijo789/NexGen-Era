import { User, Quiz, GameSession, Participant, Response, GameHistoryRecord } from '../types';

const CHANNEL_NAME = 'quizarena_sync_channel';
const broadcastChannel = typeof window !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
const DEFAULT_API_BASE_URL = 'https://nexgen-era-api.onrender.com';

export const getApiBaseUrl = () => {
  const configuredValue = String((import.meta as any).env?.VITE_API_URL || '').trim();
  const isPlaceholder = configuredValue.includes('your-deployed-backend-url.com') || configuredValue.includes('your-api.example.com');
  const configured = isPlaceholder || !configuredValue
    ? (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? window.location.origin : DEFAULT_API_BASE_URL)
    : configuredValue;
  return configured.replace(/\/$/, '');
};

const emitLocalSync = (payload: any) => {
  if (typeof window === 'undefined') return;
  broadcastChannel?.postMessage(payload);
  window.dispatchEvent(new CustomEvent('quizarena_local_sync', { detail: payload }));
};

const syncToServer = async (endpoint: string, data: unknown, method = 'POST') => {
  if (typeof window === 'undefined') return;

  try {
    await fetch(`${getApiBaseUrl()}/api/game/${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  } catch {
    // Ignore server sync failures so local browser flow still works when no shared backend is available.
  }
};

// Initial Seed Data (Empty as requested)
const DEFAULT_USERS: User[] = [];

const DEFAULT_QUIZZES: Quiz[] = [];


export const normalizeGamePin = (value: unknown): string => {
  return String(value ?? '').replace(/\D/g, '').slice(0, 6);
};

// Helper to get stored items
export const StorageDB = {
  getUsers(): User[] {
    const data = localStorage.getItem('quizarena_users');
    if (!data) {
      localStorage.setItem('quizarena_users', JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_USERS;
    }
  },

  saveUsers(users: User[]) {
    localStorage.setItem('quizarena_users', JSON.stringify(users));
    emitLocalSync({ type: 'USERS_UPDATED' });
  },

  getCurrentUser(): User | null {
    const data = localStorage.getItem('quizarena_current_user');
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  setCurrentUser(user: User | null) {
    if (user) {
      localStorage.setItem('quizarena_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('quizarena_current_user');
    }
    emitLocalSync({ type: 'CURRENT_USER_UPDATED' });
  },

  getQuizzes(): Quiz[] {
    const data = localStorage.getItem('quizarena_quizzes');
    if (!data) {
      localStorage.setItem('quizarena_quizzes', JSON.stringify([]));
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      // Filter out sample quizzes if any exist from older sessions
      const clean = parsed.filter((q: Quiz) => !q.title.includes('World Geography') && !q.title.includes('JavaScript & Web'));
      if (clean.length !== parsed.length) {
        localStorage.setItem('quizarena_quizzes', JSON.stringify(clean));
      }
      return clean;
    } catch {
      return [];
    }
  },

  saveQuizzes(quizzes: Quiz[]) {
    localStorage.setItem('quizarena_quizzes', JSON.stringify(quizzes));
    emitLocalSync({ type: 'QUIZZES_UPDATED' });
  },

  getActiveGame(): GameSession | null {
    const data = localStorage.getItem('quizarena_active_game');
    if (!data) return null;
    try {
      const parsed = JSON.parse(data) as GameSession | null;
      if (!parsed) return null;

      const sanitizedGame = {
        ...parsed,
        gamePin: normalizeGamePin(parsed.gamePin)
      };

      if (sanitizedGame.gamePin !== parsed.gamePin) {
        localStorage.setItem('quizarena_active_game', JSON.stringify(sanitizedGame));
      }

      return sanitizedGame;
    } catch {
      return null;
    }
  },

  setActiveGame(game: GameSession | null) {
    if (game) {
      const normalizedGame = {
        ...game,
        gamePin: normalizeGamePin(game.gamePin)
      };

      localStorage.setItem('quizarena_active_game', JSON.stringify(normalizedGame));
      void syncToServer('active', normalizedGame, 'POST');
      emitLocalSync({ type: 'GAME_UPDATED', game: normalizedGame });
      return;
    }

    localStorage.removeItem('quizarena_active_game');
    localStorage.removeItem('quizarena_participants');
    localStorage.removeItem('quizarena_responses');
    void syncToServer('active', null, 'POST');
    emitLocalSync({ type: 'GAME_UPDATED', game: null });
  },

  getParticipants(): Participant[] {
    const data = localStorage.getItem('quizarena_participants');
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  async refreshSharedState() {
    if (typeof window === 'undefined') return;

    try {
      const [gameRes, participantsRes, responsesRes] = await Promise.all([
        fetch(`${getApiBaseUrl()}/api/game/active`),
        fetch(`${getApiBaseUrl()}/api/game/participants`),
        fetch(`${getApiBaseUrl()}/api/game/responses`)
      ]);

      const gamePayload = await gameRes.json().catch(() => ({ activeGame: null }));
      const participantsPayload = await participantsRes.json().catch(() => ({ participants: [] }));
      const responsesPayload = await responsesRes.json().catch(() => ({ responses: [] }));

      if (gamePayload.activeGame) {
        localStorage.setItem('quizarena_active_game', JSON.stringify(gamePayload.activeGame));
      }

      if (Array.isArray(participantsPayload.participants)) {
        localStorage.setItem('quizarena_participants', JSON.stringify(participantsPayload.participants));
      }

      if (Array.isArray(responsesPayload.responses)) {
        localStorage.setItem('quizarena_responses', JSON.stringify(responsesPayload.responses));
      }

      emitLocalSync({ type: 'GAME_UPDATED', game: gamePayload.activeGame ?? null });
      emitLocalSync({ type: 'PARTICIPANTS_UPDATED', participants: Array.isArray(participantsPayload.participants) ? participantsPayload.participants : [] });
      emitLocalSync({ type: 'RESPONSES_UPDATED', responses: Array.isArray(responsesPayload.responses) ? responsesPayload.responses : [] });
    } catch {
      // Silent fallback: local browser state remains authoritative if shared backend is unavailable.
    }
  },

  saveParticipants(participants: Participant[]) {
    localStorage.setItem('quizarena_participants', JSON.stringify(participants));
    void syncToServer('participants', participants, 'POST');
    emitLocalSync({ type: 'PARTICIPANTS_UPDATED', participants });
  },

  getResponses(): Response[] {
    const data = localStorage.getItem('quizarena_responses');
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveResponses(responses: Response[]) {
    localStorage.setItem('quizarena_responses', JSON.stringify(responses));
    void syncToServer('responses', responses, 'POST');
    emitLocalSync({ type: 'RESPONSES_UPDATED', responses });
  },

  getHistory(): GameHistoryRecord[] {
    const data = localStorage.getItem('quizarena_history');
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveHistory(history: GameHistoryRecord[]) {
    localStorage.setItem('quizarena_history', JSON.stringify(history));
    emitLocalSync({ type: 'HISTORY_UPDATED' });
  },

  // Helper listener for cross-tab sync
  subscribe(callback: (event: any) => void) {
    const messageListener = (event: MessageEvent | CustomEvent) => {
      const payload = 'detail' in event ? event.detail : event.data;
      if (payload) callback(payload);
    };

    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', messageListener as EventListener);
    }

    const storageListener = (e: StorageEvent) => {
      if (e.key?.startsWith('quizarena_')) {
        callback({ type: 'STORAGE_CHANGED', key: e.key });
      }
    };

    window.addEventListener('storage', storageListener);
    window.addEventListener('quizarena_local_sync', messageListener as EventListener);

    return () => {
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', messageListener as EventListener);
      }
      window.removeEventListener('storage', storageListener);
      window.removeEventListener('quizarena_local_sync', messageListener as EventListener);
    };
  }
};
