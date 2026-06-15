# Service-Inventar — KiezQuiz

> **Pflege:** Finance-Abteilung / Kalle · Stand: **2026-06-15**  
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
| **United Domains** | Domain .de | ~1–2* | kiezquiz.de | 🟡 |
| **Telegram** | Free | 0 | ⏸️ pausiert | 🟢 |

\* Domain meist **jährlich** (~12–15 €/Jahr ≈ ~1 €/Monat). Bitte Verlängerungsdatum in United Domains prüfen.

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

Details: `ops/finance/COSTS.md`

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
- **Bei Feature:** Neuer Drittanbieter → Eintrag hier + Legal-Trigger (`ops/legal/TRIGGERS.md`)
