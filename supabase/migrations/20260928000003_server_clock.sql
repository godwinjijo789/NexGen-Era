create or replace function public.get_server_time()
returns timestamptz
language sql
stable
as $$
  select clock_timestamp();
$$;

grant execute on function public.get_server_time() to authenticated;
