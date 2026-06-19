-- Sync page views with logged games: backfill + future log_player_game inserts.
-- Fixes admin actor filter showing games without matching page views.

-- ---------------------------------------------------------------------------
-- User filter: also match guest IDs tied to that account via player_game_log
-- ---------------------------------------------------------------------------

create or replace function public._analytics_match_actor(
  p_actor_key text,
  p_user_id uuid,
  p_guest_id text,
  p_session_id text default null
)
returns boolean
language sql
stable
as $$
  select
    p_actor_key is null
    or (
      p_actor_key like 'u:%'
      and p_user_id is not null
      and p_user_id = (substring(p_actor_key from 3))::uuid
    )
    or (
      p_actor_key like 'u:%'
      and p_guest_id is not null
      and length(trim(p_guest_id)) > 0
      and p_guest_id in (
        select distinct gl.guest_id
        from public.player_game_log gl
        where gl.user_id = (substring(p_actor_key from 3))::uuid
          and gl.guest_id is not null
          and length(trim(gl.guest_id)) > 0
      )
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
-- Link guest page views to accounts when the same guest_id appears in game log
-- ---------------------------------------------------------------------------

update public.analytics_events ae
set user_id = gl.user_id,
    guest_id = null
from (
  select distinct user_id, guest_id
  from public.player_game_log
  where user_id is not null
    and guest_id is not null
    and length(trim(guest_id)) > 0
) gl
where ae.event_type = 'page_view'
  and ae.user_id is null
  and ae.guest_id = gl.guest_id;

-- ---------------------------------------------------------------------------
-- Backfill: one page_view per game day without any page_view for that actor
-- ---------------------------------------------------------------------------

insert into public.analytics_events (
  occurred_at, event_type, path, user_id, guest_id, city_id
)
select
  gl.played_at,
  'page_view',
  '/' || gl.city_id || '/',
  gl.user_id,
  case when gl.user_id is null then gl.guest_id else null end,
  gl.city_id
from public.player_game_log gl
where not exists (
  select 1
  from public.analytics_events ae
  where ae.event_type = 'page_view'
    and public._berlin_day_date(ae.occurred_at) = public._berlin_day_date(gl.played_at)
    and (
      (gl.user_id is not null and ae.user_id = gl.user_id)
      or (gl.user_id is null and ae.guest_id is not null and ae.guest_id = gl.guest_id)
    )
);

-- Refresh affected daily aggregates
do $$
declare
  v_day date;
begin
  for v_day in
    select distinct public._berlin_day_date(played_at)
    from public.player_game_log
  loop
    perform public.refresh_analytics_daily(v_day);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- log_player_game: record a page_view when the client batch missed one
-- ---------------------------------------------------------------------------

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
  v_path text;
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

  v_path := '/' || v_city || '/';
  if not exists (
    select 1
    from public.analytics_events ae
    where ae.event_type = 'page_view'
      and public._berlin_day_date(ae.occurred_at) = public._berlin_day_date(v_played_at)
      and (
        (v_uid is not null and ae.user_id = v_uid)
        or (v_uid is null and ae.guest_id is not null and ae.guest_id = v_guest)
      )
  ) then
    insert into public.analytics_events (
      occurred_at, event_type, path, user_id, guest_id, city_id
    ) values (
      v_played_at,
      'page_view',
      v_path,
      v_uid,
      case when v_uid is null then v_guest else null end,
      v_city
    );
  end if;

  v_day := public._berlin_day_date(v_played_at);
  perform public.refresh_analytics_daily(v_day);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.log_player_game(text, text, int, int, int, timestamptz, text) from public;
grant execute on function public.log_player_game(text, text, int, int, int, timestamptz, text) to anon, authenticated;

NOTIFY pgrst, 'reload schema';
