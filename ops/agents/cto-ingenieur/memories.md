# Memories — Theo (CTO)

- Stadtseiten: `generate_seo_pages.py` — nicht manuell pflegen.
- Cache-Busting: `versionGuard.js` am Ende von `<head>`, nach CSS.
- DESIGN_REVISION in `stamp_build.py` bei großen CSS-Änderungen erhöhen.

---

## TechStack (migriert)

# ℹ️ TechStack — KiezQuiz (Memory-Datei für Kalle)

> **Suchbegriff für Kalle:** `TechStack` oder `ℹ️ TechStack`  
> Stand: 2026-06-15 · Leitagent: **Kalle, die Kieztaube**

---

## WebApp

| | |
|---|---|
| **Was** | Gamifizierte Karten-Quiz-WebApp (Hamburg, Berlin, Frankfurt, …) |
| **Live** | [https://kiezquiz.de](https://kiezquiz.de) (Hauptdomain) |
| **Redirect** | [https://kiezquiz.lauer.team](https://kiezquiz.lauer.team) → 301 auf kiezquiz.de |
| **GitHub** | [logic3/KiezQuiz](https://github.com/logic3/KiezQuiz) |
| **Hosting** | GitHub Pages (Deploy via GitHub Actions bei Push auf `main`) |
| **Lokal (Mac)** | `/Users/jjl/Documents/Menschen/Lauer, Jeremiah Joel/TBD = To be determined/KiezQuiz` |
| **Stack** | Vanilla HTML/CSS/JS, Python-Skripte für SEO/Legal/Deploy, optional Supabase |

---

## Capacitor-Hülle (native App)

| | |
|---|---|
| **Plattformen** | iOS, iPadOS, macOS |
| **GitHub** | [logic3/KiezQuiz-App](https://github.com/logic3/KiezQuiz-App) |
| **Lokal (Mac)** | `/Users/jjl/Documents/Menschen/Lauer, Jeremiah Joel/TBD = To be determined/KiezQuiz-App` |
| **Workflow** | Änderungen in KiezQuiz → push → in KiezQuiz-App `npm run cap:sync` → Xcode |

---

## Anbieter & Werkzeuge (JJL)

| Anbieter | Dienst | Verwendung |
|---|---|---|
| Anthropic (Claude) | Claude Design | Webseite, Corporate Identity |
| Apple | Xcode | Capacitor → native Apps |
| Canva | Design-Übersichten | Visuelle Übersichten |
| **Cloudflare** | Domain | `kiezquiz.lauer.team` |
| **Cursor** | Cursor Agents | KI-Entwicklung, Leitagent Kalle, Automations |
| Flyeralarm | QR-Code-Sticker | Physische QR-Codes |
| **GitHub** | Repositories, Web-Hosting | Code, Pages, Actions, Secrets |
| Google | Antigravity 2.0 | Erstes Design |
| Google | Gemini | Recherche, Bilder (seit 2026-05-31) |
| **Google** | **Search Console** | SEO-Monitoring |
| **Legora** | Legal / Compliance | Rechtstexte, Checkliste (Projekt: KiezQuiz) |
| QR Code Monkey | QR-Codes | QR-Generierung |
| **Resend** | E-Mail (Website) | NB-Benachrichtigungen via Supabase — **Resend abgeschaltet**, Migration offen |
| **Apple iCloud+** | E-Mail (Bot) | Custom Domain `kiezquiz.de`, Bot-Absender `kalle@kiezquiz.de` |
| **Supabase** | Backend, Accounts, Spielerdaten | Projekt „KiezQuiz Backend“ (`iuixaesbzftgmnmelcad`, EU) |
| **Telegram** | Bot | @kalle_kieztaube_bot — Hetzner VPS, systemd `kiezquiz-agent` |
| **Notion** | Projekt-Doku | **JJL - TBD - KiezQuiz** (MCP verbunden) |
| **United Domains** | Domain + DNS | `kiezquiz.de` (MX/SPF/DKIM → iCloud) |
| **Hetzner** | VPS | Bot-Host `138.199.159.170` |

---

## Kontakt & Rechtliches (öffentlich)

- **E-Mail (öffentlich):** info@kiezquiz.de (iCloud+ Custom Domain)
- **E-Mail (Bot):** kalle@kiezquiz.de (iCloud SMTP/IMAP)
- **Betreiber:** Jeremiah J. Lauer, Hamburg
- **Tracking:** bewusst kein Google Analytics (Datenschutzerklärung)

---

## Telegram-Agent (Hetzner VPS)

| | |
|---|---|
| **Bot** | @kalle_kieztaube_bot |
| **Host** | Hetzner VPS `138.199.159.170`, systemd `kiezquiz-agent` |
| **Anleitung** | `telegram-agent/ANLEITUNG.md` · E-Mail: `telegram-agent/EMAIL.md` |
| **Zweck** | Nachrichten vom Handy → Code-Änderungen als PR → Freigabe → live |
| **Mail-Module** | Source of Truth: Server-Repo (`deploy/kiezquiz-agent/`), rsync-Deploy |

---

## Verwandte Ops-Dateien

| Datei | Inhalt |
|---|---|
| `ops/agents/ceo-kalle/anweisungen.md` | Leitagent-Regelwerk |
| `ops/ZUGAENGE.md` | Zugangs-Matrix (was Kalle hat / was fehlt) |
| `ops/agents/ceo-kalle/leitstand.md` | Status & Aufgaben |
| `leitstand.md (SERVICES)` | Free-Tier-Inventar |
| `anweisungen.md` | Legal-Koordination (Legora) |
| `ops/agents/ORGANIGRAMM.md` | Agenten-Struktur (Mermaid) |
| `ops/RETRO.md` | Learnings nach Durchläufen |
| `reports/` | Berichte der Fach-Agenten |
| `LOCAL-INFO.md` | Nur lokal, nicht auf GitHub |
