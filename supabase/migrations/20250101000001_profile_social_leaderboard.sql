-- Profile, friends & city leaderboards (logged-in users only).
-- Run in Supabase SQL Editor after base schema (SUPABASE-SETUP.md §2).
-- Clients use RPCs only — no direct table access.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.user_city_best_scores (
  user_id uuid not null references auth.users(id) on delete cascade,
  city_id text not null check (city_id in ('hamburg', 'berlin', 'frankfurt')),
  correct int not null check (correct >= 0),
  incorrect int not null check (incorrect >= 0),
  duration_sec int not null check (duration_sec >= 0),
  mode text not null default '',
  played_at timestamptz not null default now(),
  primary key (user_id, city_id)
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  constraint friend_requests_no_self check (from_user_id <> to_user_id),
  constraint friend_requests_unique_pair unique (from_user_id, to_user_id)
);

create index if not exists user_city_best_scores_city_rank_idx
  on public.user_city_best_scores (city_id, correct desc, incorrect asc, duration_sec asc);

create index if not exists friend_requests_to_status_idx
  on public.friend_requests (to_user_id, status);

create index if not exists friend_requests_from_status_idx
  on public.friend_requests (from_user_id, status);

alter table public.user_city_best_scores enable row level security;
alter table public.friend_requests enable row level security;

revoke all on table public.user_city_best_scores from public, anon, authenticated;
revoke all on table public.friend_requests from public, anon, authenticated;

-- Rate limit for profile search (same pattern as username lookup)
create table if not exists public.profile_search_rate_limits (
  bucket text primary key,
  attempt_count int not null default 1,
  window_start timestamptz not null default now()
);

alter table public.profile_search_rate_limits enable row level security;
revoke all on table public.profile_search_rate_limits from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public._is_better_run(
  p_correct int,
  p_incorrect int,
  p_duration_sec int,
  p_existing_correct int,
  p_existing_incorrect int,
  p_existing_duration_sec int
)
returns boolean
language sql
immutable
as $$
  select
    p_correct > p_existing_correct
    or (
      p_correct = p_existing_correct
      and p_incorrect < p_existing_incorrect
    )
    or (
      p_correct = p_existing_correct
      and p_incorrect = p_existing_incorrect
      and p_duration_sec < p_existing_duration_sec
    );
$$;

create or replace function public._rate_limit_bucket(p_fallback text)
returns text
language plpgsql
stable
as $$
declare
  v_bucket text;
begin
  begin
    v_bucket := coalesce(
      nullif(trim((current_setting('request.headers', true)::json)->>'cf-connecting-ip'), ''),
      nullif(trim(split_part((current_setting('request.headers', true)::json)->>'x-forwarded-for', ',', 1)), ''),
      p_fallback
    );
  exception when others then
    v_bucket := p_fallback;
  end;
  return v_bucket;
end;
$$;

create or replace function public._check_profile_search_rate_limit(p_fallback text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket text;
  v_count int;
  v_max_attempts constant int := 10;
  v_window_seconds constant int := 300;
begin
  v_bucket := public._rate_limit_bucket(p_fallback);

  insert into public.profile_search_rate_limits (bucket, attempt_count, window_start)
  values (v_bucket, 1, now())
  on conflict (bucket) do update
    set
      attempt_count = case
        when profile_search_rate_limits.window_start < now() - make_interval(secs => v_window_seconds)
        then 1
        else profile_search_rate_limits.attempt_count + 1
      end,
      window_start = case
        when profile_search_rate_limits.window_start < now() - make_interval(secs => v_window_seconds)
        then now()
        else profile_search_rate_limits.window_start
      end
  returning attempt_count into v_count;

  return v_count <= v_max_attempts;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.submit_best_score(
  p_city_id text,
  p_correct int,
  p_total int,
  p_duration_sec int,
  p_mode text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_city text;
  v_incorrect int;
  v_existing record;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  v_city := lower(trim(p_city_id));
  if v_city not in ('hamburg', 'berlin', 'frankfurt') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_city');
  end if;

  if p_correct is null or p_total is null or p_duration_sec is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if p_correct < 0 or p_total < p_correct or p_duration_sec < 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  v_incorrect := p_total - p_correct;

  select correct, incorrect, duration_sec
  into v_existing
  from public.user_city_best_scores
  where user_id = v_uid and city_id = v_city;

  if not found then
    insert into public.user_city_best_scores (user_id, city_id, correct, incorrect, duration_sec, mode, played_at)
    values (v_uid, v_city, p_correct, v_incorrect, p_duration_sec, coalesce(p_mode, ''), now());
    return jsonb_build_object('ok', true, 'updated', true);
  end if;

  if public._is_better_run(
    p_correct, v_incorrect, p_duration_sec,
    v_existing.correct, v_existing.incorrect, v_existing.duration_sec
  ) then
    update public.user_city_best_scores
    set
      correct = p_correct,
      incorrect = v_incorrect,
      duration_sec = p_duration_sec,
      mode = coalesce(p_mode, ''),
      played_at = now()
    where user_id = v_uid and city_id = v_city;
    return jsonb_build_object('ok', true, 'updated', true);
  end if;

  return jsonb_build_object('ok', true, 'updated', false);
end;
$$;

create or replace function public.get_city_leaderboard(p_city_id text, p_limit int default 50)
returns table(
  rank bigint,
  user_id uuid,
  username text,
  correct int,
  incorrect int,
  duration_sec int,
  mode text,
  played_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select
      s.user_id,
      p.username,
      s.correct,
      s.incorrect,
      s.duration_sec,
      s.mode,
      s.played_at,
      row_number() over (
        order by s.correct desc, s.incorrect asc, s.duration_sec asc, s.played_at asc
      ) as rn
    from public.user_city_best_scores s
    join public.profiles p on p.id = s.user_id
    where s.city_id = lower(trim(p_city_id))
  )
  select rn::bigint, user_id, username, correct, incorrect, duration_sec, mode, played_at
  from ranked
  where rn <= greatest(1, least(coalesce(p_limit, 50), 100))
  order by rn;
$$;

create or replace function public.get_friends_leaderboard(p_city_id text, p_limit int default 50)
returns table(
  rank bigint,
  user_id uuid,
  username text,
  correct int,
  incorrect int,
  duration_sec int,
  mode text,
  played_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with friends as (
    select case when fr.from_user_id = auth.uid() then fr.to_user_id else fr.from_user_id end as friend_id
    from public.friend_requests fr
    where fr.status = 'accepted'
      and auth.uid() is not null
      and (fr.from_user_id = auth.uid() or fr.to_user_id = auth.uid())
  ),
  ranked as (
    select
      s.user_id,
      p.username,
      s.correct,
      s.incorrect,
      s.duration_sec,
      s.mode,
      s.played_at,
      row_number() over (
        order by s.correct desc, s.incorrect asc, s.duration_sec asc, s.played_at asc
      ) as rn
    from public.user_city_best_scores s
    join public.profiles p on p.id = s.user_id
    join friends f on f.friend_id = s.user_id
    where s.city_id = lower(trim(p_city_id))
  )
  select rn::bigint, user_id, username, correct, incorrect, duration_sec, mode, played_at
  from ranked
  where rn <= greatest(1, least(coalesce(p_limit, 50), 100))
  order by rn;
$$;

create or replace function public.search_profiles_by_username(p_query text)
returns table(user_id uuid, username text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q text;
begin
  if auth.uid() is null then
    return;
  end if;

  v_q := lower(regexp_replace(trim(p_query), '^@+', ''));
  if v_q is null or length(v_q) < 2 then
    return;
  end if;

  if not public._check_profile_search_rate_limit('search:' || auth.uid()::text) then
    return;
  end if;

  return query
  select p.id, p.username
  from public.profiles p
  where p.username ilike v_q || '%'
    and p.id <> auth.uid()
  order by p.username
  limit 10;
end;
$$;

create or replace function public.send_friend_request(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_target uuid;
  v_existing public.friend_requests%rowtype;
  v_new_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select id into v_target
  from public.profiles
  where username ilike lower(regexp_replace(trim(p_username), '^@+', ''));

  if v_target is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if v_target = v_uid then
    return jsonb_build_object('ok', false, 'reason', 'self');
  end if;

  select * into v_existing
  from public.friend_requests
  where (from_user_id = v_uid and to_user_id = v_target)
     or (from_user_id = v_target and to_user_id = v_uid);

  if found then
    if v_existing.status = 'accepted' then
      return jsonb_build_object('ok', false, 'reason', 'already_friends');
    end if;
    if v_existing.status = 'pending' then
      return jsonb_build_object('ok', false, 'reason', 'already_pending');
    end if;
    if v_existing.from_user_id = v_uid then
      update public.friend_requests
      set status = 'pending', created_at = now()
      where id = v_existing.id;
      return jsonb_build_object('ok', true, 'request_id', v_existing.id);
    end if;
    return jsonb_build_object('ok', false, 'reason', 'blocked');
  end if;

  insert into public.friend_requests (from_user_id, to_user_id, status)
  values (v_uid, v_target, 'pending')
  returning id into v_new_id;

  return jsonb_build_object('ok', true, 'request_id', v_new_id);
end;
$$;

create or replace function public.respond_friend_request(p_request_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_row public.friend_requests%rowtype;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select * into v_row
  from public.friend_requests
  where id = p_request_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if v_row.to_user_id <> v_uid then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if v_row.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'not_pending');
  end if;

  update public.friend_requests
  set status = case when p_accept then 'accepted' else 'rejected' end
  where id = p_request_id;

  return jsonb_build_object('ok', true, 'status', case when p_accept then 'accepted' else 'rejected' end);
end;
$$;

create or replace function public.list_friend_requests()
returns table(
  id uuid,
  direction text,
  other_user_id uuid,
  other_username text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    fr.id,
    case when fr.from_user_id = auth.uid() then 'outgoing' else 'incoming' end,
    case when fr.from_user_id = auth.uid() then fr.to_user_id else fr.from_user_id end,
    p.username,
    fr.status,
    fr.created_at
  from public.friend_requests fr
  join public.profiles p on p.id = (
    case when fr.from_user_id = auth.uid() then fr.to_user_id else fr.from_user_id end
  )
  where auth.uid() is not null
    and (fr.from_user_id = auth.uid() or fr.to_user_id = auth.uid())
    and fr.status = 'pending'
  order by fr.created_at desc;
$$;

create or replace function public.list_friends()
returns table(user_id uuid, username text, friends_since timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select
    case when fr.from_user_id = auth.uid() then fr.to_user_id else fr.from_user_id end,
    p.username,
    fr.created_at
  from public.friend_requests fr
  join public.profiles p on p.id = (
    case when fr.from_user_id = auth.uid() then fr.to_user_id else fr.from_user_id end
  )
  where auth.uid() is not null
    and fr.status = 'accepted'
    and (fr.from_user_id = auth.uid() or fr.to_user_id = auth.uid())
  order by p.username;
$$;

create or replace function public.delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  delete from auth.users where id = v_uid;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.submit_best_score(text, int, int, int, text) from public;
grant execute on function public.submit_best_score(text, int, int, int, text) to authenticated;

revoke all on function public.get_city_leaderboard(text, int) from public;
grant execute on function public.get_city_leaderboard(text, int) to authenticated;

revoke all on function public.get_friends_leaderboard(text, int) from public;
grant execute on function public.get_friends_leaderboard(text, int) to authenticated;

revoke all on function public.search_profiles_by_username(text) from public;
grant execute on function public.search_profiles_by_username(text) to authenticated;

revoke all on function public.send_friend_request(text) from public;
grant execute on function public.send_friend_request(text) to authenticated;

revoke all on function public.respond_friend_request(uuid, boolean) from public;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;

revoke all on function public.list_friend_requests() from public;
grant execute on function public.list_friend_requests() to authenticated;

revoke all on function public.list_friends() from public;
grant execute on function public.list_friends() to authenticated;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
