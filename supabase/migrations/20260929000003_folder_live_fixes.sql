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

  select * into quiz_record
  from public.quizzes
  where quiz_id = p_quiz_id and host_id = auth.uid();
  if not found then raise exception 'Quiz not found'; end if;

  select coalesce(jsonb_agg(question - 'correctAnswer' order by ordinal), '[]'::jsonb)
  into safe_questions
  from jsonb_array_elements(quiz_record.questions) with ordinality as item(question, ordinal);

  insert into public.games (game_id, quiz_id, host_id, game_pin, quiz_snapshot)
  values (
    gen_random_uuid()::text,
    quiz_record.quiz_id,
    auth.uid(),
    p_game_pin,
    jsonb_build_object(
      'quizId', quiz_record.quiz_id,
      'hostId', quiz_record.host_id::text,
      'folderId', quiz_record.folder_id,
      'title', quiz_record.title,
      'description', quiz_record.description,
      'coverImage', quiz_record.cover_image,
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

  select * into game_record
  from public.games
  where game_pin = p_game_pin and status in ('waiting', 'question_active')
  for update;
  if not found then raise exception 'Invalid game PIN or game is not accepting participants'; end if;

  select * into participant_record
  from public.game_participants
  where game_id = game_record.game_id and user_id = auth.uid();

  if not found then
    if (select count(*) from public.game_participants where game_id = game_record.game_id) >= 100 then
      raise exception 'This game has reached the maximum limit of 100 participants';
    end if;

    insert into public.game_participants (game_id, user_id, nickname, avatar)
    values (game_record.game_id, auth.uid(), trim(p_nickname), p_avatar)
    on conflict (game_id, user_id) do update set avatar = excluded.avatar
    returning * into participant_record;
  end if;

  return jsonb_build_object(
    'game', to_jsonb(game_record),
    'participant', to_jsonb(participant_record)
  );
exception
  when unique_violation then
    raise exception 'This nickname is already in use in this game';
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
  quiz_questions jsonb;
  question_record jsonb;
  v_question_id text;
  v_correct_answer integer;
  timer_seconds numeric;
  difficulty_multiplier numeric;
  participant_rows jsonb;
begin
  select * into game_record
  from public.games
  where game_id = p_game_id
  for update;

  if not found then raise exception 'Game not found'; end if;
  if game_record.host_id <> auth.uid() and not public.is_admin() then
    raise exception 'Only the game host can reveal results';
  end if;

  if game_record.status = 'question_active' then
    select quiz.questions into quiz_questions
    from public.quizzes as quiz
    where quiz.quiz_id = game_record.quiz_id;

    question_record := coalesce(
      game_record.quiz_snapshot -> 'questions' -> game_record.current_question_index,
      quiz_questions -> game_record.current_question_index
    );
    v_question_id := question_record ->> 'id';
    v_correct_answer := nullif(
      quiz_questions -> game_record.current_question_index ->> 'correctAnswer',
      ''
    )::integer;

    if v_question_id is null then raise exception 'The current question could not be identified'; end if;
    if v_correct_answer is null then raise exception 'The correct answer could not be identified in the quiz'; end if;

    timer_seconds := greatest(1, (question_record ->> 'timerSeconds')::numeric);
    difficulty_multiplier := case question_record ->> 'difficulty'
      when 'Hard' then 2
      when 'Medium' then 1.5
      else 1
    end;

    update public.game_responses as response
    set is_correct = coalesce(response.selected_answer = v_correct_answer, false),
        points = case when response.selected_answer = v_correct_answer then round(
          (1000 + greatest(0, (timer_seconds - response.response_time) / timer_seconds) * 500)
          * difficulty_multiplier
        )::integer else 0 end
    where response.game_id = game_record.game_id
      and response.question_id = v_question_id;

    with participant_totals as (
      select participant.participant_id,
             coalesce(sum(response.points) filter (
               where not exists (
                 select 1
                 from jsonb_array_elements(coalesce(game_record.quiz_snapshot -> 'questions', '[]'::jsonb)) as item(question)
                 where item.question ->> 'id' = response.question_id
                   and coalesce((item.question ->> 'excludeFromFolderTotal')::boolean, false)
               )
             ), 0)::integer as total_score,
             count(*) filter (where response.is_correct)::integer as total_correct_answers
      from public.game_participants as participant
      left join public.game_responses as response
        on response.game_id = participant.game_id
       and response.participant_id = participant.participant_id
      where participant.game_id = game_record.game_id
      group by participant.participant_id
    )
    update public.game_participants as participant
    set score = participant_totals.total_score,
        correct_answers = participant_totals.total_correct_answers
    from participant_totals
    where participant.participant_id = participant_totals.participant_id;

    with ranked_participants as (
      select participant.participant_id,
             row_number() over (order by participant.score desc, participant.joined_at asc)::integer as position
      from public.game_participants as participant
      where participant.game_id = game_record.game_id
    )
    update public.game_participants as participant
    set rank = ranked_participants.position
    from ranked_participants
    where ranked_participants.participant_id = participant.participant_id;

    update public.games as game
    set status = 'question_result'
    where game.game_id = game_record.game_id
    returning game.* into game_record;
  elsif game_record.status <> 'question_result' then
    raise exception 'Question results cannot be revealed in the current game state';
  end if;

  select coalesce(jsonb_agg(to_jsonb(participant) order by participant.rank), '[]'::jsonb)
  into participant_rows
  from public.game_participants as participant
  where participant.game_id = game_record.game_id;

  return jsonb_build_object('game', to_jsonb(game_record), 'participants', participant_rows);
end;
$$;
