create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Player',
  email text,
  role text not null default 'participant' check (role in ('host', 'participant', 'admin')),
  participant_id text,
  avatar text,
  is_disabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.quizzes (
  quiz_id text primary key,
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  stream text not null default 'General',
  subject text,
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  show_question_and_answers_to_participants boolean not null default true,
  show_media_to_participants boolean not null default true,
  questions jsonb not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.games (
  game_id text primary key,
  quiz_id text not null references public.quizzes(quiz_id) on delete restrict,
  host_id uuid not null references public.profiles(id) on delete cascade,
  game_pin text not null check (game_pin ~ '^[0-9]{6}$'),
  status text not null default 'waiting' check (status in ('waiting', 'question_active', 'question_result', 'leaderboard', 'finished')),
  current_question_index integer not null default 0 check (current_question_index >= 0),
  question_start_time timestamptz,
  quiz_snapshot jsonb not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.game_participants (
  participant_id text primary key default gen_random_uuid()::text,
  game_id text not null references public.games(game_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (length(trim(nickname)) between 1 and 40),
  nickname_key text generated always as (lower(trim(nickname))) stored,
  student_id text,
  avatar text,
  score integer not null default 0,
  correct_answers integer not null default 0,
  rank integer not null default 0,
  joined_at timestamptz not null default now(),
  is_online boolean not null default true,
  unique (game_id, nickname_key),
  unique (game_id, user_id)
);

create table public.game_responses (
  response_id text primary key default gen_random_uuid()::text,
  game_id text not null references public.games(game_id) on delete cascade,
  participant_id text not null references public.game_participants(participant_id) on delete cascade,
  question_id text not null,
  selected_answer integer not null,
  is_correct boolean not null,
  response_time numeric(7, 2) not null check (response_time >= 0),
  points integer not null default 0,
  submitted_at timestamptz not null default now(),
  unique (game_id, participant_id, question_id)
);

create table public.game_history (
  history_id text primary key default gen_random_uuid()::text,
  game_id text not null unique references public.games(game_id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  quiz_title text not null,
  host_name text not null,
  total_participants integer not null default 0,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  winner_name text,
  winner_score integer,
  participants jsonb not null default '[]'::jsonb
);

create index quizzes_host_created_idx on public.quizzes (host_id, created_at desc);
create index games_host_status_idx on public.games (host_id, status, updated_at desc);
create index games_pin_status_idx on public.games (game_pin, status);
create index participants_user_game_idx on public.game_participants (user_id, game_id);
create index responses_game_question_idx on public.game_responses (game_id, question_id);
create index history_host_started_idx on public.game_history (host_id, started_at desc);
create unique index games_one_open_per_host_idx on public.games (host_id) where status <> 'finished';
create unique index games_open_pin_idx on public.games (game_pin) where status <> 'finished';

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger quizzes_touch_updated_at before update on public.quizzes
for each row execute function public.touch_updated_at();
create trigger games_touch_updated_at before update on public.games
for each row execute function public.touch_updated_at();

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = check_user_id and role = 'admin' and not is_disabled
  );
$$;

create or replace function public.is_game_host(check_game_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.games
    where game_id = check_game_id and host_id = auth.uid()
  );
$$;

create or replace function public.is_game_member(check_game_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.game_participants
    where game_id = check_game_id and user_id = auth.uid()
  );
$$;

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (id, name, email, role, participant_id, avatar)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), 'Player'),
    new.email,
    case when requested_role = 'host' then 'host' else 'participant' end,
    nullif(new.raw_user_meta_data ->> 'participantId', ''),
    nullif(new.raw_user_meta_data ->> 'avatar', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_auth_user();

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() <> old.id and not public.is_admin() then
    raise exception 'Not authorized to modify this profile';
  end if;
  if auth.uid() = old.id and not public.is_admin() then
    if new.role is distinct from old.role or new.is_disabled is distinct from old.is_disabled then
      raise exception 'Role and account status cannot be changed by the account owner';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_privileges before update on public.profiles
for each row execute function public.protect_profile_privileges();

create or replace function public.start_game(p_quiz_id text, p_game_pin text)
returns public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  quiz_record public.quizzes%rowtype;
  game_record public.games%rowtype;
  safe_questions jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('host', 'admin') and not is_disabled
  ) then raise exception 'Host access required'; end if;
  if p_game_pin !~ '^[0-9]{6}$' then raise exception 'Invalid game PIN'; end if;

  select * into quiz_record from public.quizzes
  where quiz_id = p_quiz_id and host_id = auth.uid();
  if not found then raise exception 'Quiz not found'; end if;

  select coalesce(jsonb_agg(question - 'correctAnswer' order by ordinal), '[]'::jsonb)
    into safe_questions
  from jsonb_array_elements(quiz_record.questions) with ordinality as item(question, ordinal);

  insert into public.games (
    game_id, quiz_id, host_id, game_pin, quiz_snapshot
  ) values (
    gen_random_uuid()::text,
    quiz_record.quiz_id,
    auth.uid(),
    p_game_pin,
    jsonb_build_object(
      'quizId', quiz_record.quiz_id,
      'hostId', quiz_record.host_id::text,
      'title', quiz_record.title,
      'description', quiz_record.description,
      'stream', quiz_record.stream,
      'subject', quiz_record.subject,
      'difficulty', quiz_record.difficulty,
      'showQuestionAndAnswersToParticipants', quiz_record.show_question_and_answers_to_participants,
      'showMediaToParticipants', quiz_record.show_media_to_participants,
      'questions', safe_questions,
      'createdAt', quiz_record.created_at
    )
  ) returning * into game_record;

  return game_record;
end;
$$;

create or replace function public.join_game(p_game_pin text, p_nickname text, p_avatar text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  game_record public.games%rowtype;
  participant_record public.game_participants%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and not is_disabled) then
    raise exception 'Account unavailable';
  end if;
  if length(trim(coalesce(p_nickname, ''))) not between 1 and 40 then
    raise exception 'Enter a nickname between 1 and 40 characters';
  end if;

  select * into game_record from public.games
  where game_pin = p_game_pin and status = 'waiting'
  for update;
  if not found then raise exception 'Invalid game PIN or game not found'; end if;

  if (select count(*) from public.game_participants where game_id = game_record.game_id) >= 100 then
    raise exception 'This game has reached the maximum limit of 100 participants';
  end if;

  insert into public.game_participants (game_id, user_id, nickname, avatar)
  values (game_record.game_id, auth.uid(), trim(p_nickname), p_avatar)
  returning * into participant_record;

  return jsonb_build_object(
    'game', to_jsonb(game_record),
    'participant', to_jsonb(participant_record)
  );
exception
  when unique_violation then
    raise exception 'This nickname is already in use in this game, or this account has already joined';
end;
$$;

create or replace function public.submit_game_response(
  p_game_id text,
  p_participant_id text,
  p_selected_answer integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  game_record public.games%rowtype;
  participant_record public.game_participants%rowtype;
  quiz_record public.quizzes%rowtype;
  question_record jsonb;
  response_record public.game_responses%rowtype;
  correct_answer integer;
  timer_seconds numeric;
  elapsed_seconds numeric;
  earned_points integer;
  answer_is_correct boolean;
begin
  select * into game_record from public.games
  where game_id = p_game_id and status = 'question_active';
  if not found then raise exception 'This question is no longer accepting answers'; end if;

  select * into participant_record from public.game_participants
  where participant_id = p_participant_id and game_id = p_game_id and user_id = auth.uid();
  if not found then raise exception 'Participant not found for this game'; end if;

  select * into quiz_record from public.quizzes where quiz_id = game_record.quiz_id;
  question_record := quiz_record.questions -> game_record.current_question_index;
  if question_record is null then raise exception 'Question not found'; end if;
  correct_answer := (question_record ->> 'correctAnswer')::integer;
  timer_seconds := greatest(1, (question_record ->> 'timerSeconds')::numeric);
  if p_selected_answer < 0 or p_selected_answer >= jsonb_array_length(question_record -> 'options') then
    raise exception 'Invalid answer selection';
  end if;

  elapsed_seconds := greatest(0, extract(epoch from clock_timestamp() - game_record.question_start_time));
  if elapsed_seconds > timer_seconds then raise exception 'The answer timer has expired'; end if;
  answer_is_correct := p_selected_answer = correct_answer;
  earned_points := case when answer_is_correct then round(
    (1000 + greatest(0, (timer_seconds - elapsed_seconds) / timer_seconds) * 500)
    * case question_record ->> 'difficulty' when 'Hard' then 2 when 'Medium' then 1.5 else 1 end
  )::integer else 0 end;

  insert into public.game_responses (
    game_id, participant_id, question_id, selected_answer, is_correct, response_time, points
  ) values (
    p_game_id,
    participant_record.participant_id,
    question_record ->> 'id',
    p_selected_answer,
    answer_is_correct,
    elapsed_seconds,
    earned_points
  ) returning * into response_record;

  return jsonb_build_object('submitted', true);
exception
  when unique_violation then
    raise exception 'An answer has already been submitted for this question';
end;
$$;

create or replace function public.get_game_responses(p_game_id text)
returns setof jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  game_status text;
  requester_is_host boolean;
begin
  select status, host_id = auth.uid() into game_status, requester_is_host
  from public.games where game_id = p_game_id;
  if not found then raise exception 'Game not found'; end if;
  if not requester_is_host and not public.is_game_member(p_game_id) and not public.is_admin() then
    raise exception 'Not a participant in this game';
  end if;

  return query
  select case
    when not requester_is_host and not public.is_admin() and game_status = 'question_active'
      then jsonb_build_object(
        'response_id', r.response_id,
        'game_id', r.game_id,
        'participant_id', r.participant_id,
        'question_id', r.question_id,
        'selected_answer', r.selected_answer,
        'is_correct', false,
        'response_time', r.response_time,
        'points', 0,
        'submitted_at', r.submitted_at
      )
    else to_jsonb(r)
  end
  from public.game_responses r
  where r.game_id = p_game_id
    and (
      requester_is_host or public.is_admin() or game_status <> 'question_active'
      or exists (
        select 1 from public.game_participants p
        where p.participant_id = r.participant_id and p.user_id = auth.uid()
      )
    )
  order by r.submitted_at;
end;
$$;

create or replace function public.reveal_game_results(p_game_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  game_record public.games%rowtype;
  question_id text;
  participant_rows jsonb;
begin
  select * into game_record from public.games
  where game_id = p_game_id
  for update;
  if not found then raise exception 'Game not found'; end if;
  if game_record.host_id <> auth.uid() and not public.is_admin() then
    raise exception 'Only the game host can reveal results';
  end if;

  if game_record.status = 'question_active' then
    question_id := game_record.quiz_snapshot -> 'questions' -> game_record.current_question_index ->> 'id';

    update public.game_participants p
    set score = p.score + response.points,
        correct_answers = p.correct_answers + case when response.is_correct then 1 else 0 end
    from public.game_responses response
    where response.game_id = game_record.game_id
      and response.question_id = question_id
      and response.participant_id = p.participant_id;

    with ranked as (
      select participant_id, row_number() over (order by score desc, joined_at asc) as place
      from public.game_participants
      where game_id = game_record.game_id
    )
    update public.game_participants p
    set rank = ranked.place
    from ranked
    where ranked.participant_id = p.participant_id;

    update public.games set status = 'question_result'
    where game_id = game_record.game_id
    returning * into game_record;
  elsif game_record.status <> 'question_result' then
    raise exception 'Question results cannot be revealed in the current game state';
  end if;

  select coalesce(jsonb_agg(to_jsonb(p) order by p.rank), '[]'::jsonb)
  into participant_rows
  from public.game_participants p
  where p.game_id = game_record.game_id;

  return jsonb_build_object('game', to_jsonb(game_record), 'participants', participant_rows);
end;
$$;

alter table public.profiles enable row level security;
alter table public.quizzes enable row level security;
alter table public.games enable row level security;
alter table public.game_participants enable row level security;
alter table public.game_responses enable row level security;
alter table public.game_history enable row level security;

create policy profiles_read_self_or_admin on public.profiles
for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_self_or_admin on public.profiles
for update to authenticated using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy quizzes_read_owner_or_admin on public.quizzes
for select to authenticated using (host_id = auth.uid() or public.is_admin());
create policy quizzes_insert_owner on public.quizzes
for insert to authenticated with check (host_id = auth.uid());
create policy quizzes_update_owner on public.quizzes
for update to authenticated using (host_id = auth.uid() or public.is_admin())
with check (host_id = auth.uid() or public.is_admin());
create policy quizzes_delete_owner on public.quizzes
for delete to authenticated using (host_id = auth.uid() or public.is_admin());

create policy games_read_host_or_member on public.games
for select to authenticated using (host_id = auth.uid() or public.is_admin() or public.is_game_member(game_id));
create policy games_update_host on public.games
for update to authenticated using (host_id = auth.uid() or public.is_admin())
with check (host_id = auth.uid() or public.is_admin());

create policy participants_read_game_members on public.game_participants
for select to authenticated using (public.is_game_host(game_id) or public.is_game_member(game_id) or public.is_admin());
create policy responses_read_host_or_after_question on public.game_responses
for select to authenticated using (
  public.is_game_host(game_id) or public.is_admin() or (
    public.is_game_member(game_id) and exists (
      select 1 from public.games g where g.game_id = game_responses.game_id and g.status <> 'question_active'
    )
  )
);

create policy history_read_host_or_admin on public.game_history
for select to authenticated using (host_id = auth.uid() or public.is_admin());
create policy history_insert_host on public.game_history
for insert to authenticated with check (host_id = auth.uid());
create policy history_update_host on public.game_history
for update to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());

revoke all on function public.start_game(text, text) from public;
revoke all on function public.join_game(text, text, text) from public;
revoke all on function public.submit_game_response(text, text, integer) from public;
revoke all on function public.get_game_responses(text) from public;
revoke all on function public.reveal_game_results(text) from public;
grant execute on function public.start_game(text, text) to authenticated;
grant execute on function public.join_game(text, text, text) to authenticated;
grant execute on function public.submit_game_response(text, text, integer) to authenticated;
grant execute on function public.get_game_responses(text) to authenticated;
grant execute on function public.reveal_game_results(text) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.is_game_host(text) to authenticated;
grant execute on function public.is_game_member(text) to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.quizzes to authenticated;
grant select, insert, update, delete on public.games to authenticated;
grant select, insert, update, delete on public.game_participants to authenticated;
grant select, insert, update, delete on public.game_responses to authenticated;
grant select, insert, update, delete on public.game_history to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['games', 'game_participants', 'game_responses'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;
