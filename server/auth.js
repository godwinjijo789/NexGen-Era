import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const candidate = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
}

function sanitizeUser(row) {
  if (!row) return null;

  return {
    userId: row.userId,
    name: row.name,
    email: row.email,
    role: row.role,
    participantId: row.participantId || undefined,
    avatar: row.avatar || undefined,
    createdAt: row.createdAt,
    isDisabled: Boolean(row.isDisabled),
  };
}

export function createAuthService(databasePath = process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'nexgen.db')) {
  const directory = path.dirname(databasePath);
  fs.mkdirSync(directory, { recursive: true });

  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      userId TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      passwordSalt TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('host', 'participant', 'admin')),
      participantId TEXT,
      avatar TEXT,
      createdAt TEXT NOT NULL,
      isDisabled INTEGER NOT NULL DEFAULT 0
    );
  `);

  function register({ name, email, password, role = 'participant', participantId, avatar }) {
    const trimmedName = String(name || '').trim();
    const trimmedEmail = String(email || '').trim().toLowerCase();
    const trimmedPassword = String(password || '');

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      throw new Error('Name, email, and password are required.');
    }

    if (!['host', 'participant', 'admin'].includes(role)) {
      throw new Error('Invalid role selected.');
    }

    const existing = db.prepare('SELECT 1 FROM users WHERE lower(email) = lower(?)').get(trimmedEmail);
    if (existing) {
      throw new Error('Email is already registered.');
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { salt, hash } = hashPassword(trimmedPassword);
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (userId, name, email, passwordHash, passwordSalt, role, participantId, avatar, createdAt, isDisabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      userId,
      trimmedName,
      trimmedEmail,
      hash,
      salt,
      role,
      participantId || null,
      avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(trimmedName)}`,
      createdAt,
    );

    const row = db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
    return sanitizeUser(row);
  }

  function login({ email, password }) {
    const trimmedEmail = String(email || '').trim().toLowerCase();
    const trimmedPassword = String(password || '');

    if (!trimmedEmail || !trimmedPassword) {
      return null;
    }

    const row = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(trimmedEmail);
    if (!row) {
      return null;
    }

    if (row.isDisabled) {
      return null;
    }

    const isValid = verifyPassword(trimmedPassword, row.passwordSalt, row.passwordHash);
    if (!isValid) {
      return null;
    }

    return sanitizeUser(row);
  }

  function getUserByEmail(email) {
    return sanitizeUser(db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(String(email || '').trim()));
  }

  function listUsers() {
    return db.prepare('SELECT * FROM users ORDER BY createdAt DESC').all().map(sanitizeUser);
  }

  return {
    register,
    login,
    getUserByEmail,
    listUsers,
  };
}

export default createAuthService;
