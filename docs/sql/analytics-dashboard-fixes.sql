-- Analytics dashboard: correct period boundaries, KPI totals, actor keys, backfill.

-- ---------------------------------------------------------------------------
-- Backfill analytics_daily for days that have raw events but no aggregate row
-- ---------------------------------------------------------------------------

do $$
declare
  v_day date;
begin
  for v_day in
    select distinct public._berlin_day_date(occurred_at)
    from public.analytics_events
    union
    select distinct public._berlin_day_date(played_at)
    from public.player_game_log
    union
    select day from public.analytics_gsc_daily
  loop
    perform public.refresh_analytics_daily(v_day);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Per-actor activity: include session_id so anonymous visits are not one blob
-- ---------------------------------------------------------------------------

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
      public._analytics_actor_key(e.user_id, e.guest_id, e.session_id) as actor_key,
      case
        when e.user_id is not null then 'user'
        when e.guest_id is not null then 'guest'
        when e.session_id is not null and length(trim(e.session_id)) > 0 then 'session'
        else 'unknown'
      end as actor_type,
      e.user_id,
      e.guest_id
    from public.analytics_events e
    where e.event_type = 'page_view'
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
      public._analytics_actor_key(ev.user_id, ev.guest_id, ev.session_id) as actor_key,
      count(*) filter (where ev.occurred_at >= v_day and ev.event_type = 'page_view')::bigint as page_views_today,
      count(*) filter (where ev.occurred_at >= v_week and ev.event_type = 'page_view')::bigint as page_views_week,
      count(*) filter (where ev.occurred_at >= v_month and ev.event_type = 'page_view')::bigint as page_views_month,
      count(*) filter (where ev.event_type = 'page_view')::bigint as page_views_all_time,
      max(ev.occurred_at) filter (where ev.event_type = 'page_view') as last_page_view_at
    from public.analytics_events ev
    where ev.event_type = 'page_view'
    group by 1
  ),
  gm as (
    select
      public._analytics_actor_key(gl.user_id, gl.guest_id, null) as actor_key,
      count(*) filter (where gl.played_at >= v_day)::bigint as games_today,
      count(*) filter (where gl.played_at >= v_week)::bigint as games_week,
      count(*) filter (where gl.played_at >= v_month)::bigint as games_month,
      count(*) filter (where gl.played_at >= v_year)::bigint as games_year,
      count(*)::bigint as games_all_time,
      max(gl.played_at) as last_played_at
    from public.player_game_log gl
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
-- Play volume: add missing unique-player counts
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
    'players_year', (
      select count(distinct public._analytics_actor_key(user_id, guest_id, null))::int
      from public.player_game_log where played_at >= v_year
    ),
    'players_all_time', (
      select count(distinct public._analytics_actor_key(user_id, guest_id, null))::int
      from public.player_game_log
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
-- Match user, guest, or anonymous session actors in chart filters
-- ---------------------------------------------------------------------------

drop function if exists public._analytics_match_actor(text, uuid, text);

create or replace function public._analytics_match_actor(
  p_actor_key text,
  p_user_id uuid,
  p_guest_id text,
  p_session_id text default null
)
returns boolean
language sql
immutable
as $$
  select
    p_actor_key is null
    or (
      p_actor_key like 'u:%'
      and p_user_id is not null
      and p_user_id = (substring(p_actor_key from 3))::uuid
    )
    or (
      p_actor_key like 'g:%'
      and p_guest_id is not null
      and p_guest_id = substring(p_actor_key from 3)
    )
    or (
      p_actor_key like 's:%'
      and p_session_id is not null
      and length(trim(p_session_id)) > 0
      and p_session_id = substring(p_actor_key from 3)
      and p_user_id is null
      and (p_guest_id is null or length(trim(p_guest_id)) = 0)
    );
$$;

-- ---------------------------------------------------------------------------
-- Chart series: calendar week/month, period totals, per-actor visitor flag
-- ---------------------------------------------------------------------------

create or replace function public.get_admin_analytics_series(
  p_range text default 'week',
  p_actor_key text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_range text;
  v_actor text;
  v_granularity text;
  v_start timestamptz;
  v_end timestamptz;
  v_end_exclusive timestamptz;
  v_start_day date;
  v_end_day date;
  v_points jsonb;
  v_totals jsonb;
  v_visitors int;
  v_page_views int;
  v_games int;
  v_gsc_clicks int;
  v_gsc_impressions int;
begin
  if not public.is_city_wish_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  v_range := lower(trim(coalesce(p_range, 'week')));
  if v_range not in ('today', 'week', 'month', '90d') then
    v_range := 'week';
  end if;

  v_actor := nullif(trim(p_actor_key), '');
  if v_actor is not null and v_actor !~ '^(u:|g:|s:)' then
    v_actor := null;
  end if;

  v_end := now();
  v_end_day := public._berlin_day_date(v_end);
  v_end_exclusive := ((v_end_day + 1)::timestamp at time zone 'Europe/Berlin');

  if v_range = 'today' then
    v_granularity := 'hour';
    v_start := public._berlin_day_start();
    v_start_day := v_end_day;
  elsif v_range = 'week' then
    v_granularity := 'day';
    v_start := public._berlin_week_start();
    v_start_day := public._berlin_day_date(v_start);
  elsif v_range = 'month' then
    v_granularity := 'day';
    v_start := public._berlin_month_start();
    v_start_day := public._berlin_day_date(v_start);
  else
    v_granularity := 'day';
    v_start_day := v_end_day - 89;
    v_start := (v_start_day::timestamp at time zone 'Europe/Berlin');
  end if;

  if v_granularity = 'hour' then
    with buckets as (
      select generate_series(
        date_trunc('hour', v_start),
        date_trunc('hour', v_end),
        interval '1 hour'
      ) as bucket_start
    ),
    ev as (
      select
        date_trunc('hour', e.occurred_at) as bucket_start,
        count(*) filter (where e.event_type = 'page_view')::int as page_views,
        count(distinct case when e.event_type = 'page_view'
          then public._analytics_actor_key(e.user_id, e.guest_id, e.session_id) end)::int as unique_visitors
      from public.analytics_events e
      where e.occurred_at >= v_start
        and e.occurred_at < v_end_exclusive
        and public._analytics_match_actor(v_actor, e.user_id, e.guest_id, e.session_id)
      group by 1
    ),
    gm as (
      select
        date_trunc('hour', g.played_at) as bucket_start,
        count(*)::int as games_played
      from public.player_game_log g
      where g.played_at >= v_start
        and g.played_at < v_end_exclusive
        and public._analytics_match_actor(v_actor, g.user_id, g.guest_id, null)
      group by 1
    )
    select coalesce(jsonb_agg(
      jsonb_build_object(
        't', b.bucket_start,
        'label', to_char(b.bucket_start at time zone 'Europe/Berlin', 'HH24:00'),
        'visitors', case
          when v_actor is not null then case when coalesce(ev.page_views, 0) > 0 then 1 else 0 end
          else coalesce(ev.unique_visitors, 0)
        end,
        'page_views', coalesce(ev.page_views, 0),
        'games', coalesce(gm.games_played, 0),
        'gsc_clicks', null,
        'gsc_impressions', null
      )
      order by b.bucket_start
    ), '[]'::jsonb)
    into v_points
    from buckets b
    left join ev on ev.bucket_start = b.bucket_start
    left join gm on gm.bucket_start = b.bucket_start;

  elsif v_actor is null then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        't', d.day,
        'label', to_char(d.day, 'DD.MM.'),
        'visitors', coalesce(ad.unique_visitors, 0),
        'page_views', coalesce(ad.page_views, 0),
        'games', coalesce(ad.games_played, 0),
        'gsc_clicks', coalesce(gsc.clicks, 0),
        'gsc_impressions', coalesce(gsc.impressions, 0)
      )
      order by d.day
    ), '[]'::jsonb)
    into v_points
    from (
      select generate_series(v_start_day, v_end_day, interval '1 day')::date as day
    ) d
    left join public.analytics_daily ad on ad.day = d.day
    left join public.analytics_gsc_daily gsc on gsc.day = d.day;

  else
    with days as (
      select generate_series(v_start_day, v_end_day, interval '1 day')::date as day
    ),
    ev as (
      select
        public._berlin_day_date(e.occurred_at) as day,
        count(*) filter (where e.event_type = 'page_view')::int as page_views,
        count(distinct case when e.event_type = 'page_view'
          then public._analytics_actor_key(e.user_id, e.guest_id, e.session_id) end)::int as unique_visitors
      from public.analytics_events e
      where e.occurred_at >= v_start
        and e.occurred_at < v_end_exclusive
        and public._analytics_match_actor(v_actor, e.user_id, e.guest_id, e.session_id)
      group by 1
    ),
    gm as (
      select
        public._berlin_day_date(g.played_at) as day,
        count(*)::int as games_played
      from public.player_game_log g
      where g.played_at >= v_start
        and g.played_at < v_end_exclusive
        and public._analytics_match_actor(v_actor, g.user_id, g.guest_id, null)
      group by 1
    )
    select coalesce(jsonb_agg(
      jsonb_build_object(
        't', d.day,
        'label', to_char(d.day, 'DD.MM.'),
        'visitors', case when coalesce(ev.page_views, 0) > 0 then 1 else 0 end,
        'page_views', coalesce(ev.page_views, 0),
        'games', coalesce(gm.games_played, 0),
        'gsc_clicks', null,
        'gsc_impressions', null
      )
      order by d.day
    ), '[]'::jsonb)
    into v_points
    from days d
    left join ev on ev.day = d.day
    left join gm on gm.day = d.day;
  end if;

  select
    count(*) filter (where e.event_type = 'page_view')::int,
    count(distinct case when e.event_type = 'page_view'
      then public._analytics_actor_key(e.user_id, e.guest_id, e.session_id) end)::int
  into v_page_views, v_visitors
  from public.analytics_events e
  where e.occurred_at >= v_start
    and e.occurred_at < v_end_exclusive
    and public._analytics_match_actor(v_actor, e.user_id, e.guest_id, e.session_id);

  select count(*)::int
  into v_games
  from public.player_game_log g
  where g.played_at >= v_start
    and g.played_at < v_end_exclusive
    and public._analytics_match_actor(v_actor, g.user_id, g.guest_id, null);

  if v_actor is null then
    select
      coalesce(sum(clicks), 0)::int,
      coalesce(sum(impressions), 0)::int
    into v_gsc_clicks, v_gsc_impressions
    from public.analytics_gsc_daily
    where day >= v_start_day and day <= v_end_day;
  else
    v_gsc_clicks := null;
    v_gsc_impressions := null;
  end if;

  v_totals := jsonb_build_object(
    'visitors', coalesce(v_visitors, 0),
    'page_views', coalesce(v_page_views, 0),
    'games', coalesce(v_games, 0),
    'gsc_clicks', v_gsc_clicks,
    'gsc_impressions', v_gsc_impressions
  );

  return jsonb_build_object(
    'ok', true,
    'timezone', 'Europe/Berlin',
    'range', v_range,
    'granularity', v_granularity,
    'actor_key', v_actor,
    'gsc_available', v_actor is null,
    'points', v_points,
    'totals', v_totals
  );
end;
$$;

revoke all on function public.get_admin_analytics_series(text, text) from public;
grant execute on function public.get_admin_analytics_series(text, text) to authenticated;

NOTIFY pgrst, 'reload schema';
