-- Hotfix: refresh_analytics_daily ON CONFLICT (nach erstem Deploy)
-- Einmal im Supabase SQL Editor ausführen, falls log_analytics_batch mit 42P01 fehlschlägt.

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

  insert into public.analytics_daily (
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
