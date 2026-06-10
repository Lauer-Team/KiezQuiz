# Supabase-Backup (Free Tier)

Supabase Free Tier hat **keine automatischen Point-in-Time-Backups**. Dieser Prozess ersetzt das durch monatliche SQL-Exports — dokumentiert in den TOMs (Art. 32 DSGVO).

## Was wird gesichert?

- PostgreSQL-Schema **`public`** (Profiles, Spielstände, Freunde, Bestenlisten, Stadt-Wünsche, …)
- Format: `.sql.gz` (plain SQL, gzip)
- **Nicht** enthalten: `auth.users` (Supabase Auth). Nutzer-Accounts können bei Totalausfall über Supabase Support / Auth-Export wiederhergestellt werden; App-Daten liegen in `public`.

## Einmal-Setup

```bash
python3 scripts/setup_supabase_backup.py
```

1. Öffne [Supabase Dashboard](https://supabase.com/dashboard) → **KiezQuiz Backend** → **Project Settings** → **Database**
2. **Database password** notieren (oder „Reset database password“)
3. **Connection string** → Tab **URI** → **Direct connection** kopieren
4. In `scripts/backup-supabase.config.json` das Feld `databaseUrl` eintragen

### pg_dump installieren (macOS)

```bash
brew install libpq
brew link --force libpq
```

## Manuell exportieren

```bash
# Config prüfen
python3 scripts/export_supabase_backup.py --dry-run

# Backup erstellen
python3 scripts/export_supabase_backup.py
```

Ausgabe: `backups/supabase/kiezquiz-YYYY-MM-DD_HHMMSS.sql.gz`

Die letzten **12** lokale Backups werden behalten (`retainCount` in der Config).

## Automatisch (empfohlen): GitHub Actions

1. GitHub → Repository → **Settings** → **Secrets and variables** → **Actions**
2. Secret anlegen:
   - **Name:** `KIEZ_SUPABASE_DB_URL`
   - **Wert:** dieselbe URI wie in `databaseUrl`
3. Workflow `.github/workflows/supabase-backup.yml` läuft **am 1. jeden Monats** (03:00 UTC)
4. Backup downloaden: **Actions** → **Supabase monthly backup** → letzter Run → **Artifacts**

Artifacts werden von GitHub **90 Tage** aufbewahrt.

Manuell auslösen: **Actions** → **Supabase monthly backup** → **Run workflow**.

## Archivierung (Pflicht)

GitHub Artifacts allein reichen nicht langfristig. Nach jedem Export:

1. Backup-Datei herunterladen (lokal oder aus GitHub Artifact)
2. Kopie ablegen in z. B.:
   - Ordner „Rechtsdokumente / KiezQuiz Backups“
   - iCloud Drive / externe Festplatte (verschlüsselt)

## Wiederherstellung (Notfall)

```bash
# Entpacken
gunzip -k backups/supabase/kiezquiz-2026-06-10_030000.sql.gz

# Nur in Test-/Neu-Projekt — niemals blind auf Produktion!
psql "postgresql://postgres:PASS@db.PROJECT.supabase.co:5432/postgres" \
  -f backups/supabase/kiezquiz-2026-06-10_030000.sql
```

Vorher Supabase Support konsultieren, wenn das Produktionsprojekt betroffen ist.

## Sicherheit

| Datei / Secret | Im Git? |
|----------------|---------|
| `scripts/backup-supabase.config.json` | ❌ (.gitignore) |
| `backups/` | ❌ (.gitignore) |
| GitHub Secret `KIEZ_SUPABASE_DB_URL` | ✅ nur verschlüsselt in GitHub |

## Monatliche E-Mail-Erinnerung

Am **2. jeden Monats** (09:00 UTC) sendet GitHub Actions automatisch eine E-Mail an **info@kiezquiz.de** mit Anleitung (Warum + Wie).

| Komponente | Zweck |
|------------|--------|
| `.github/workflows/backup-reminder.yml` | Cron + manueller Start |
| `scripts/send_backup_reminder.py` | Versand via Resend |
| `docs/email-backup-reminder.html` | HTML-Vorlage |

**Einmal-Setup:** GitHub Secret `KIEZ_RESEND_API_KEY` (derselbe Resend-Key wie für NB-Benachrichtigungen).

Test lokal:
```bash
python3 scripts/send_backup_reminder.py --dry-run
# Mit Versand (Resend-Key in Umgebung):
KIEZ_RESEND_API_KEY=re_... python3 scripts/send_backup_reminder.py --send
```

Manuell auslösen: **Actions** → **Supabase backup reminder** → **Run workflow**.
