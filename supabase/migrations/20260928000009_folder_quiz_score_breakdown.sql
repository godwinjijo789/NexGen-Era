alter table public.game_history
  add column if not exists quiz_breakdown jsonb not null default '[]'::jsonb;