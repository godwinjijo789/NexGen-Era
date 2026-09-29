alter table public.quizzes
  add column if not exists separate_score boolean not null default false;

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

  if not found then
    raise exception 'Game not found';
  end if;

  if game_record.host_id <> auth.uid() and not public.is_admin() then
    raise exception 'Only the game host can reveal results';
  end if;

  if game_record.status = 'question_active' then
    select questions into quiz_questions
    from public.quizzes
    where quiz_id = game_record.quiz_id;

    question_record := coalesce(
      game_record.quiz_snapshot -> 'questions' -> game_record.current_question_index,
      quiz_questions -> game_record.current_question_index
    );
    v_question_id := question_record ->> 'id';
    v_correct_answer := nullif(
      quiz_questions -> game_record.current_question_index ->> 'correctAnswer',
      ''
    )::integer;

    if v_question_id is null then
      raise exception 'The current question could not be identified';
    end if;
    if v_correct_answer is null then
      raise exception 'The correct answer could not be identified in the quiz';
    end if;

    timer_seconds := greatest(1, (question_record ->> 'timerSeconds')::numeric);
    difficulty_multiplier := case question_record ->> 'difficulty'
      when 'Hard' then 2
      when 'Medium' then 1.5
      else 1
    end;

    update public.game_responses response
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
      from public.game_participants participant
      left join public.game_responses response
        on response.game_id = participant.game_id
       and response.participant_id = participant.participant_id
      where participant.game_id = game_record.game_id
      group by participant.participant_id
    )
    update public.game_participants participant
    set score = participant_totals.total_score,
        correct_answers = participant_totals.total_correct_answers
    from participant_totals
    where participant.participant_id = participant_totals.participant_id;

    with ranked_participants as (
      select participant_id,
             row_number() over (order by score desc, joined_at asc)::integer as position
      from public.game_participants
      where game_id = game_record.game_id
    )
    update public.game_participants participant
    set rank = ranked_participants.position
    from ranked_participants
    where ranked_participants.participant_id = participant.participant_id;

    update public.games
    set status = 'question_result'
    where game_id = game_record.game_id
    returning * into game_record;
  elsif game_record.status <> 'question_result' then
    raise exception 'Question results cannot be revealed in the current game state';
  end if;

  select coalesce(jsonb_agg(to_jsonb(participant) order by participant.rank), '[]'::jsonb)
  into participant_rows
  from public.game_participants participant
  where participant.game_id = game_record.game_id;

  return jsonb_build_object(
    'game', to_jsonb(game_record),
    'participants', participant_rows
  );
end;
$$;

revoke all on function public.reveal_game_results(text) from public;
grant execute on function public.reveal_game_results(text) to authenticated;
