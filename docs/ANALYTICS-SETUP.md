# Analytics — Einrichtung & Betrieb

First-Party-Statistik in Supabase (0 €): Besucher, Seitenaufrufe, Spielrunden (inkl. Gäste), Google-Such-Klicks.

> **Rechtliches:** Vor Produktiv-Betrieb Legora-Handoff lesen und DSE/Banner anpassen: `docs/HANDOFF-LEGORA-ANALYTICS.md`

---

## 1. Schema auf Supabase anwenden

**Empfohlen (CLI):** Siehe **[SUPABASE-MIGRATIONS.md](./SUPABASE-MIGRATIONS.md)** — einmal `supabase link`, dann `./scripts/supabase-db-push.sh`.

**Bestehende DB (schon manuell eingerichtet):** einmal `./scripts/supabase-migration-baseline.sh`, danach nur noch `db push` für neue Migrationen.

Legacy (SQL Editor): die Skripte in `docs/sql/` spiegeln `supabase/migrations/` — nicht mehr einzeln pflegen.

Enthält u. a.: Tabellen `analytics_events`, `analytics_gsc_daily`, `analytics_daily`, Chart-RPC, Erweiterung `player_game_log` für Gäste.

---

## 2. Website deployen

Nach Push auf `main` lädt die App automatisch `src/kiezAnalytics.js` (Seitenaufrufe) und loggt Spielrunden auch für Gäste.

**Opt-out (technisch vorbereitet, UI/Legal folgt):**

```js
localStorage.setItem('kiezquiz_analytics_optout', '1');
```

---

## 3. GSC → Supabase (VPS-Cron)

Der tägliche SEO-Job (`seo_daily.py`) und der wöchentliche (`seo_check.py`) rufen automatisch `scripts/sync_gsc_to_supabase.py` auf.

**Voraussetzung in `Server/.env`:**

```bash
KIEZQUIZ_SUPABASE_URL=https://….supabase.co
KIEZQUIZ_SUPABASE_SERVICE_ROLE_KEY=eyJ…
GSC_TOKEN_JSON='{"token":"…","refresh_token":"…",…}'
```

**Manuell testen:**

```bash
cd ~/projects/KiezQuiz-Ops
python3 scripts/sync_gsc_to_supabase.py --days 28
```

---

## 4. Admin-Auswertung

Profil → Admin → **Besucher & Statistik**

| KPI | Quelle |
|-----|--------|
| Besucher / Seitenaufrufe | `analytics_events` |
| Gespielte Runden | `player_game_log` |
| Google-Klicks | `analytics_gsc_daily` (Cron) |
| Pro User/Gast | RPC `get_admin_player_activity` |

---

## 5. Architektur (kurz)

```
Browser (kiezAnalytics.js) ──RPC──► log_analytics_batch ──► analytics_events
Spielende (playerActivity) ──RPC──► log_player_game ──► player_game_log
VPS Cron (GSC API) ──RPC──► upsert_analytics_gsc_daily ──► analytics_gsc_daily
                              └──► refresh_analytics_daily ──► analytics_daily
```

Speicherort: Supabase EU (Irland). Keine IP-Adressen. Gast-ID = bestehende `kiezquiz_guest_id`.

---

## 6. Fehlerbehebung

| Symptom | Lösung |
|---------|--------|
| Admin: „Statistik konnte nicht geladen werden“ | `analytics.sql` in Supabase ausführen |
| Google-Klicks leer | GSC-Token prüfen, `sync_gsc_to_supabase.py` manuell testen |
| Keine Seitenaufrufe | `supabaseConfig.js` gesetzt? Opt-out-Flag prüfen |
| Gäste-Runden fehlen | `analytics.sql` (neue `log_player_game`-Signatur) |

---

*Stand: Juni 2026*
