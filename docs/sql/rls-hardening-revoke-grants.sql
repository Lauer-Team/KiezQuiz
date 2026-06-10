-- RLS hardening: revoke direct table/RPC access where not needed.
-- Applied 2026-06-10 via Supabase migration rls_hardening_revoke_grants.

revoke all on table public.city_wish_admins from anon, authenticated;

revoke execute on function public._check_profile_search_rate_limit(text) from anon, authenticated;
revoke execute on function public.is_city_wish_admin() from anon;

revoke execute on function public.delete_my_account() from anon;
revoke execute on function public.get_admin_play_volume() from anon;
revoke execute on function public.get_admin_player_activity() from anon;
revoke execute on function public.get_city_wish_admin_list() from anon;

revoke execute on function public.list_friend_requests() from anon;
revoke execute on function public.list_friends() from anon;
revoke execute on function public.send_friend_request(text) from anon;
revoke execute on function public.respond_friend_request(uuid, boolean) from anon;
revoke execute on function public.search_profiles_by_username(text) from anon;
revoke execute on function public.submit_best_score(text, int, int, int, text) from anon;
revoke execute on function public.get_friends_leaderboard(text, int) from anon;
revoke execute on function public.log_player_game(text, text, int, int, int, timestamptz) from anon;

-- Public city leaderboard stays callable for guests (see src/social.js rpcPublic)
-- grant execute on function public.get_city_leaderboard(text, int) to anon;  -- keep granted

alter function public._is_better_run(int, int, int, int, int, int) set search_path = public;
alter function public._rate_limit_bucket(text) set search_path = public;
alter function public._berlin_day_start(timestamptz) set search_path = public;
alter function public._berlin_week_start(timestamptz) set search_path = public;
alter function public._berlin_month_start(timestamptz) set search_path = public;
alter function public._berlin_year_start(timestamptz) set search_path = public;
