# Google Search Console API — Einrichtung

> **Zweck:** SEO-Wochenberichte mit echten GSC-Daten (Klicks, Impressionen, Coverage) — statt nur manueller Checks.  
> **Bis OAuth steht:** SEO-Automation nutzt `curl` + `test_seo_compat.js` (siehe `ops/AUTOMATIONS.md` §3).

---

## Voraussetzungen

- GSC-Property **kiezquiz.de** ist bereits verifiziert ✅
- Google-Konto mit Zugriff auf diese Property
- Python 3.10+ lokal (oder in Cursor Automation)

---

## Schritt 1 — Google Cloud Projekt

1. [Google Cloud Console](https://console.cloud.google.com/) → Projekt wählen oder **Neues Projekt** (z. B. „KiezQuiz SEO").
2. **APIs & Dienste** → **Bibliothek** → **Google Search Console API** → **Aktivieren**.

---

## Schritt 2 — OAuth-Zustimmungsbildschirm

1. **APIs & Dienste** → **OAuth-Zustimmungsbildschirm**
2. Typ: **Extern** (oder Intern, falls Workspace)
3. App-Name: `KiezQuiz SEO Briefing`
4. Deine E-Mail als Entwickler + Testnutzer eintragen

---

## Schritt 3 — OAuth-Client (Desktop)

1. **Anmeldedaten** → **Anmeldedaten erstellen** → **OAuth-Client-ID**
2. Typ: **Desktop-App**
3. JSON herunterladen → lokal speichern als:

   `scripts/gsc-oauth-client.json`  
   (steht in `.gitignore` — **nie committen**)

---

## Schritt 4 — Token erzeugen (einmalig)

```bash
pip3 install google-auth-oauthlib google-api-python-client
python3 scripts/gsc_weekly_brief.py --auth
```

Browser öffnet sich → Google-Konto wählen → Zugriff erlauben.  
Erzeugt `scripts/gsc-token.json` (ebenfalls gitignored).

---

## Schritt 5 — Bericht testen

```bash
python3 scripts/gsc_weekly_brief.py --days 28
```

Ausgabe: Markdown auf stdout — kann in `ops/reports/YYYY-MM-DD-seo-weekly.md` umgeleitet werden.

---

## Optional — GitHub Secret (für Automation)

Für Cursor Automation ohne interaktiven Browser:

1. Token-JSON-Inhalt als Secret `GSC_TOKEN_JSON` in GitHub (oder Cursor Automation Secrets)
2. Skript mit `--token-env GSC_TOKEN_JSON` (siehe `--help`)

**Refresh:** OAuth-Refresh-Token läuft selten ab; bei Fehler `--auth` wiederholen.

---

## Property-URL

Das Skript nutzt standardmäßig `sc-domain:kiezquiz.de` (Domain-Property).  
Bei URL-Prefix-Property stattdessen `https://kiezquiz.de/` in `--site-url` setzen.

---

## Referenzen

- [Search Console API](https://developers.google.com/webmaster-tools/v1/api_reference_index)
- SEO-Automation: `ops/AUTOMATIONS.md` §3
- Roadmap: `ops/ROADMAP.md` R4
