create or replace function public.get_revealed_question_answer(p_game_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  game_record public.games%rowtype;
  answer_index integer;
begin
  select * into game_record
  from public.games as game
  where game.game_id = p_game_id;

  if not found then raise exception 'Game not found'; end if;
  if game_record.status <> 'question_result' then
    raise exception 'The correct answer is available after results are revealed';
  end if;
  if game_record.host_id <> auth.uid()
     and not public.is_game_member(p_game_id)
     and not public.is_admin() then
    raise exception 'You are not a member of this game';
  end if;

  select nullif(quiz.questions -> game_record.current_question_index ->> 'correctAnswer', '')::integer
  into answer_index
  from public.quizzes as quiz
  where quiz.quiz_id = game_record.quiz_id;

  if answer_index is null then raise exception 'The correct answer could not be found'; end if;
  return answer_index;
end;
$$;

revoke all on function public.get_revealed_question_answer(text) from public;
grant execute on function public.get_revealed_question_answer(text) to authenticated;
