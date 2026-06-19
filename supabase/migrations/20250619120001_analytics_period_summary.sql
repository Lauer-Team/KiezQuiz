-- Analytics: detailed period totals (users/guests/sessions split, players, GSC) for admin summary.

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
  v_unique_users int;
  v_unique_guests int;
  v_unique_sessions int;
  v_page_views int;
  v_games int;
  v_unique_players int;
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
      then public._analytics_actor_key(e.user_id, e.guest_id, e.session_id) end)::int,
    count(distinct e.user_id) filter (
      where e.event_type = 'page_view' and e.user_id is not null
    )::int,
    count(distinct e.guest_id) filter (
      where e.event_type = 'page_view'
        and e.guest_id is not null
        and length(trim(e.guest_id)) > 0
        and e.user_id is null
    )::int,
    count(distinct e.session_id) filter (
      where e.event_type = 'page_view'
        and e.user_id is null
        and (e.guest_id is null or length(trim(e.guest_id)) = 0)
        and e.session_id is not null
        and length(trim(e.session_id)) > 0
    )::int
  into v_page_views, v_visitors, v_unique_users, v_unique_guests, v_unique_sessions
  from public.analytics_events e
  where e.occurred_at >= v_start
    and e.occurred_at < v_end_exclusive
    and public._analytics_match_actor(v_actor, e.user_id, e.guest_id, e.session_id);

  select
    count(*)::int,
    count(distinct public._analytics_actor_key(g.user_id, g.guest_id, null))::int
  into v_games, v_unique_players
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
    'unique_users', coalesce(v_unique_users, 0),
    'unique_guests', coalesce(v_unique_guests, 0),
    'unique_sessions', coalesce(v_unique_sessions, 0),
    'page_views', coalesce(v_page_views, 0),
    'games', coalesce(v_games, 0),
    'unique_players', coalesce(v_unique_players, 0),
    'gsc_clicks', v_gsc_clicks,
    'gsc_impressions', v_gsc_impressions,
    'period_start', v_start,
    'period_end_exclusive', v_end_exclusive
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
