-- Create RPC to get users and their chaos settings safely (security definer)
create or replace function public.get_chaos_users()
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  select json_agg(
    json_build_object(
      'id', e.id,
      'user_id', e.user_id,
      'full_name', e.full_name,
      'email', e.email,
      'chaos', (
        select json_build_object(
          'user_id', cs.user_id,
          'logout_loop', cs.logout_loop,
          'flicker_page', cs.flicker_page,
          'virus_load', cs.virus_load,
          'slow_mode', cs.slow_mode,
          'clear_logs', cs.clear_logs,
          'crazy_bugs', cs.crazy_bugs
        )
        from public.chaos_settings cs
        where cs.user_id = e.user_id
      )
    )
  )
  into result
  from public.employees e;

  return coalesce(result, '[]'::json);
end;
$$;

-- Create RPC to update chaos settings safely (security definer)
create or replace function public.update_chaos_setting(
  p_user_id uuid,
  p_field text,
  p_value boolean
)
returns void
language plpgsql
security definer
as $$
begin
  if p_field = 'logout_loop' then
    insert into public.chaos_settings (user_id, logout_loop) values (p_user_id, p_value)
    on conflict (user_id) do update set logout_loop = excluded.logout_loop;
  elsif p_field = 'flicker_page' then
    insert into public.chaos_settings (user_id, flicker_page) values (p_user_id, p_value)
    on conflict (user_id) do update set flicker_page = excluded.flicker_page;
  elsif p_field = 'virus_load' then
    insert into public.chaos_settings (user_id, virus_load) values (p_user_id, p_value)
    on conflict (user_id) do update set virus_load = excluded.virus_load;
  elsif p_field = 'slow_mode' then
    insert into public.chaos_settings (user_id, slow_mode) values (p_user_id, p_value)
    on conflict (user_id) do update set slow_mode = excluded.slow_mode;
  elsif p_field = 'clear_logs' then
    insert into public.chaos_settings (user_id, clear_logs) values (p_user_id, p_value)
    on conflict (user_id) do update set clear_logs = excluded.clear_logs;
  elsif p_field = 'crazy_bugs' then
    insert into public.chaos_settings (user_id, crazy_bugs) values (p_user_id, p_value)
    on conflict (user_id) do update set crazy_bugs = excluded.crazy_bugs;
  else
    raise exception 'Invalid chaos field';
  end if;
end;
$$;
