# Supabase — CLI-Migrations (KiezQuiz)

Ab sofort lebt das DB-Schema in **`supabase/migrations/`** — nicht mehr als lose Skripte im SQL Editor.

| Vorher | Jetzt |
|--------|--------|
| `docs/sql/*.sql` manuell kopieren & Run | `supabase db push` (ein Befehl) |
| Frontend deployt automatisch, DB vergisst man | Migrationen versioniert im Git |

Die Dateien unter `docs/sql/` bleiben als **Referenz-Kopien** (gleicher Inhalt); **SSOT** sind die nummerierten Migrations.

---

## 1. Einmalig: CLI installieren & verbinden

**Linux (VPS, ohne npm):**

```bash
cd ~/projects/KiezQuiz
./scripts/install-supabase-cli.sh
export PATH="$HOME/.local/bin:$PATH"
# dauerhaft: echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
```

**Alternativ:** `npm install -g supabase` · macOS: `brew install supabase/tap/supabase`

### Auth (wichtig auf VPS)

`supabase login` mit Browser-Code funktioniert oft, **speichert das Token auf dem Server aber nicht zuverlässig** (kein Desktop-Keyring). Dann schlagen `migration repair` / `db push` fehl mit *Access token not provided*.

**Lösung — Personal Access Token:**

1. [Dashboard → Account → Access Tokens](https://supabase.com/dashboard/account/tokens) → **Generate new token**
2. Token sichern (`sbp_…`), dann **eine** Variante:

```bash
# Variante A: in .env (empfohlen)
cp .env.supabase.example .env
# SUPABASE_ACCESS_TOKEN + SUPABASE_DB_PASSWORD eintragen

# Variante B: nur diese Shell
export SUPABASE_ACCESS_TOKEN=sbp_...
export SUPABASE_DB_PASSWORD=...   # Project Settings → Database

# Variante C: CLI merkt sich Token in ~/.supabase/access-token
supabase login --token sbp_...
```

```bash
supabase --version
supabase link --project-ref iuixaesbzftgmnmelcad   # falls noch nicht verlinkt
```

Optional: `.env` aus Vorlage (gitignored):

```bash
cp .env.supabase.example .env
# SUPABASE_ACCESS_TOKEN + SUPABASE_DB_PASSWORD eintragen
```

---

## 2. Bestehende Live-DB (schon manuell eingerichtet)

Wenn Tabellen/RPCs **schon** laufen, Migrationen **nicht nochmal ausführen**, sondern als „bereits angewendet“ markieren:

```bash
./scripts/supabase-migration-baseline.sh
```

Das Script ruft `supabase migration repair --status applied` für alle acht Baseline-Migrationen auf. Danach gilt die Remote-DB als synchron mit dem Repo.

**Prüfen:**

```bash
supabase migration list --linked
```

---

## 3. Schema auf Live-DB anwenden (Routine)

Nach Änderungen an `supabase/migrations/`:

```bash
./scripts/supabase-db-push.sh
# oder: supabase db push --linked
```

Neue Migrationen werden in Reihenfolge ausgeführt. Bestehende bleiben unberührt.

**Neue Migration anlegen** (nächstes Feature):

```bash
supabase migration new mein_feature_name
# → supabase/migrations/YYYYMMDDHHMMSS_mein_feature_name.sql bearbeiten
supabase db push --linked
```

---

## 4. Grünes Feld (neues Supabase-Projekt)

1. Basis-Schema aus [SUPABASE-SETUP.md](./SUPABASE-SETUP.md) §2 (profiles, game_saves, city wishes …) im Dashboard **oder** als eigene Migration nachziehen.
2. Dann:

```bash
supabase link --project-ref NEUES_PROJEKT
supabase db push --linked
```

Reihenfolge der Migrations:

| Version | Inhalt |
|---------|--------|
| `20250101000001` | Profil, Freunde, Bestenliste |
| `20250102000001` | Spieler-Aktivität (`player_game_log`) |
| `20250103000001` | Stadt-Wünsche Cooldown |
| `20250601000001` | Analytics (Events, GSC, daily) |
| `20250602000001` | Fix `refresh_analytics_daily` |
| `20250603000001` | Fix `get_admin_player_activity` |
| `20250610000001` | RLS / Revoke hardening |
| `20250619000001` | Chart-RPC `get_admin_analytics_series` (v2, schnell) |
| `20250619100001` | Analytics-Dashboard-Fixes (KPI totals, Kalenderwoche, Session-Akteure) |

---

## 5. Optional: GitHub Actions

Workflow **`.github/workflows/supabase-db-push.yml`** — nur **manuell** (`workflow_dispatch`), nie automatisch bei jedem Push.

**Secrets** (Repo → Settings → Secrets):

| Secret | Inhalt |
|--------|--------|
| `SUPABASE_ACCESS_TOKEN` | [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_DB_PASSWORD` | Database password |
| `SUPABASE_PROJECT_REF` | `iuixaesbzftgmnmelcad` |

---

## 6. Troubleshooting

| Problem | Lösung |
|---------|--------|
| `relation already exists` bei erstem Push auf alte DB | `./scripts/supabase-migration-baseline.sh` |
| Migration schlägt fehl | Fehler in SQL fixen, **neue** Migration anlegen (alte nicht editieren, wenn schon deployed) |
| `supabase: command not found` | CLI installieren (§1) |
| `Access token not provided` (nach Browser-login) | [PAT setzen](https://supabase.com/dashboard/account/tokens) → `export SUPABASE_ACCESS_TOKEN=sbp_…` oder `.env` |
| Nur Analytics-Chart fehlt | Einmal `db push` — holt `20250619000001` nach |
| `Remote migration versions not found in local migrations directory` | Remote-only-Einträge (z. B. `20260531…`) — siehe unten |

### Remote-only Migrationen (History-Drift)

Wenn `migration list --linked` **Remote-Zeilen ohne Local-Spalte** zeigt (Migrationen wurden auf dem VPS/Dashboard angewendet, aber nie ins Git committed), blockiert `db push`.

**Symptom:** *Remote migration versions not found in local migrations directory.*

**Ursache (Beispiel Live-DB):** acht Einträge `20260531152137` … `20260610192433` (profiles, RLS, friend search …) — Schema ist ok, History passt nicht zum Repo.

**Fix (History bereinigen, Schema bleibt):**

```bash
./scripts/supabase-migration-repair-orphans.sh
./scripts/supabase-db-push.sh
```

Manuell (gleiche Versionen):

```bash
supabase migration repair --status reverted \
  20260531152137 20260531152150 20260531153926 20260531174600 \
  20260601172605 20260602211401 20260610192408 20260610192433 \
  --linked
supabase db push --linked
```

`reverted` entfernt nur den **History-Eintrag** — bereits angewendetes SQL wird **nicht** zurückgerollt.

**Langfristig:** Neue Schema-Änderungen nur noch als Datei unter `supabase/migrations/` + `db push`, nicht per losem `supabase migration new` ohne Commit.

Siehe auch: [ANALYTICS-SETUP.md](./ANALYTICS-SETUP.md) · [SUPABASE-SETUP.md](./SUPABASE-SETUP.md)
