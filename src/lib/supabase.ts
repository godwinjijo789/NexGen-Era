import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || 'https://missing-project.supabase.co',
  supabaseAnonKey || 'missing-anon-key',
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  },
);

export const getSupabaseErrorMessage = (error: unknown, fallback: string): string => {
  if (!isSupabaseConfigured) {
    return 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.';
  }

  const errorDetails = error && typeof error === 'object'
    ? error as { message?: unknown; code?: unknown }
    : {};
  const message = typeof errorDetails.message === 'string' ? errorDetails.message.toLowerCase() : '';
  const code = typeof errorDetails.code === 'string' ? errorDetails.code : '';
  if (code === 'PGRST202' || message.includes('could not find the function')) {
    return 'The Supabase results function is not installed yet. Apply the latest SQL migration in the Supabase SQL Editor.';
  }
  if (code === '42501' || message.includes('only the game host')) {
    return 'Only the host account that started this game can reveal its results. Sign in to the original host account.';
  }
  if (message.includes('question not found') || message.includes('question could not be identified')) {
    return 'The current quiz question could not be found. Check the quiz data and try again.';
  }
  if (message.includes('question results cannot be revealed')) {
    return 'The game has already moved to another state. Refresh the host page to synchronize it.';
  }
  if (message.includes('fetch') || message.includes('network')) {
    return 'Could not connect to Supabase. Check your connection and try again.';
  }
  if (message.includes('anonymous') && (message.includes('disabled') || message.includes('not enabled'))) {
    return 'Guest joining is not enabled for this Supabase project. Enable Anonymous Sign-Ins under Authentication settings, then try again.';
  }
  if (message.includes('duplicate') || message.includes('already')) {
    return 'That value is already in use. Please choose another.';
  }
  if (message.includes('game not found')) {
    return 'This live game could not be found. Refresh the host page and try again.';
  }
  if (message.includes('invalid game pin')) {
    return 'That game PIN is invalid or the game is no longer accepting players.';
  }
  if (message.includes('participant not found')) {
    return 'Your participant session could not be found. Rejoin the game with its PIN.';
  }
  if (message.includes('nickname')) {
    return 'That nickname is already in use in this game.';
  }

  return fallback;
};
