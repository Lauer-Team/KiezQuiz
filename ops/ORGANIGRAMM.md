# Organigramm — KiezQuiz AI-Management (Gesamtüberblick)

> **Zweck:** Ein Ort, an dem du **das komplette KI-Management auf einen Blick** verstehst und prüfen kannst — wie ein Wirtschaftsprüfer.
> Wer macht was, wo liegt jede Datei, wer hält sie aktuell, was läuft automatisch, und was müsstest du bei einem Umzug mitnehmen.
> **Pflege:** Kalle (Leitagent) — aktualisiert bei jeder Strukturänderung im selben Arbeitsschritt. Stand: **2026-06-15**

**So liest du dieses Dokument**
- **Kapitel 1** = das Bild (Organigramm als Diagramm).
- **Kapitel 2–8** = jede Bausteinart einzeln als Tabelle (Agenten, MCPs, Automationen, Actions, Hooks, Skills, Skripte).
- **Kapitel 9** = Datei-Landkarte: *wo* liegt was, *wer* pflegt es, *wie oft*.
- **Kapitel 10** = Todos: wo sie liegen und wie du sie abrufst.
- **Kapitel 11** = Umzugs-Checkliste: was du bei Systemwechsel mitnehmen musst (v. a. nur-lokale Dateien).
- **Kapitel 12** = Freigabe-Gates · **Kapitel 13** = Dashboard.

**Begriffe in einem Satz**
- **Agent** = eine KI-Rolle mit klarem Auftrag (bei uns: eine Regel-Datei unter `.cursor/rules/`).
- **MCP** = „Steckdose", über die Kalle echte Dienste bedient (z. B. Supabase, Notion) — *Model Context Protocol*.
- **Automation** = zeitgesteuerter Agent auf cursor.com, der von allein Berichte/PRs erzeugt.
- **GitHub Action** = Automatik direkt im Code-Repo (z. B. Deploy, Backup) — läuft bei GitHub, nicht in Cursor.
- **Hook** = kleines Skript, das automatisch nach einer Datei-Änderung anspringt.

---

## 1. Das Organigramm (Diagramm)

> Mermaid rendert auf GitHub automatisch als Bild. Im Dashboard (`ops/dashboard.html`) siehst du dasselbe interaktiv.

```mermaid
flowchart TB
    subgraph mensch["👤 Du (Jeremiah) — Eigentümer & Freigabe"]
        OK["Freigabe-Gates<br/>Deploy · Geld · Recht · DNS · E-Mails"]
    end

    subgraph leit["🕊️ Kalle — Leitagent (einziger Ansprechpartner)"]
        K["Orchestrator<br/>ops/LEITSTAND.md · ops/PLAYBOOK.md<br/>.cursor/rules/00-leitagent.mdc"]
    end

    subgraph fach["Fach-Agenten · .cursor/rules/"]
        SEO["10-seo<br/>Technisches SEO · GSC"]
        DEV["20-devops<br/>Uptime · Smoke · Deploy"]
        SEC["30-security<br/>Dependabot · RLS · Patches"]
        FIN["40-finance<br/>Kosten · Free-Tier-Risiko"]
        SUP["50-support<br/>Stadt-Wünsche · kein GA"]
        LEGC["60-legal-koordination<br/>Trigger · Backlog · Legora-Aufträge"]
        TNR["terms-change-notify<br/>NB-Versand-Regeln"]
        DPL["deploy-and-cache-busting<br/>Live-Gang · Versionierung"]
        LAY["Layout<br/>Geräte-Layouts"]
    end

    subgraph mcp["🔌 MCPs & Connections (Kalles Werkzeuge)"]
        M1["Supabase"]
        M2["Cloudflare (Docs/Bindings/Builds/Observability)"]
        M3["Notion"]
        M4["Cursor App-Control / IDE-Browser"]
        M5["GitHub (gh CLI)"]
    end

    subgraph auto["⏰ Cursor Automations 🟢 live"]
        A0["Backup Archiv Sync"]
        A1["Uptime Smoke Check"]
        A2["Security Weekly"]
        A3["SEO Weekly"]
        A4["Ops Weekly Review"]
        A5["Finance Monthly"]
        A6["Support Monthly"]
        A7["Leit-Routine / Orchestrator<br/>(koordiniert alle, baut Dashboard)"]
    end

    subgraph gha["⚙️ GitHub Actions (im Code-Repo)"]
        G1["deploy.yml — Live-Deploy"]
        G2["supabase-backup.yml — DB-Backup 1./Monat"]
        G3["backup-reminder.yml — Erinnerungs-Mail"]
        G4["notify-terms.yml — NB-Mail"]
    end

    subgraph hooks["🪝 Hooks (.cursor/hooks)"]
        H1["after-terms-edit.sh<br/>nach NB-/Legal-Änderung"]
    end

    subgraph external["🌐 Extern (nicht Cursor)"]
        LEG["Legora — Rechtstexte & Compliance"]
        TG["Telegram-Bot — ⏸️ pausiert"]
        GSC["Google Search Console"]
        RES["Resend — E-Mail"]
    end

    subgraph shared["📁 Gemeinsame Dateien (Quelle der Wahrheit)"]
        LS["ops/LEITSTAND.md"]
        DL["ops/DEADLINES.md"]
        RP["ops/reports/"]
        RT["ops/RETRO.md"]
        RD["ops/ROADMAP.md"]
        FINS["ops/finance/"]
        LEGF["ops/legal/"]
        DASH["ops/dashboard.html"]
    end

    mensch -->|"Anweisungen / Freigaben"| K
    K --> SEO & DEV & SEC & FIN & SUP & LEGC
    K --- M1 & M2 & M3 & M4 & M5
    K -->|"Legal-Arbeitsauftrag"| LEG
    LEG -->|"geprüfte Texte"| K
    mensch -.->|"⏸️"| TG

    A0 --> DEV
    A1 --> DEV
    A2 --> SEC
    A3 --> SEO
    A4 --> K
    A5 --> FIN
    A6 --> SUP
    A7 ==> A0 & A1 & A2 & A3 & A4 & A5 & A6
    A7 ==> DASH

    SEO -.-> GSC
    SEC --- M1
    FIN --- M1
    SUP --- M1
    G4 --- RES
    H1 -.-> TNR

    SEO & DEV & SEC & FIN & SUP --> RP
    LEGC --> LEGF
    FIN --> FINS
    K --> LS & DL & RT & RD
```

---

## 2. AI-Agenten (Regel-Dateien)

> Jeder „Agent" ist eine Regel-Datei. Sie sagt einer KI: *Wer bist du, was darfst du, wo sind die Grenzen.*
> **Alle liegen unter `.cursor/rules/`** (in Git, also auch auf GitHub gesichert).

| Agent / Rolle | Datei | Auftrag (kurz) | Aktiv wann |
|---|---|---|---|
| 🕊️ **Kalle — Leitagent** | `.cursor/rules/00-leitagent.mdc` | Orchestriert alles, einziger Ansprechpartner | immer |
| **SEO** | `.cursor/rules/10-seo.mdc` | Technisches SEO, Sitemap, GSC-Briefings | bei SEO-Arbeit + Automation #3 |
| **DevOps / Monitoring** | `.cursor/rules/20-devops-monitoring.mdc` | Uptime, Smoke-Tests, Deploy, Fix-PRs | Automation #0/#1 |
| **Security** | `.cursor/rules/30-security.mdc` | Dependabot, RLS, Secret-Schutz, Patches | Automation #2 |
| **Finance** | `.cursor/rules/40-finance.mdc` | Kosten, Free-Tier-Risiko, Buchhaltungs-Vorbereitung | Automation #5 |
| **Support / Analytics** | `.cursor/rules/50-support-analytics.mdc` | Stadt-Wünsche, Trends (kein Google Analytics) | Automation #6 |
| **Legal-Koordination** | `.cursor/rules/60-legal-coordination.mdc` | Trigger erkennen, Legora-Aufträge, Integration | bei Legal-Themen |
| **NB-Benachrichtigung** | `.cursor/rules/terms-change-notify.mdc` | Regeln für NB-/Rechtstext-Mails | bei NB-Änderung |
| **Deploy & Cache-Busting** | `.cursor/rules/deploy-and-cache-busting.mdc` | Live-Gang, Versionierung, Stadtseiten | bei Deploy/HTML |
| **Layout** | `.cursor/rules/Layout.mdc` | Geräte-Layouts (`src/styles/device/`) | bei Layout-Arbeit |

**Wer hält sie aktuell?** Kalle — bei dauerhaften Learnings (siehe `ops/RETRO.md`), Kleines direkt, Größeres mit deinem OK.

---

## 3. MCPs & Connections (Kalles Werkzeuge)

> MCP = „Steckdose" zu einem echten Dienst. Damit kann Kalle z. B. die Datenbank lesen oder DNS prüfen — ohne dass du Passwörter herausgibst.
> **Wichtig fürs Audit:** MCP-Zugänge sind **an deinen Cursor-Account gebunden** (Cloud), **nicht** als Datei im Repo. Beim Umzug → Kapitel 11.

| MCP / Connection | Wofür | Wo eingerichtet | Status |
|---|---|---|---|
| **Supabase** | Datenbank, Auth, Edge Functions, Advisors, Logs | Cursor-Account (Cloud) | 🟢 |
| **Cloudflare** (Docs, Bindings, Builds, Observability) | DNS, Workers, Logs für `lauer.team` | Cursor-Account (Cloud) | 🟢 |
| **Notion** | Projekt-Doku „JJL - TBD - KiezQuiz" | Cursor-Account (Cloud) | 🟢 |
| **Cursor App-Control / IDE-Browser** | Cursor selbst steuern, Browser-Tests | Cursor (eingebaut) | 🟢 |
| **GitHub (`gh` CLI)** | PRs, Secrets, Actions, Releases | lokal + Repo-Auth | 🟢 |

Details & Zugangsstatus: **`ops/ZUGAENGE.md`** · Anbieterliste: **`ops/TECHSTACK.md`**

---

## 4. Cursor Automations (zeitgesteuerte Agenten)

> Laufen auf **cursor.com/automations** (Cloud) in einer isolierten Sandbox. Jede legt nur **Berichte/PRs** vor — nie direkt live.
> Die **Konfig-Texte** (zum Wiederherstellen) stehen in **`ops/AUTOMATIONS.md`**. Die laufenden Automationen selbst leben in deinem Cursor-Account.

| # | Name | Cron (UTC) | Im Klartext | Aufgabe | Bericht nach |
|---|---|---|---|---|---|
| 0 | Backup Archiv Sync | `0 10 2 * *` | am 2. jeden Monats, 10:00 | Backup-Artifact ins Supplement-Archiv | `ops/reports/…-backup-archiv.md` |
| 1 | Uptime Smoke Check | `0 8 * * 1-5` | werktags 08:00 | kiezquiz.de erreichbar? | `…-devops-smoke-check.md` |
| 2 | Security Weekly | `0 7 * * 1` | montags 07:00 | Dependabot + Supabase Advisors | `…-security-weekly.md` |
| 3 | SEO Weekly | `0 9 * * 1` | montags 09:00 | Sitemap, SEO-Tests, GSC-Hinweis | `…-seo-weekly.md` |
| 4 | Ops Weekly Review | `0 7 * * 1` | montags 07:00 | Fälligkeiten aus `DEADLINES.md` | `…-ops-weekly.md` |
| 5 | Finance Monthly | `0 8 1 * *` | am 1., 08:00 | Kosten, Free-Tier, Quotas | `…-finance-monthly.md` |
| 6 | Support Monthly | `0 10 1 * *` | am 1., 10:00 | Stadt-Wünsche, Trends | `…-support-monthly.md` |
| 7 | **Leit-Routine / Orchestrator** | `0 6 * * 1` | montags 06:00 | **Koordiniert alle Automationen, prüft was fällig ist, baut Dashboard neu** | `…-orchestrator.md` |

**Wie du eine neue anlegst / wiederherstellst:** Schritt-für-Schritt in `ops/AUTOMATIONS.md`.

---

## 5. GitHub Actions (Automatik im Code-Repo)

> Laufen bei **GitHub**, nicht in Cursor. Dateien liegen in `.github/workflows/` (in Git gesichert).

| Workflow | Datei | Auslöser | Was |
|---|---|---|---|
| **Deploy** | `.github/workflows/deploy.yml` | Push auf `main` | Baut & deployt nach kiezquiz.de (GitHub Pages) |
| **Supabase Backup** | `.github/workflows/supabase-backup.yml` | 1. jeden Monats, 03:00 UTC | `pg_dump` → Artifact |
| **Backup-Erinnerung** | `.github/workflows/backup-reminder.yml` | 2. jeden Monats, 09:00 UTC | E-Mail an info@kiezquiz.de |
| **NB-Benachrichtigung** | `.github/workflows/notify-terms.yml` | manuell/bei NB-Änderung | E-Mail-Versand via Resend |

---

## 6. Hooks (automatische Mini-Skripte)

| Hook | Datei | Auslöser | Was |
|---|---|---|---|
| Nach NB-/Legal-Änderung | `.cursor/hooks/after-terms-edit.sh` | nach Datei-Änderung (`afterFileEdit`) | erinnert an NB-Prozess | 
| Konfiguration | `.cursor/hooks.json` | — | verbindet Hook mit Ereignis |

---

## 7. Skills (Fähigkeiten-Bausteine)

> Skills sind wiederverwendbare Anleitungen für KI-Agenten. **Projekt-Skills** stehen in Git; **persönliche/Plugin-Skills** liegen in deinem Cursor-Profil (`~/.cursor/`), **nicht** im Repo.

| Art | Wo | Beispiele | Im Repo? |
|---|---|---|---|
| Cursor-System-Skills | `~/.cursor/skills-cursor/` | automate, canvas, create-rule, loop, split-to-prs | nein (Profil) |
| Plugin-Skills (Notion) | `~/.cursor/plugins/…/notion-workspace/` | create-page, database-query, search | nein (Profil) |
| Plugin-Skills (Cloudflare) | `~/.cursor/plugins/…/cloudflare/` | workers-best-practices, wrangler | nein (Profil) |
| Plugin-Skills (Supabase) | `~/.cursor/plugins/…/supabase/` | supabase, postgres-best-practices | nein (Profil) |
| **Projekt-Skills** | `.cursor/` (derzeit keine eigenen) | — | — |

**Audit-Hinweis:** Skills ändern nicht selbst etwas — sie sind „Kochrezepte". Beim Umzug → Kapitel 11.

---

## 8. Skripte (`scripts/`)

> Python/JS-Helfer, die Agenten oder du ausführen. **Alle in Git** (außer Konfig-Dateien mit Secrets, siehe Kapitel 11).

| Bereich | Skripte (Auswahl) |
|---|---|
| **Dashboard** | `generate_dashboard.py` (baut `ops/dashboard.html`) |
| **Deploy/Build** | `stamp_build.py`, `assemble_html.py`, `build_device_layouts.py` |
| **SEO** | `generate_seo_pages.py`, `generate_sitemap.py`, `test_seo_compat.js`, `gsc_weekly_brief.py` |
| **Assets** | `generate_assets.py`, `generate_*_assets.py` (Städte), `generate_og_image.*` |
| **Backup** | `export_supabase_backup.py`, `setup_supabase_backup.py`, `sync_supabase_backup_artifact.py` |
| **Legal/NB** | `notify_terms_change.py`, `deactivate_terms_notice.py`, `setup_terms_notify.py`, `generate_legal_static.py`, `export_compliance_pdf.py` |
| **Mail** | `send_backup_reminder.py` |
| **Tests** | `test_migration_v2.js`, `test_cloud_merge_v2.js`, `test_leaderboard_rank.js`, `test_rank_rederive.js` |

Vollständige Liste: Ordner `scripts/` öffnen.

---

## 9. Datei-Landkarte — *wo liegt was, wer pflegt es, wie oft*

> Die wichtigste Tabelle fürs Audit. **„Ort"**: 🟩 in Git (auf GitHub gesichert) · 🟦 nur lokal (Mac) · ☁️ Cloud-Dienst.

| Bereich | Datei / Ort | Ort | Wer pflegt | Wie oft |
|---|---|---|---|---|
| **Status (Quelle der Wahrheit)** | `ops/LEITSTAND.md` | 🟩 | Kalle | bei jeder Statusänderung |
| **Termine** | `ops/DEADLINES.md` | 🟩 | Kalle + du | bei neuen Fristen / Ops Weekly |
| **Aufgeschobenes** | `ops/ROADMAP.md` | 🟩 | Kalle | bei Bedarf |
| **Regelwerk** | `ops/PLAYBOOK.md` | 🟩 | du (Auftrag) / Kalle | selten |
| **Organigramm (dieses Dok.)** | `ops/ORGANIGRAMM.md` | 🟩 | Kalle | bei Strukturänderung |
| **Dashboard** | `ops/dashboard.html` | 🟩 | `generate_dashboard.py` | auf Abruf + Orchestrator (wöchentl.) |
| **Tech-Stack** | `ops/TECHSTACK.md` | 🟩 | Kalle | bei neuem Dienst |
| **Zugänge** | `ops/ZUGAENGE.md` | 🟩 | Kalle | bei neuem Zugang |
| **Automations-Konfig** | `ops/AUTOMATIONS.md` | 🟩 | Kalle | bei neuer Automation |
| **Berichte** | `ops/reports/` | 🟩 | Automationen / Agenten | bei jedem Lauf |
| **Learnings** | `ops/RETRO.md` | 🟩 | Kalle | nach größeren Läufen |
| **Finance** | `ops/finance/SERVICES.md`, `COSTS.md` | 🟩 | Finance/Kalle | monatlich |
| **Legal** | `ops/legal/*` | 🟩 | Legal-Koordination | quartalsweise / bei Trigger |
| **Agenten-Regeln** | `.cursor/rules/*.mdc` | 🟩 | Kalle | bei Learnings |
| **Hooks** | `.cursor/hooks/*`, `.cursor/hooks.json` | 🟩 | Kalle | selten |
| **Actions** | `.github/workflows/*` | 🟩 | Kalle | bei Bedarf |
| **Skripte** | `scripts/*` | 🟩 | Kalle | bei Bedarf |
| **Lokale Projekt-Info** | `LOCAL-INFO.md` | 🟦 | du | bei Bedarf |
| **Supabase-Keys (lokal)** | `src/supabaseConfig.js` | 🟦 | du | bei Key-Wechsel |
| **NB-Konfig (Secrets)** | `scripts/terms-notify.config.json` | 🟦 | Kalle/du | bei NB-Änderung |
| **GSC-OAuth (optional)** | `scripts/gsc-oauth-client.json`, `gsc-token.json` | 🟦 | du | nur bei GSC-API |
| **Backup-Konfig** | `scripts/backup-supabase.config.json` | 🟦 | du | einmalig |
| **Backups (Dumps)** | `backups/` | 🟦 | Action/du | monatlich |
| **Laufende Automationen** | cursor.com/automations | ☁️ | du (angelegt) | — |
| **Datenbank/Auth** | Supabase (Projekt KiezQuiz Backend) | ☁️ | Kalle via MCP | laufend |
| **Repo-Secrets** | GitHub → Settings → Secrets | ☁️ | du/Kalle | bei Bedarf |
| **Projekt-Doku** | Notion „JJL - TBD - KiezQuiz" | ☁️ | du/Kalle via MCP | bei Bedarf |

---

## 10. Wo liegen welche Todos — und wie du sie abrufst

> Es gibt bewusst **mehrere Listen mit klarer Aufteilung** (sonst wird der Leitstand zur Müllhalde). So findest du alles:

| Todo-Art | Datei | Wofür | Wie du es abrufst |
|---|---|---|---|
| **Termine mit Datum** | `ops/DEADLINES.md` | Verlängerungen, Fristen, Erinnerungen | Automation **Ops Weekly Review** (Mo) prüft & meldet |
| **Aufgeschobenes (ohne Datum)** | `ops/ROADMAP.md` | „bewusst später" | bei Planung lesen |
| **Was *du* tun musst** | `ops/LEITSTAND.md` §4 | menschliche Aufgaben vs. Kalle | Dashboard zeigt es oben |
| **Wartet auf deine Freigabe** | `ops/LEITSTAND.md` §5 | Merge, Recht, DNS, Geld | Dashboard-Block „Freigaben" |
| **Optimierungs-Ideen** | `ops/LEITSTAND.md` §6 | Nutzen/Aufwand | bei Planung |
| **Legal-Todos** | `ops/legal/BACKLOG.md` | Rechtsthemen für Legora | Legal-Koordination |
| **Produkt-Ideen** | Notion „JJL - TBD - KiezQuiz" | Feature-Backlog | Notion |

**Deine Routine (einfach):** Öffne **`ops/dashboard.html`** → oben siehst du *„Was diese Woche ansteht"* und *„Wartet auf dich"*. Das genügt für 95 %. Für Details klickst du in die jeweilige Datei.

---

## 11. Umzugs-Checkliste — was du bei Systemwechsel mitnehmen musst

> Frage: *„Wenn ich auf ein komplett anderes System umsteige — was brauche ich?"*
> **Das meiste ist in Git** (klone das Repo, fertig). Aufpassen musst du nur bei den **nur-lokalen** Dateien und den **Cloud-Zugängen**.

### A) In Git — automatisch dabei (Repo klonen genügt)
Alles unter `ops/`, `.cursor/rules/`, `.cursor/hooks/`, `.github/workflows/`, `scripts/`, `docs/`, sowie der App-Code (`src/`, `index.html`, Stadtordner). **Sicherungskopie = das GitHub-Repo `logic3/KiezQuiz`.**

### B) Nur lokal auf deinem Mac — **musst du aktiv mitnehmen** ⚠️
Diese Dateien sind per `.gitignore` **bewusst nicht** auf GitHub (enthalten Geheimnisse oder sind nur deine Notiz):

| Datei | Inhalt | Wichtig weil |
|---|---|---|
| `LOCAL-INFO.md` | Lokale Projekt-Notizen, Workflow | Orientierung |
| `src/supabaseConfig.js` | Supabase-Keys (lokal) | App-Verbindung |
| `scripts/terms-notify.config.json` | NB-Versand-Secrets | E-Mail-Versand |
| `scripts/.terms-notify-log.json` | Versand-Protokoll | Nachweis |
| `scripts/gsc-oauth-client.json`, `scripts/gsc-token.json` | GSC-API-Zugang (optional) | nur bei GSC-Automatik |
| `scripts/backup-supabase.config.json` | DB-URI für Backups | Backup |
| `backups/` | Datenbank-Sicherungen | Daten |

➡️ **Tipp:** Diese Dateien einmal an einen sicheren Ort kopieren (Passwort-Manager / verschlüsselter Ordner). Vorlagen ohne Secrets liegen als `*.example.*` im Repo.

### C) Cloud-Dienste — Konto-gebunden, nicht im Repo
| Dienst | Was mitnehmen / neu verbinden |
|---|---|
| **Cursor Automations** | 8 Automationen neu anlegen — Konfig steht in `ops/AUTOMATIONS.md` |
| **MCP-Zugänge** | Supabase, Cloudflare, Notion im neuen Cursor-Account neu verbinden (`ops/ZUGAENGE.md`) |
| **GitHub Secrets** | `KIEZ_SUPABASE_DB_URL`, Resend etc. neu setzen |
| **Supabase** | Projekt bleibt; Zugang/Keys übertragen |
| **Resend / GSC / Cloudflare / United Domains** | Logins behalten; Domains/Verifizierung bleiben |
| **Notion** | Projektseite bleibt; MCP neu verbinden |

**Kurz:** Repo klonen **+** Block B kopieren **+** Block C neu verbinden = vollständiger Umzug.

---

## 12. Freigabe-Gates (nur du)

| Aktion | Gate |
|---|---|
| Merge auf `main` / Live-Deploy | ✅ dein OK |
| E-Mails an Nutzer (NB, Marketing) | ✅ dein OK |
| Rechtstexte veröffentlichen | ✅ Legora + dein OK |
| DNS / Domain / Cloudflare-Redirect | ✅ dein OK |
| Supabase Pro / kostenpflichtige Upgrades | ✅ dein OK |
| Buchungen / Steuer | ✅ du + Steuerberater |

---

## 13. Dashboard (One-Stop-Shop — **nur Admin**)

> **Zugang:** [https://kiezquiz.de/profile/?section=admin-ai-dashboard](https://kiezquiz.de/profile/?section=admin-ai-dashboard) (nur mit Admin-Login)  
> **Technik:** Dashboard liegt in **privatem Supabase Storage** — Edge Function `get-ai-dashboard` prüft `is_city_wish_admin`.  
> **Nicht öffentlich:** Der Ordner `ops/` wird **nicht** auf kiezquiz.de deployed.

**Aktualisieren:** Button im Profil → Edge Function `refresh-ai-dashboard` → GitHub Action `dashboard-refresh.yml` → Upload nach Storage.

**Voraussetzungen (einmalig):** GitHub Secret `SUPABASE_SERVICE_ROLE_KEY` · Supabase Edge Secrets `GITHUB_PAT` · Functions deployen (s. `ops/ZUGAENGE.md`).

---

## Änderungshistorie

| Datum | Änderung |
|---|---|
| 2026-06-15 | Erstversion: Kalle, SEO, DevOps, Security |
| 2026-06-15 | 4 Automations live; Finance, Support, Legal-Koordination |
| 2026-06-15 | 7 Automations live; ROADMAP + Monetarisierungsplan |
| 2026-06-15 | **Audit-Ausbau:** MCPs, Actions, Hooks, Skills, Skripte, Datei-Landkarte, Todo-Karte, Umzugs-Checkliste; Dashboard + Leit-Routine (Orchestrator, #7) ergänzt |
