create or replace function public.reveal_game_results(p_game_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  game_record public.games%rowtype;
  question_record jsonb;
  question_id text;
  correct_answer integer;
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
    question_record := game_record.quiz_snapshot -> 'questions' -> game_record.current_question_index;
    question_id := question_record ->> 'id';
    if question_id is null then
      raise exception 'The current question could not be identified';
    end if;

    correct_answer := (question_record ->> 'correctAnswer')::integer;
    timer_seconds := greatest(1, (question_record ->> 'timerSeconds')::numeric);
    difficulty_multiplier := case question_record ->> 'difficulty'
      when 'Hard' then 2
      when 'Medium' then 1.5
      else 1
    end;

    update public.game_responses response
    set is_correct = response.selected_answer = correct_answer,
        points = case when response.selected_answer = correct_answer then round(
          (1000 + greatest(0, (timer_seconds - response.response_time) / timer_seconds) * 500)
          * difficulty_multiplier
        )::integer else 0 end
    where response.game_id = game_record.game_id
      and response.question_id = question_id;

    update public.game_participants participant
    set score = participant.score + response.points,
        correct_answers = participant.correct_answers + case when response.is_correct then 1 else 0 end
    from public.game_responses response
    where response.game_id = game_record.game_id
      and response.question_id = question_id
      and response.participant_id = participant.participant_id;

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