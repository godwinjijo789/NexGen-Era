import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAuthService } from './auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const authService = createAuthService(process.env.DB_PATH || path.resolve(__dirname, 'data', 'nexgen.db'));
const gameStore = {
  activeGame: null,
  participants: [],
  responses: [],
};

const PORT = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'nexgen-auth' });
});

app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, role, participantId, avatar } = req.body || {};
    const user = authService.register({
      name,
      email,
      password,
      role,
      participantId,
      avatar,
    });

    res.status(201).json({ user });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Registration failed.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = authService.login({ email, password });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Login failed.' });
  }
});

app.get('/api/users', (_req, res) => {
  const users = authService.listUsers();
  res.json({ users });
});

app.get('/api/game/active', (_req, res) => {
  res.json({ activeGame: gameStore.activeGame });
});

app.post('/api/game/active', (req, res) => {
  const game = req.body || null;
  gameStore.activeGame = game;
  if (!game) {
    gameStore.participants = [];
    gameStore.responses = [];
  }
  res.json({ activeGame: gameStore.activeGame });
});

app.delete('/api/game/active', (_req, res) => {
  gameStore.activeGame = null;
  gameStore.participants = [];
  gameStore.responses = [];
  res.json({ activeGame: null });
});

app.get('/api/game/participants', (_req, res) => {
  res.json({ participants: gameStore.participants });
});

app.post('/api/game/participants', (req, res) => {
  const participants = Array.isArray(req.body) ? req.body : [];
  gameStore.participants = participants;
  res.json({ participants: gameStore.participants });
});

app.get('/api/game/responses', (_req, res) => {
  res.json({ responses: gameStore.responses });
});

app.post('/api/game/responses', (req, res) => {
  const responses = Array.isArray(req.body) ? req.body : [];
  gameStore.responses = responses;
  res.json({ responses: gameStore.responses });
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Auth API running on http://localhost:${PORT}`);
});
