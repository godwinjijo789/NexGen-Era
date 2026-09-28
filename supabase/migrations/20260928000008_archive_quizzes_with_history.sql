alter table public.quizzes
  add column if not exists is_archived boolean not null default false;