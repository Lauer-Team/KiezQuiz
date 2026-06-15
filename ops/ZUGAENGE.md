# Zugangs-Matrix — KiezQuiz

> **Zweck:** Was Kalle (Leitagent) schon nutzen kann, was noch fehlt, und wie du es einrichtest.  
> Stand: 2026-06-15 · **Zugangs-Setup abgeschlossen** (Backup pausiert, Telegram pausiert)

**Legende:** 🟢 fertig · 🟡 teilweise · 🔴 fehlt · ⏸️ pausiert · ⚪ bewusst nicht

---

## Übersicht

| Dienst | Status | Kalle kann | Deine Aufgabe |
|---|---|---|---|
| GitHub (logic3/KiezQuiz) | 🟢 | PRs, Secrets, Actions | — |
| Supabase MCP | 🟢 | DB, Logs, Edge Functions | — |
| Live-Site kiezquiz.de | 🟢 | curl, Smoke-Checks | — |
| Lokale Supabase-Config | 🟢 | lokal testen | — |
| Resend + NB-Mail | 🟢 | Skripte + Edge-Secrets | — (verified) |
| Google Search Console | 🟢 | Briefings (manuell/API später) | — (GSC OK) |
| Cloudflare MCP | 🟢 | DNS, Workers, Observability | — |
| Notion MCP | 🟢 | Projekt „JJL - TBD - KiezQuiz" | — |
| Supabase-Backup (CI) | 🟢 | monatlich via GitHub Actions | optional: Kopie offline archivieren |
| Telegram-Bot | ⏸️ | Anleitung im Repo | **Pausiert** bis auf Weiteres |
| United Domains | 🟡 | — | DNS/Mail nur bei Bedarf manuell |
| Legora | 🟡 | Legal-Arbeitsauftrag, Koordination | Rechtstexte dort prüfen · `ops/legal/` |
| Finance-Tracking | 🟢 | `ops/finance/SERVICES.md`, COSTS.md | Domain-Verlängerungsdatum eintragen |
| Cursor Automations | 🟢 | **8 Routinen live** (#0–#7) | — |
| AI-Dashboard (admin-only) | 🟡 | Profil → Admin → AI-Management | s. Setup unten |
| GSC (Search Console Web) | 🟢 | Manueller Check · Automation technisch | ~5 Min/Monat · `docs/GSC-MANUAL-CHECK.md` |
| GSC API (Google Cloud) | ⚪ | Skript vorhanden, **bewusst nicht** Standard | Nur bei Vollautomatik · `docs/GSC-API-SETUP.md` |
| Analytics | ⚪ | — | bewusst nicht genutzt |

---

## ✅ Erledigt (2026-06-15)

- Edge-Secrets in Supabase (`NOTIFY_TERMS_SECRET`, `RESEND_API_KEY`)
- Cloudflare MCP (alle)
- **GSC OK** — Property + Sitemap
- **Resend verified** — kiezquiz.de
- **Notion MCP** — [JJL - TBD - KiezQuiz](https://app.notion.com/p/36f2a5a91f4c8058ba40cc83785b8dbc)

---

## ⏸️ Pausiert / Entscheidungen

### Supabase-Backup ✅ aktiv (2026-06-15)

- **Kosten:** 0 € (Free Tier + `pg_dump`, kein Supabase Pro)
- **Lokal:** `python3 scripts/export_supabase_backup.py`
- **Automatisch:** GitHub Actions am **1. jeden Monats** (03:00 UTC) — Secret `KIEZ_SUPABASE_DB_URL` gesetzt
- **Erinnerung:** E-Mail am **2. jeden Monats** (09:00 UTC) an **info@kiezquiz.de** — Backup offline kopieren (`backup-reminder.yml`)
- **Manuell testen:** Actions → „Supabase monthly backup“ → Run workflow
- **Tipp:** Backup-Kopie regelmäßig offline sichern (`backups/` ist gitignored)

### Telegram-Bot (@kalle_kieztaube_bot)

Pausiert bis auf Weiteres. Anleitung: `telegram-agent/ANLEITUNG.md`

---

## 🔜 Einmal-Setup: AI-Dashboard (admin-only)

| Schritt | Wo | Was |
|---|---|---|
| 1 | **GitHub** → Repo Secrets | `SUPABASE_SERVICE_ROLE_KEY` (= Service-Role aus Supabase Dashboard → Settings → API) |
| 2 | **Supabase** → Edge Functions → Secrets | `GITHUB_PAT` (Fine-grained Token: `actions:write` + `contents:write` für `logic3/KiezQuiz`) |
| 3 | Terminal (einmalig) | `supabase functions deploy get-ai-dashboard --project-ref iuixaesbzftgmnmelcad` |
| 4 | Terminal (einmalig) | `supabase functions deploy refresh-ai-dashboard --project-ref iuixaesbzftgmnmelcad` |
| 5 | Nach Merge auf `main` | Deploy lädt Dashboard in privaten Bucket `ops-dashboard` hoch |

**Test:** Als Admin einloggen → `/profile/?section=admin-ai-dashboard` → Dashboard sichtbar. Ausloggen / Nicht-Admin → kein Zugriff (403).

---

## 🔜 Optional (Roadmap)

| Thema | Wann |
|---|---|
| GSC manuell | `docs/GSC-MANUAL-CHECK.md` · ROADMAP R4 |
| GSC API / Google Cloud | Nur optional · ROADMAP R4b |
| Monetarisierung | `ops/plans/MONETIZATION.md` · wenn du Umsatz willst |
| HaveIBeenPwned | Erst mit **Supabase Pro** + Umsatz · ROADMAP R6 |

---

## Archiv: Original-Aufgaben 1–7

<details>
<summary>Aufgaben 1–5 (größtenteils erledigt)</summary>

- ✅ Aufgabe 1 — Edge-Secrets  
- ⏸️ Aufgabe 2 — Backup (pausiert)  
- ✅ Aufgabe 3 — Cloudflare MCP  
- ✅ Aufgabe 4 — GSC  
- ✅ Aufgabe 5 — Resend  
- ⏸️ Aufgabe 6 — Telegram  
- 🟡 Aufgabe 7 — Legora (laufend)

</details>

---

## Was Kalle nie ohne dein OK tut

- Merge auf `main` / Live-Deploy
- E-Mails an Nutzer senden
- Rechtstexte final veröffentlichen
- DNS/Domain-Änderungen mit Außenwirkung
- Secrets in Git committen
- Supabase Pro / kostenpflichtige Upgrades

---

## Nächster Schritt

**Masterauftrag v2 + 8 Automations live** (2026-06-15). AI-Dashboard admin-only — Setup s. oben. GSC: manuell. Kein Supabase Pro ohne Umsatz.
