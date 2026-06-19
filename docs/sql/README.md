# SQL-Skripte (Legacy-Referenz)

**SSOT für Schema-Änderungen:** [`supabase/migrations/`](../supabase/migrations/) + [`docs/SUPABASE-MIGRATIONS.md`](../SUPABASE-MIGRATIONS.md)

Diese Dateien sind **Spiegel** der nummerierten Migrationen (gleicher Inhalt). Neue Änderungen bitte nur noch als Migration anlegen:

```bash
supabase migration new feature_name
./scripts/supabase-db-push.sh
```

| Datei hier | Migration |
|------------|-----------|
| `profile-social-leaderboard.sql` | `20250101000001_profile_social_leaderboard.sql` |
| `admin-player-activity.sql` | `20250102000001_admin_player_activity.sql` |
| `city-wish-cooldown.sql` | `20250103000001_city_wish_cooldown.sql` |
| `analytics.sql` | `20250601000001_analytics.sql` |
| `analytics-fix-refresh-daily.sql` | `20250602000001_analytics_fix_refresh_daily.sql` |
| `analytics-fix-player-activity-ambiguous.sql` | `20250603000001_analytics_fix_player_activity_ambiguous.sql` |
| `rls-hardening-revoke-grants.sql` | `20250610000001_rls_hardening_revoke_grants.sql` |
| `analytics-chart-series.sql` | `20250619000001_analytics_chart_series.sql` |
