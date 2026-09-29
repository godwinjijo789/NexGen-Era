alter table public.quizzes add column cover_image text;

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