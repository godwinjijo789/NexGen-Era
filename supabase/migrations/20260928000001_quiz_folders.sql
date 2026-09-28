create table if not exists public.quiz_folders (
  folder_id text primary key default gen_random_uuid()::text,
  host_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  aggregate_scores boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (host_id, name)
);

alter table public.quizzes
  add column if not exists folder_id text references public.quiz_folders(folder_id) on delete set null;

alter table public.game_history
  add column if not exists folder_id text references public.quiz_folders(folder_id) on delete set null;

create index if not exists game_history_folder_idx
  on public.game_history (folder_id, started_at desc);

create index if not exists quiz_folders_host_created_idx
  on public.quiz_folders (host_id, created_at desc);
create index if not exists quizzes_folder_idx
  on public.quizzes (folder_id, created_at desc);

create trigger quiz_folders_touch_updated_at
  before update on public.quiz_folders
  for each row execute function public.touch_updated_at();

alter table public.quiz_folders enable row level security;

create policy quiz_folders_read_owner_or_admin on public.quiz_folders
  for select to authenticated
  using (host_id = auth.uid() or public.is_admin());

create policy quiz_folders_insert_owner on public.quiz_folders
  for insert to authenticated
  with check (host_id = auth.uid());

create policy quiz_folders_update_owner_or_admin on public.quiz_folders
  for update to authenticated
  using (host_id = auth.uid() or public.is_admin())
  with check (host_id = auth.uid() or public.is_admin());

create policy quiz_folders_delete_owner_or_admin on public.quiz_folders
  for delete to authenticated
  using (host_id = auth.uid() or public.is_admin());

grant select, insert, update, delete on public.quiz_folders to authenticated;
