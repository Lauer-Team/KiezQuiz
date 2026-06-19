-- Player game volume tracking + admin analytics.
-- Run in Supabase SQL Editor after base schema and city_wish_admins setup.
-- Uses the same admin gate as city wishes (is_city_wish_admin).

-- ---------------------------------------------------------------------------
-- Table: one row per completed round (logged-in users)
-- ---------------------------------------------------------------------------

create table if not exists public.player_game_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  city_id text not null check (city_id in ('hamburg', 'berlin', 'frankfurt', 'europe')),
  mode text not null default '',
  correct int check (correct is null or correct >= 0),
  total int check (total is null or total >= 0),
  duration_sec int check (duration_sec is null or duration_sec >= 0),
  played_at timestamptz not null
);

create index if not exists player_game_log_played_at_idx
  on public.player_game_log (played_at desc);

create index if not exists player_game_log_user_played_at_idx
  on public.player_game_log (user_id, played_at desc);

create unique index if not exists player_game_log_dedup_idx
  on public.player_game_log (
    user_id,
    played_at,
    city_id,
    mode,
    coalesce(correct, -1),
    coalesce(total, -1)
  );

alter table public.player_game_log enable row level security;
revoke all on table public.player_game_log from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers (Europe/Berlin calendar boundaries)
-- ---------------------------------------------------------------------------

create or replace function public._berlin_day_start(p_at timestamptz default now())
returns timestamptz
language sql
stable
as $$
  select (date_trunc('day', p_at at time zone 'Europe/Berlin') at time zone 'Europe/Berlin');
$$;

create or replace function public._berlin_week_start(p_at timestamptz default now())
returns timestamptz
language sql
stable
as $$
  select (date_trunc('week', p_at at time zone 'Europe/Berlin') at time zone 'Europe/Berlin');
$$;

create or replace function public._berlin_month_start(p_at timestamptz default now())
returns timestamptz
language sql
stable
as $$
  select (date_trunc('month', p_at at time zone 'Europe/Berlin') at time zone 'Europe/Berlin');
$$;

create or replace function public._berlin_year_start(p_at timestamptz default now())
returns timestamptz
language sql
stable
as $$
  select (date_trunc('year', p_at at time zone 'Europe/Berlin') at time zone 'Europe/Berlin');
$$;

-- ---------------------------------------------------------------------------
-- Backfill historical rounds from cloud save JSON (safe to re-run)
-- ---------------------------------------------------------------------------

insert into public.player_game_log (user_id, city_id, mode, correct, total, duration_sec, played_at)
select
  gs.user_id,
  cities.key as city_id,
  coalesce(entry.value->>'mode', '') as mode,
  nullif(entry.value->>'correct', '')::int as correct,
  nullif(entry.value->>'total', '')::int as total,
  nullif(entry.value->>'durationSec', '')::int as duration_sec,
  (entry.value->>'date')::timestamptz as played_at
from public.game_saves gs
cross join lateral jsonb_each(coalesce(gs.save_data->'cities', '{}'::jsonb)) as cities(key, value)
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(cities.value->'gameHistory') = 'array'
    then cities.value->'gameHistory'
    else '[]'::jsonb
  end
) as entry(value)
where entry.value ? 'date'
  and nullif(entry.value->>'date', '') is not null
  and cities.key in ('hamburg', 'berlin', 'frankfurt', 'europe')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- RPC: log a completed round (authenticated users)
-- ---------------------------------------------------------------------------

create or replace function public.log_player_game(
  p_city_id text,
  p_mode text default '',
  p_correct int default null,
  p_total int default null,
  p_duration_sec int default null,
  p_played_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_city text;
  v_played_at timestamptz;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  v_city := lower(trim(p_city_id));
  if v_city not in ('hamburg', 'berlin', 'frankfurt', 'europe') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_city');
  end if;

  v_played_at := coalesce(p_played_at, now());
  if v_played_at > now() + interval '5 minutes' then
    v_played_at := now();
  end if;

  insert into public.player_game_log (user_id, city_id, mode, correct, total, duration_sec, played_at)
  values (
    v_uid,
    v_city,
    coalesce(p_mode, ''),
    p_correct,
    p_total,
    p_duration_sec,
    v_played_at
  )
  on conflict do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: admin volume summary (today / week / month / year / all time)
-- ---------------------------------------------------------------------------

create or replace function public.get_admin_play_volume()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_day timestamptz;
  v_week timestamptz;
  v_month timestamptz;
  v_year timestamptz;
begin
  if not public.is_city_wish_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  v_day := public._berlin_day_start();
  v_week := public._berlin_week_start();
  v_month := public._berlin_month_start();
  v_year := public._berlin_year_start();

  return jsonb_build_object(
    'ok', true,
    'timezone', 'Europe/Berlin',
    'today', (select count(*)::int from public.player_game_log where played_at >= v_day),
    'week', (select count(*)::int from public.player_game_log where played_at >= v_week),
    'month', (select count(*)::int from public.player_game_log where played_at >= v_month),
    'year', (select count(*)::int from public.player_game_log where played_at >= v_year),
    'all_time', (select count(*)::int from public.player_game_log),
    'players_today', (select count(distinct user_id)::int from public.player_game_log where played_at >= v_day),
    'players_week', (select count(distinct user_id)::int from public.player_game_log where played_at >= v_week),
    'players_month', (select count(distinct user_id)::int from public.player_game_log where played_at >= v_month),
    'accounts', (select count(*)::int from public.profiles)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: admin per-player play counts
-- ---------------------------------------------------------------------------

drop function if exists public.get_admin_player_activity();

create or replace function public.get_admin_player_activity()
returns table(
  user_id uuid,
  username text,
  registered_at timestamptz,
  games_today bigint,
  games_week bigint,
  games_month bigint,
  games_year bigint,
  games_all_time bigint,
  last_played_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_day timestamptz;
  v_week timestamptz;
  v_month timestamptz;
  v_year timestamptz;
begin
  if not public.is_city_wish_admin() then
    return;
  end if;

  v_day := public._berlin_day_start();
  v_week := public._berlin_week_start();
  v_month := public._berlin_month_start();
  v_year := public._berlin_year_start();

  return query
  select
    p.id as user_id,
    p.username,
    p.created_at as registered_at,
    coalesce(sum(case when g.played_at >= v_day then 1 else 0 end), 0)::bigint as games_today,
    coalesce(sum(case when g.played_at >= v_week then 1 else 0 end), 0)::bigint as games_week,
    coalesce(sum(case when g.played_at >= v_month then 1 else 0 end), 0)::bigint as games_month,
    coalesce(sum(case when g.played_at >= v_year then 1 else 0 end), 0)::bigint as games_year,
    coalesce(count(g.id), 0)::bigint as games_all_time,
    max(g.played_at) as last_played_at
  from public.profiles p
  left join public.player_game_log g on g.user_id = p.id
  group by p.id, p.username, p.created_at
  order by
    coalesce(max(g.played_at), p.created_at) desc,
    p.username asc;
end;
$$;

revoke all on function public.log_player_game(text, text, int, int, int, timestamptz) from public;
grant execute on function public.log_player_game(text, text, int, int, int, timestamptz) to authenticated;

revoke all on function public.get_admin_play_volume() from public;
grant execute on function public.get_admin_play_volume() to authenticated;

revoke all on function public.get_admin_player_activity() from public;
grant execute on function public.get_admin_player_activity() to authenticated;
