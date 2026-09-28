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

  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('fetch') || message.includes('network')) {
    return 'Could not connect to Supabase. Check your connection and try again.';
  }
  if (message.includes('duplicate') || message.includes('already')) {
    return 'That value is already in use. Please choose another.';
  }
  if (message.includes('invalid game pin') || message.includes('game not found')) {
    return 'That game PIN is invalid or the game is no longer accepting players.';
  }
  if (message.includes('nickname')) {
    return 'That nickname is already in use in this game.';
  }

  return fallback;
};
