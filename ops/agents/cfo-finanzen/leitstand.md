# Leitstand — CFO Finanzen

> **Rolle:** CFO / Finance · Stand: **2026-06-15**

**Status:** 🟢 — Service-Tracking aktiv, monatliche Automation live.

## Kurzüberblick

- Einzige laufende Software-Kosten: **Cursor** (~55 €/Jun → ~18 €/Jul)
- Supabase + Resend: 🟡 beobachten (Free Tier)
- Upgrade-Gates: immer Menschen-OK

## Detaildateien (Referenz)

- Service-Inventar: `leitstand.md (SERVICES)` (vollständig migriert)
- Monatskosten: `leitstand.md (COSTS)`

## Warnschwellen

Kalle warnt bei **>70 %** eines Free-Tier-Limits im CEO-Leitstand.

---

## SERVICES (migriert)

# Service-Inventar — KiezQuiz

> **Primäre Akte:** [`../agents/cfo-finanzen/leitstand.md`](../agents/cfo-finanzen/leitstand.md)  
> **Pflege:** CFO / Kalle · Stand: **2026-06-15**  
> Alle Dienste — auch kostenlose. Risiko = wie schnell KiezQuiz ohne Upgrade in Probleme gerät.

**Legende Risiko:** 🟢 weit entfernt · 🟡 mittelfristig beobachten · 🔴 bald prüfen/upgraden

---

## Übersicht (Kostenpfad)

| Dienst | Plan | €/Monat (ca.) | Kritisch? | Risiko |
|---|---|---:|---|---|
| **Cursor** | Pro+ → Pro (ab Jul 2026) | ~55 → ~18 USD | Dev/Ops | 🟢 |
| **GitHub** | Free (public Repos) | 0 | Code, Pages, CI | 🟢 |
| **Supabase** | Free | 0 | Auth, DB, Edge | 🟡 |
| **Cloudflare** | Free | 0 | DNS lauer.team | 🟢 |
| **Resend** | Free | 0 | NB-E-Mails | 🟡 |
| **Google Search Console** | Free | 0 | SEO | 🟢 |
| **GitHub Pages** | Free (public) | 0 | Hosting | 🟢 |
| **Notion** | Free/Personal | 0 | Doku | 🟢 |
| **Legora** | (dein Plan) | ? | Recht | 🟢 |
| **United Domains** | Domain .de | ~1–2* | kiezquiz.de | 🟢 | **bis 30.05.2027** (D1) |
| **Telegram** | Free | 0 | ⏸️ pausiert | 🟢 |

\* Domain meist **jährlich** (~12–15 €/Jahr ≈ ~1 €/Monat). **kiezquiz.de:** 31.05.2026–30.05.2027.

**Aktuell zahlst du laut dir nur Cursor** (~60 USD/Monat bis Juni, ab Juli ~20 USD/Monat).

---

## Kritische Free-Tier-Abhängigkeiten (Detail)

### 1. Supabase Free — 🟡 mittelfristig beobachten

| Limit (Free) | KiezQuiz heute | Wann wird's eng? |
|---|---|---|
| DB **500 MB** | Spielstände, Profile, Stadt-Wünsche — noch klein | Viele Nutzer + lange Historie |
| **50.000 MAU** | Frühphase, weit unter Limit | Viraler Wachstumsschub |
| **5 GB Egress** | Statische Assets über GitHub Pages, nicht Supabase | Wenn große Dateien über Supabase Storage |
| **500.000 Edge-Invocations/Monat** | NB-Mail, Terms-Notify | Massen-E-Mail an alle User (NB-Änderung!) |
| **1 GB Storage** | Minimal genutzt | Viele Uploads/User-Files |
| **Kein Auto-Backup** | Eigene Lösung: `pg_dump` + GitHub Actions | — (gelöst) |
| **Projekt-Pause** | Bei langer Inaktivität | Regelmäßiger Traffic oder Ping |

**Kosten ab Free:** Supabase Pro ab **~25 USD/Monat** (Stand Anbieter — vor Upgrade Kalle + dein OK).

**Früheste realistische Kosten:** NB-Massenmail (>3.000 Empfänger → Resend zuerst!) oder DB >500 MB.

---

### 2. Resend Free — 🟡 bei Nutzer-Wachstum

| Limit (Free) | KiezQuiz heute | Wann wird's eng? |
|---|---|---|
| **3.000 E-Mails/Monat** | Wenige Transaktionsmails | NB-Änderung: E-Mail an **alle** registrierten User |
| **100 E-Mails/Tag** | OK | Großer Versand an einem Tag |
| **1 Domain** | kiezquiz.de verified | — |

**Kosten ab Free:** Paid ab **~20 USD/Monat** (10k Mails).

**Aktion:** Vor `--send` bei NB-Änderung: Nutzerzahl in Supabase Auth prüfen vs. 3.000.

---

### 3. GitHub Free (public) — 🟢 stabil

| Limit | KiezQuiz | Anmerkung |
|---|---|---|
| Actions-Minuten | **Unbegrenzt** für public Repos | Backup-Workflow OK |
| Pages | Kostenlos | kiezquiz.de via Pages |
| Secrets | Ausreichend | Backup-URL, Resend etc. |

**Kosten:** 0 solange Repos public bleiben.

---

### 4. Cloudflare Free — 🟢 stabil

| Limit | KiezQuiz | Anmerkung |
|---|---|---|
| DNS | kiezquiz.lauer.team | Redirect zu .de |
| Workers (Free) | 100k Requests/Tag | Nicht im kritischen Pfad |

**Hauptdomain** kiezquiz.de liegt bei **United Domains**, nicht Cloudflare.

---

### 5. Cursor — einzige laufende Software-Kosten

| Zeitraum | Plan | Kosten |
|---|---|---|
| bis **Juni 2026** | Pro+ (USD 60) | ~55 €/Monat |
| ab **Juli 2026** | Pro (USD 20) | ~18 €/Monat |

Details: `leitstand.md (COSTS)`

---

## Nicht-kritisch / Ad-hoc (Free Tier reicht)

| Dienst | Nutzung | Kosten-Risiko |
|---|---|---|
| Google Gemini / Antigravity | Design, Recherche | Free-Limits beachten |
| Canva, QR Code Monkey | Einmalig/ selten | 🟢 |
| Apple Developer | Nur wenn App Store | 99 USD/Jahr — **noch nicht** |
| Flyeralarm | Physische QR-Sticker | Einmalkauf |

---

## Upgrade-Gates (immer dein OK)

- Supabase Pro
- Resend Paid
- Cloudflare Paid
- GitHub Team (falls private Repos)
- Apple Developer Program
- Domain-Umzug / Premium-DNS

Kalle warnt bei **>70 %** eines Free-Tier-Limits im Leitstand.

---

## Nächste Pflege

- **Monatlich:** Quotas in Supabase + Resend Dashboard (Finance-Bericht)
- **Quartalsweise:** Limits in dieser Datei gegen Anbieter-Docs prüfen
- **Bei Feature:** Neuer Drittanbieter → Eintrag hier + Legal-Trigger (`anweisungen.md (Trigger)`)

---

## COSTS (migriert)

# Monatliche Kosten — KiezQuiz

> **Pflege:** Finance-Abteilung / Kalle · Stand: **2026-06-15**

---

## Aktuell (keine Monetarisierung)

| Posten | Jun 2026 | ab Jul 2026 | Notiz |
|---|---:|---:|---|
| **Cursor** | ~60 USD (~55 €) | ~20 USD (~18 €) | Downgrade Pro+ → Pro |
| **GitHub** | 0 € | 0 € | Public Repos |
| **Supabase** | 0 € | 0 € | Free Tier |
| **Cloudflare** | 0 € | 0 € | Free Tier |
| **Resend** | 0 € | 0 € | Free Tier |
| **GSC / Pages / Notion** | 0 € | 0 € | Free |
| **Domain kiezquiz.de** | ~1 €/Monat | ~1 €/Monat | United Domains · **läuft bis 30.05.2027** |
| **Legora** | (dein Plan) | — | Recht — nicht in Cursor |
| **Summe (ohne Legora/Domain)** | **~55 €** | **~18 €** | nur Cursor |

**Domain kiezquiz.de:** Registrierung 31.05.2026–30.05.2027 (United Domains). Erinnerung ab 01.04.2027 → `ops/agents/ceo-kalle/todos.md` D1.

---

## Umsatz

| | |
|---|---|
| **Monetarisierung** | Noch keine |
| **Ziel** | Später — dann eigene Zeile hier |

---

## Geplante Änderungen

| Datum | Was | Auswirkung |
|---|---|---|
| **2026-07-01** (ca.) | Cursor Downgrade Pro+ → Pro | −40 USD/Monat |
| — | Supabase Pro | Nur bei Quota-Engpass + dein OK |
| — | Resend Paid | Nur bei >3.000 Mails/Monat oder NB an alle User |

---

## Historie (Kurz)

| Monat | Cursor | Sonstiges | Summe |
|---|---:|---:|---:|
| 2026-06 | ~60 USD | 0 € | ~55 € |

*(Ab Juli 2026 monatlich in Finance-Bericht ergänzen)*

---

## Für Buchhaltung (Vorbereitung)

- **Kategorie Dev-Tools:** Cursor (Beleg: Cursor-Rechnung)
- **Kategorie Infrastruktur:** Domain (United Domains, jährlich)
- **Kategorie 0 € mit Beobachtung:** Supabase, GitHub, Resend, Cloudflare

→ Keine Buchungen durch Kalle. Bei Steuerfragen: Steuerberater.
