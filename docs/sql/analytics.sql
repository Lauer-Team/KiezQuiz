-- First-party analytics (page views, GSC daily, play volume incl. guests).
-- Run in Supabase SQL Editor after base schema + admin-player-activity.sql.
-- Legal/compliance: see docs/HANDOFF-LEGORA-ANALYTICS.md before enabling in production.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  event_type text not null check (event_type in ('page_view', 'session_start')),
  path text not null default '/',
  referrer_host text,
  guest_id text,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  city_id text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_occurred_at_idx
  on public.analytics_events (occurred_at desc);

create index if not exists analytics_events_guest_idx
  on public.analytics_events (guest_id, occurred_at desc)
  where guest_id is not null;

create index if not exists analytics_events_user_idx
  on public.analytics_events (user_id, occurred_at desc)
  where user_id is not null;

create index if not exists analytics_events_path_idx
  on public.analytics_events (path, occurred_at desc);

create table if not exists public.analytics_gsc_daily (
  day date primary key,
  clicks int not null default 0 check (clicks >= 0),
  impressions int not null default 0 check (impressions >= 0),
  fetched_at timestamptz not null default now()
);

create table if not exists public.analytics_daily (
  day date primary key,
  page_views int not null default 0 check (page_views >= 0),
  unique_visitors int not null default 0 check (unique_visitors >= 0),
  unique_guests int not null default 0 check (unique_guests >= 0),
  unique_users int not null default 0 check (unique_users >= 0),
  games_played int not null default 0 check (games_played >= 0),
  gsc_clicks int check (gsc_clicks is null or gsc_clicks >= 0),
  gsc_impressions int check (gsc_impressions is null or gsc_impressions >= 0),
  updated_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;
alter table public.analytics_gsc_daily enable row level security;
alter table public.analytics_daily enable row level security;

revoke all on table public.analytics_events from public, anon, authenticated;
revoke all on table public.analytics_gsc_daily from public, anon, authenticated;
revoke all on table public.analytics_daily from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- player_game_log: guests + extended city list
-- ---------------------------------------------------------------------------

alter table public.player_game_log
  alter column user_id drop not null;

alter table public.player_game_log
  add column if not exists guest_id text;

alter table public.player_game_log
  drop constraint if exists player_game_log_city_id_check;

alter table public.player_game_log
  add constraint player_game_log_city_id_check
  check (city_id in (
    'hamburg', 'berlin', 'frankfurt', 'muenchen', 'duesseldorf',
    'ravensburg', 'europe', 'mississippi'
  ));

alter table public.player_game_log
  drop constraint if exists player_game_log_actor_check;

alter table public.player_game_log
  add constraint player_game_log_actor_check
  check (
    user_id is not null
    or (guest_id is not null and length(trim(guest_id)) > 0)
  );

drop index if exists public.player_game_log_dedup_idx;

create unique index if not exists player_game_log_dedup_idx
  on public.player_game_log (
    coalesce(user_id::text, ''),
    coalesce(guest_id, ''),
    played_at,
    city_id,
    mode,
    coalesce(correct, -1),
    coalesce(total, -1)
  );

create index if not exists player_game_log_guest_played_at_idx
  on public.player_game_log (guest_id, played_at desc)
  where guest_id is not null;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public._analytics_actor_key(
  p_user_id uuid,
  p_guest_id text,
  p_session_id text
)
returns text
language sql
immutable
as $$
  select coalesce(
    case when p_user_id is not null then 'u:' || p_user_id::text end,
    case when p_guest_id is not null and length(trim(p_guest_id)) > 0 then 'g:' || trim(p_guest_id) end,
    case when p_session_id is not null and length(trim(p_session_id)) > 0 then 's:' || trim(p_session_id) end,
    'unknown'
  );
$$;

create or replace function public._berlin_day_date(p_at timestamptz default now())
returns date
language sql
stable
as $$
  select (p_at at time zone 'Europe/Berlin')::date;
$$;

create or replace function public.refresh_analytics_daily(p_day date default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date;
  v_start timestamptz;
  v_end timestamptz;
begin
  v_day := coalesce(p_day, public._berlin_day_date());
  v_start := (v_day::timestamp at time zone 'Europe/Berlin');
  v_end := v_start + interval '1 day';

  insert into public.analytics_daily as d (
    day,
    page_views,
    unique_visitors,
    unique_guests,
    unique_users,
    games_played,
    gsc_clicks,
    gsc_impressions,
    updated_at
  )
  select
    v_day,
    coalesce(ev.page_views, 0),
    coalesce(ev.unique_visitors, 0),
    coalesce(ev.unique_guests, 0),
    coalesce(ev.unique_users, 0),
    coalesce(gm.games_played, 0),
    gsc.clicks,
    gsc.impressions,
    now()
  from (
    select
      count(*)::int as page_views,
      count(distinct public._analytics_actor_key(user_id, guest_id, session_id))::int as unique_visitors,
      count(distinct guest_id) filter (where guest_id is not null)::int as unique_guests,
      count(distinct user_id) filter (where user_id is not null)::int as unique_users
    from public.analytics_events
    where occurred_at >= v_start
      and occurred_at < v_end
      and event_type = 'page_view'
  ) ev
  cross join (
    select count(*)::int as games_played
    from public.player_game_log
    where played_at >= v_start and played_at < v_end
  ) gm
  left join public.analytics_gsc_daily gsc on gsc.day = v_day
  on conflict (day) do update set
    page_views = excluded.page_views,
    unique_visitors = excluded.unique_visitors,
    unique_guests = excluded.unique_guests,
    unique_users = excluded.unique_users,
    games_played = excluded.games_played,
    gsc_clicks = coalesce(excluded.gsc_clicks, analytics_daily.gsc_clicks),
    gsc_impressions = coalesce(excluded.gsc_impressions, analytics_daily.gsc_impressions),
    updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: ingest page-view batch (anon + authenticated)
-- ---------------------------------------------------------------------------

create or replace function public.log_analytics_batch(p_events jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_inserted int := 0;
  v_event jsonb;
  v_type text;
  v_path text;
  v_guest text;
  v_session text;
  v_city text;
  v_ref text;
  v_at timestamptz;
  v_day date;
  v_days date[] := '{}';
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_payload');
  end if;

  if jsonb_array_length(p_events) > 25 then
    return jsonb_build_object('ok', false, 'reason', 'batch_too_large');
  end if;

  v_uid := auth.uid();

  for v_event in select value from jsonb_array_elements(p_events) loop
    v_type := coalesce(v_event->>'event_type', 'page_view');
    if v_type not in ('page_view', 'session_start') then
      continue;
    end if;

    v_path := left(trim(coalesce(v_event->>'path', '/')), 500);
    if v_path = '' then
      v_path := '/';
    end if;

    v_guest := nullif(left(trim(coalesce(v_event->>'guest_id', '')), 80), '');
    v_session := nullif(left(trim(coalesce(v_event->>'session_id', '')), 80), '');
    v_city := nullif(left(lower(trim(coalesce(v_event->>'city_id', ''))), 40), '');
    v_ref := nullif(left(lower(trim(coalesce(v_event->>'referrer_host', ''))), 120), '');

    begin
      v_at := coalesce((v_event->>'occurred_at')::timestamptz, now());
    exception when others then
      v_at := now();
    end;

    if v_at > now() + interval '5 minutes' then
      v_at := now();
    end if;
    if v_at < now() - interval '7 days' then
      continue;
    end if;

    insert into public.analytics_events (
      occurred_at, event_type, path, referrer_host,
      guest_id, user_id, session_id, city_id
    ) values (
      v_at, v_type, v_path, v_ref,
      case when v_uid is null then v_guest else null end,
      v_uid,
      v_session,
      v_city
    );

    v_inserted := v_inserted + 1;
    v_day := public._berlin_day_date(v_at);
    if not v_day = any(v_days) then
      v_days := array_append(v_days, v_day);
    end if;
  end loop;

  if array_length(v_days, 1) is not null then
    foreach v_day in array v_days loop
      perform public.refresh_analytics_daily(v_day);
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'inserted', v_inserted);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: link guest analytics to account after login
-- ---------------------------------------------------------------------------

create or replace function public.link_guest_analytics(p_guest_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_guest text;
  v_events int := 0;
  v_games int := 0;
begin
  v_uid := auth.uid();
  v_guest := nullif(trim(p_guest_id), '');
  if v_uid is null or v_guest is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_actor');
  end if;

  update public.analytics_events
  set user_id = v_uid,
      guest_id = null
  where guest_id = v_guest
    and user_id is null;
  get diagnostics v_events = row_count;

  update public.player_game_log
  set user_id = v_uid,
      guest_id = null
  where guest_id = v_guest
    and user_id is null;
  get diagnostics v_games = row_count;

  return jsonb_build_object('ok', true, 'events_linked', v_events, 'games_linked', v_games);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: upsert GSC rows (service role / cron only — no client grant)
-- ---------------------------------------------------------------------------

create or replace function public.upsert_analytics_gsc_daily(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_day date;
  v_count int := 0;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_payload');
  end if;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    begin
      v_day := (v_row->>'day')::date;
    exception when others then
      continue;
    end;

    insert into public.analytics_gsc_daily (day, clicks, impressions, fetched_at)
    values (
      v_day,
      greatest(0, coalesce((v_row->>'clicks')::int, 0)),
      greatest(0, coalesce((v_row->>'impressions')::int, 0)),
      now()
    )
    on conflict (day) do update set
      clicks = excluded.clicks,
      impressions = excluded.impressions,
      fetched_at = now();

    v_count := v_count + 1;
    perform public.refresh_analytics_daily(v_day);
  end loop;

  return jsonb_build_object('ok', true, 'upserted', v_count);
end;
$$;

revoke all on function public.upsert_analytics_gsc_daily(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: log game (accounts + guests)
-- ---------------------------------------------------------------------------

drop function if exists public.log_player_game(text, text, int, int, int, timestamptz);

create or replace function public.log_player_game(
  p_city_id text,
  p_mode text default '',
  p_correct int default null,
  p_total int default null,
  p_duration_sec int default null,
  p_played_at timestamptz default null,
  p_guest_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_guest text;
  v_city text;
  v_played_at timestamptz;
  v_day date;
begin
  v_uid := auth.uid();
  v_guest := nullif(trim(p_guest_id), '');

  if v_uid is null and v_guest is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_actor');
  end if;

  v_city := lower(trim(p_city_id));
  if v_city not in (
    'hamburg', 'berlin', 'frankfurt', 'muenchen', 'duesseldorf',
    'ravensburg', 'europe', 'mississippi'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_city');
  end if;

  v_played_at := coalesce(p_played_at, now());
  if v_played_at > now() + interval '5 minutes' then
    v_played_at := now();
  end if;

  insert into public.player_game_log (
    user_id, guest_id, city_id, mode, correct, total, duration_sec, played_at
  ) values (
    v_uid,
    case when v_uid is null then v_guest else null end,
    v_city,
    coalesce(p_mode, ''),
    p_correct,
    p_total,
    p_duration_sec,
    v_played_at
  )
  on conflict do nothing;

  v_day := public._berlin_day_date(v_played_at);
  perform public.refresh_analytics_daily(v_day);

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: admin volume (extended)
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
  v_gsc_start date;
  v_gsc_clicks int;
  v_gsc_impressions int;
begin
  if not public.is_city_wish_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  v_day := public._berlin_day_start();
  v_week := public._berlin_week_start();
  v_month := public._berlin_month_start();
  v_year := public._berlin_year_start();
  v_gsc_start := public._berlin_day_date(now()) - 6;

  select
    coalesce(sum(clicks), 0)::int,
    coalesce(sum(impressions), 0)::int
  into v_gsc_clicks, v_gsc_impressions
  from public.analytics_gsc_daily
  where day >= v_gsc_start;

  return jsonb_build_object(
    'ok', true,
    'timezone', 'Europe/Berlin',
    'today', (select count(*)::int from public.player_game_log where played_at >= v_day),
    'week', (select count(*)::int from public.player_game_log where played_at >= v_week),
    'month', (select count(*)::int from public.player_game_log where played_at >= v_month),
    'year', (select count(*)::int from public.player_game_log where played_at >= v_year),
    'all_time', (select count(*)::int from public.player_game_log),
    'players_today', (
      select count(distinct public._analytics_actor_key(user_id, guest_id, null))::int
      from public.player_game_log where played_at >= v_day
    ),
    'players_week', (
      select count(distinct public._analytics_actor_key(user_id, guest_id, null))::int
      from public.player_game_log where played_at >= v_week
    ),
    'players_month', (
      select count(distinct public._analytics_actor_key(user_id, guest_id, null))::int
      from public.player_game_log where played_at >= v_month
    ),
    'accounts', (select count(*)::int from public.profiles),
    'page_views_today', (
      select count(*)::int from public.analytics_events
      where event_type = 'page_view' and occurred_at >= v_day
    ),
    'visitors_today', (
      select count(distinct public._analytics_actor_key(user_id, guest_id, session_id))::int
      from public.analytics_events
      where event_type = 'page_view' and occurred_at >= v_day
    ),
    'page_views_week', (
      select count(*)::int from public.analytics_events
      where event_type = 'page_view' and occurred_at >= v_week
    ),
    'visitors_week', (
      select count(distinct public._analytics_actor_key(user_id, guest_id, session_id))::int
      from public.analytics_events
      where event_type = 'page_view' and occurred_at >= v_week
    ),
    'gsc_clicks_7d', v_gsc_clicks,
    'gsc_impressions_7d', v_gsc_impressions
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: admin analytics overview + time series
-- ---------------------------------------------------------------------------

create or replace function public.get_admin_analytics_overview()
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
  v_gsc_start date;
begin
  if not public.is_city_wish_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  v_day := public._berlin_day_start();
  v_week := public._berlin_week_start();
  v_month := public._berlin_month_start();
  v_gsc_start := public._berlin_day_date(now()) - 6;

  return jsonb_build_object(
    'ok', true,
    'timezone', 'Europe/Berlin',
    'today', jsonb_build_object(
      'page_views', (select count(*)::int from public.analytics_events where event_type = 'page_view' and occurred_at >= v_day),
      'visitors', (select count(distinct public._analytics_actor_key(user_id, guest_id, session_id))::int from public.analytics_events where event_type = 'page_view' and occurred_at >= v_day),
      'games', (select count(*)::int from public.player_game_log where played_at >= v_day)
    ),
    'week', jsonb_build_object(
      'page_views', (select count(*)::int from public.analytics_events where event_type = 'page_view' and occurred_at >= v_week),
      'visitors', (select count(distinct public._analytics_actor_key(user_id, guest_id, session_id))::int from public.analytics_events where event_type = 'page_view' and occurred_at >= v_week),
      'games', (select count(*)::int from public.player_game_log where played_at >= v_week)
    ),
    'month', jsonb_build_object(
      'page_views', (select count(*)::int from public.analytics_events where event_type = 'page_view' and occurred_at >= v_month),
      'visitors', (select count(distinct public._analytics_actor_key(user_id, guest_id, session_id))::int from public.analytics_events where event_type = 'page_view' and occurred_at >= v_month),
      'games', (select count(*)::int from public.player_game_log where played_at >= v_month)
    ),
    'gsc_7d', jsonb_build_object(
      'clicks', coalesce((select sum(clicks)::int from public.analytics_gsc_daily where day >= v_gsc_start), 0),
      'impressions', coalesce((select sum(impressions)::int from public.analytics_gsc_daily where day >= v_gsc_start), 0)
    ),
    'gsc_latest_day', (select max(day)::text from public.analytics_gsc_daily)
  );
end;
$$;

create or replace function public.get_admin_analytics_by_day(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days int;
  v_start date;
begin
  if not public.is_city_wish_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  v_days := greatest(1, least(coalesce(p_days, 30), 365));
  v_start := public._berlin_day_date(now()) - (v_days - 1);

  return jsonb_build_object(
    'ok', true,
    'timezone', 'Europe/Berlin',
    'days', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'day', d.day,
          'page_views', coalesce(ad.page_views, 0),
          'visitors', coalesce(ad.unique_visitors, 0),
          'games', coalesce(ad.games_played, 0),
          'gsc_clicks', coalesce(ad.gsc_clicks, g.clicks, 0),
          'gsc_impressions', coalesce(ad.gsc_impressions, g.impressions, 0)
        )
        order by d.day
      )
      from (
        select generate_series(v_start, public._berlin_day_date(now()), interval '1 day')::date as day
      ) d
      left join public.analytics_daily ad on ad.day = d.day
      left join public.analytics_gsc_daily g on g.day = d.day
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: per-actor activity (users + guests)
-- ---------------------------------------------------------------------------

drop function if exists public.get_admin_player_activity();

create or replace function public.get_admin_player_activity()
returns table(
  actor_key text,
  actor_type text,
  user_id uuid,
  guest_id text,
  username text,
  registered_at timestamptz,
  page_views_today bigint,
  page_views_week bigint,
  page_views_month bigint,
  page_views_all_time bigint,
  games_today bigint,
  games_week bigint,
  games_month bigint,
  games_year bigint,
  games_all_time bigint,
  last_page_view_at timestamptz,
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
  with actors as (
    select distinct
      public._analytics_actor_key(e.user_id, e.guest_id, null) as actor_key,
      case
        when e.user_id is not null then 'user'
        when e.guest_id is not null then 'guest'
        else 'unknown'
      end as actor_type,
      e.user_id,
      e.guest_id
    from public.analytics_events e
  union
    select distinct
      public._analytics_actor_key(g.user_id, g.guest_id, null),
      case
        when g.user_id is not null then 'user'
        when g.guest_id is not null then 'guest'
        else 'unknown'
      end,
      g.user_id,
      g.guest_id
    from public.player_game_log g
  ),
  pv as (
    select
      public._analytics_actor_key(user_id, guest_id, null) as actor_key,
      count(*) filter (where occurred_at >= v_day and event_type = 'page_view')::bigint as page_views_today,
      count(*) filter (where occurred_at >= v_week and event_type = 'page_view')::bigint as page_views_week,
      count(*) filter (where occurred_at >= v_month and event_type = 'page_view')::bigint as page_views_month,
      count(*) filter (where event_type = 'page_view')::bigint as page_views_all_time,
      max(occurred_at) filter (where event_type = 'page_view') as last_page_view_at
    from public.analytics_events
    group by 1
  ),
  gm as (
    select
      public._analytics_actor_key(user_id, guest_id, null) as actor_key,
      count(*) filter (where played_at >= v_day)::bigint as games_today,
      count(*) filter (where played_at >= v_week)::bigint as games_week,
      count(*) filter (where played_at >= v_month)::bigint as games_month,
      count(*) filter (where played_at >= v_year)::bigint as games_year,
      count(*)::bigint as games_all_time,
      max(played_at) as last_played_at
    from public.player_game_log
    group by 1
  )
  select
    a.actor_key,
    a.actor_type,
    a.user_id,
    a.guest_id,
    p.username,
    p.created_at as registered_at,
    coalesce(pv.page_views_today, 0),
    coalesce(pv.page_views_week, 0),
    coalesce(pv.page_views_month, 0),
    coalesce(pv.page_views_all_time, 0),
    coalesce(gm.games_today, 0),
    coalesce(gm.games_week, 0),
    coalesce(gm.games_month, 0),
    coalesce(gm.games_year, 0),
    coalesce(gm.games_all_time, 0),
    pv.last_page_view_at,
    gm.last_played_at
  from actors a
  left join public.profiles p on p.id = a.user_id
  left join pv on pv.actor_key = a.actor_key
  left join gm on gm.actor_key = a.actor_key
  where coalesce(pv.page_views_all_time, 0) > 0
     or coalesce(gm.games_all_time, 0) > 0
  order by
    greatest(coalesce(pv.last_page_view_at, gm.last_played_at), coalesce(gm.last_played_at, pv.last_page_view_at)) desc nulls last,
    coalesce(p.username, a.guest_id, a.actor_key);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.log_analytics_batch(jsonb) from public;
grant execute on function public.log_analytics_batch(jsonb) to anon, authenticated;

revoke all on function public.link_guest_analytics(text) from public;
grant execute on function public.link_guest_analytics(text) to authenticated;

revoke all on function public.log_player_game(text, text, int, int, int, timestamptz, text) from public;
grant execute on function public.log_player_game(text, text, int, int, int, timestamptz, text) to anon, authenticated;

revoke all on function public.get_admin_play_volume() from public;
grant execute on function public.get_admin_play_volume() to authenticated;

revoke all on function public.get_admin_analytics_overview() from public;
grant execute on function public.get_admin_analytics_overview() to authenticated;

revoke all on function public.get_admin_analytics_by_day(int) from public;
grant execute on function public.get_admin_analytics_by_day(int) to authenticated;

revoke all on function public.get_admin_player_activity() from public;
grant execute on function public.get_admin_player_activity() to authenticated;

revoke all on function public.refresh_analytics_daily(date) from public, anon, authenticated;
