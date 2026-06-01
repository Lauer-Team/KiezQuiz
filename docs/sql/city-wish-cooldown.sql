-- Stadt-Wünsche: pro Stadt max. 1× alle 23 Stunden (Account oder Gast-Gerät).
-- Nach bestehendem Schema ausführen (SUPABASE-SETUP.md §2b).

-- Direkte Inserts schließen — nur noch über submit_city_wish
drop policy if exists "wish_insert" on public.city_wish_requests;

create or replace function public.get_my_city_wish_cooldowns(p_guest_id text default null)
returns table(city_name text, next_vote_at timestamptz)
language sql stable
security definer
set search_path = public
as $$
  select
    (array_agg(r.city_name order by r.created_at desc))[1] as city_name,
    max(r.created_at) + interval '23 hours' as next_vote_at
  from public.city_wish_requests r
  where (
    (auth.uid() is not null and r.user_id = auth.uid())
    or (
      auth.uid() is null
      and p_guest_id is not null
      and trim(p_guest_id) <> ''
      and r.guest_id = trim(p_guest_id)
    )
  )
  group by lower(trim(r.city_name))
  having max(r.created_at) + interval '23 hours' > now();
$$;

revoke all on function public.get_my_city_wish_cooldowns(text) from public;
grant execute on function public.get_my_city_wish_cooldowns(text) to anon, authenticated;

create or replace function public.submit_city_wish(
  p_city_name text,
  p_request_type text default 'vote',
  p_guest_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_key text;
  v_blocked_until timestamptz;
  v_user_id uuid;
  v_guest text;
begin
  v_name := trim(p_city_name);
  if v_name is null or v_name = '' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if p_request_type not in ('vote', 'proposal') then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  v_user_id := auth.uid();
  v_guest := nullif(trim(p_guest_id), '');

  if v_user_id is null and v_guest is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  v_key := lower(v_name);

  select max(r.created_at) + interval '23 hours'
  into v_blocked_until
  from public.city_wish_requests r
  where lower(trim(r.city_name)) = v_key
    and (
      (v_user_id is not null and r.user_id = v_user_id)
      or (v_user_id is null and r.guest_id = v_guest)
    );

  if v_blocked_until is not null and v_blocked_until > now() then
    return jsonb_build_object(
      'ok', false,
      'reason', 'cooldown',
      'next_vote_at', v_blocked_until
    );
  end if;

  insert into public.city_wish_requests (city_name, user_id, guest_id, request_type)
  values (
    v_name,
    v_user_id,
    case when v_user_id is null then v_guest else null end,
    p_request_type
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.submit_city_wish(text, text, text) from public;
grant execute on function public.submit_city_wish(text, text, text) to anon, authenticated;
