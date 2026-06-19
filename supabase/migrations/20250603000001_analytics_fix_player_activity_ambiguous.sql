-- Hotfix: get_admin_player_activity — ambiguous user_id (PL/pgSQL vs. Spaltenname)
-- Einmal ausführen, falls Admin-Tab „Besucher & Statistik“ mit SQL-Fehler scheitert.

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
      public._analytics_actor_key(ev.user_id, ev.guest_id, null) as actor_key,
      count(*) filter (where ev.occurred_at >= v_day and ev.event_type = 'page_view')::bigint as page_views_today,
      count(*) filter (where ev.occurred_at >= v_week and ev.event_type = 'page_view')::bigint as page_views_week,
      count(*) filter (where ev.occurred_at >= v_month and ev.event_type = 'page_view')::bigint as page_views_month,
      count(*) filter (where ev.event_type = 'page_view')::bigint as page_views_all_time,
      max(ev.occurred_at) filter (where ev.event_type = 'page_view') as last_page_view_at
    from public.analytics_events ev
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

NOTIFY pgrst, 'reload schema';
