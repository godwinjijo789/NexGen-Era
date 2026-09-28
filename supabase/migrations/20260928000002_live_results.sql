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
  question_id text;
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
    select q.questions
      into quiz_questions
    from public.quizzes q
    where q.quiz_id = game_record.quiz_id;

    question_record := coalesce(
      game_record.quiz_snapshot -> 'questions' -> game_record.current_question_index,
      quiz_questions -> game_record.current_question_index
    );
    question_id := question_record ->> 'id';

    if question_id is null then
      raise exception 'The current question could not be identified';
    end if;

    update public.game_participants participant
    set score = participant.score + answer.points,
        correct_answers = participant.correct_answers + case when answer.is_correct then 1 else 0 end
    from public.game_responses answer
    where answer.game_id = game_record.game_id
      and answer.question_id = question_id
      and answer.participant_id = participant.participant_id;

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
