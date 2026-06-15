# Routinen — COO Operations

| Automation | Cron | Bericht |
|---|---|---|
| Backup Archiv Sync (#0) | `0 10 2 * *` | `ops/reports/*backup-archiv*` |
| Uptime Smoke Check (#1) | `0 8 * * 1-5` | `ops/reports/*devops-smoke*` |

GitHub Actions: `deploy.yml`, `supabase-backup.yml`, `backup-reminder.yml`, `dashboard-refresh.yml`
