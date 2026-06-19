-- Analytics chart: time series with range + optional per-actor filter.
-- Run once in Supabase SQL Editor after docs/sql/analytics.sql
-- v2: uses analytics_daily (fast, no actor) + grouped scans (actor filter)

create or replace function public._analytics_match_actor(
  p_actor_key text,
  p_user_id uuid,
  p_guest_id text
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
    );
$$;

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
begin
  if not public.is_city_wish_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  v_range := lower(trim(coalesce(p_range, 'week')));
  if v_range not in ('today', 'week', 'month', '90d') then
    v_range := 'week';
  end if;

  v_actor := nullif(trim(p_actor_key), '');
  if v_actor is not null and v_actor !~ '^(u:|g:)' then
    v_actor := null;
  end if;

  v_end := now();
  v_end_day := public._berlin_day_date(v_end);
  v_end_exclusive := ((v_end_day + 1)::timestamp at time zone 'Europe/Berlin');

  if v_range = 'today' then
    v_granularity := 'hour';
    v_start := public._berlin_day_start();
  elsif v_range = 'week' then
    v_granularity := 'day';
    v_start_day := v_end_day - 6;
    v_start := (v_start_day::timestamp at time zone 'Europe/Berlin');
  elsif v_range = 'month' then
    v_granularity := 'day';
    v_start_day := v_end_day - 29;
    v_start := (v_start_day::timestamp at time zone 'Europe/Berlin');
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
        and public._analytics_match_actor(v_actor, e.user_id, e.guest_id)
      group by 1
    ),
    gm as (
      select
        date_trunc('hour', g.played_at) as bucket_start,
        count(*)::int as games_played
      from public.player_game_log g
      where g.played_at >= v_start
        and g.played_at < v_end_exclusive
        and public._analytics_match_actor(v_actor, g.user_id, g.guest_id)
      group by 1
    )
    select coalesce(jsonb_agg(
      jsonb_build_object(
        't', b.bucket_start,
        'label', to_char(b.bucket_start at time zone 'Europe/Berlin', 'HH24:00'),
        'visitors', coalesce(ev.unique_visitors, 0),
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
    -- Site-wide: pre-aggregated daily table (same path as get_admin_analytics_by_day)
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
    -- Per-actor: two grouped scans instead of one scan per day
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
        and public._analytics_match_actor(v_actor, e.user_id, e.guest_id)
      group by 1
    ),
    gm as (
      select
        public._berlin_day_date(g.played_at) as day,
        count(*)::int as games_played
      from public.player_game_log g
      where g.played_at >= v_start
        and g.played_at < v_end_exclusive
        and public._analytics_match_actor(v_actor, g.user_id, g.guest_id)
      group by 1
    )
    select coalesce(jsonb_agg(
      jsonb_build_object(
        't', d.day,
        'label', to_char(d.day, 'DD.MM.'),
        'visitors', coalesce(ev.unique_visitors, 0),
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

  return jsonb_build_object(
    'ok', true,
    'timezone', 'Europe/Berlin',
    'range', v_range,
    'granularity', v_granularity,
    'actor_key', v_actor,
    'gsc_available', v_actor is null,
    'points', v_points
  );
end;
$$;

revoke all on function public.get_admin_analytics_series(text, text) from public;
grant execute on function public.get_admin_analytics_series(text, text) to authenticated;
