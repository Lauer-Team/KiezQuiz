# Google Search Console API — Vollautomatik (0 €)

> **Standard für KiezQuiz:** GSC-KPIs **täglich** (7d), Vollbericht **montags** (28d).  
> Alter & Refresh: `KiezQuiz-Ops/CMO-Marie/gsc-metriken.md`  
> Fallback ohne API: [`GSC-MANUAL-CHECK.md`](GSC-MANUAL-CHECK.md)

---

## Kostet das was?

| Frage | Antwort |
|---|---|
| **Google Cloud Kosten?** | **Nein** — Search Console API ist im Free Tier (normale Quoten reichen für KiezQuiz). |
| **GSC selbst?** | **Nein** — kostenlos. |
| **Was kostet Zeit?** | **Einmalig ~15 Min** OAuth-Setup; danach läuft alles über `weekly-all` auf dem VPS. |

Google verlangt trotzdem ein **Cloud-Projekt + OAuth** — das ist Bürokratie, kein Abo.

---

## Was wird automatisiert?

| Routine | Wann | Inhalt |
|---------|------|--------|
| **seo-daily** | täglich 06:00 UTC (`kq-ops-seo-daily`) | Technik-Checks + GSC **7 Tage** (1 API-Call) |
| **weekly-all** | montags 07:00 UTC | Technik + GSC **28 Tage**, Top-Seiten, Sitemaps, Vorperiode |

Montags mit `kq-ops-routine.sh weekly-all`:

1. **Technisch:** sitemap.xml, robots.txt, Stadtseiten (HTTP-Checks)
2. **GSC API:** Klicks, Impressionen (28 Tage + Vergleich Vorperiode), Top-Seiten, Sitemap-Status in GSC
3. **Bericht:** `KiezQuiz-Ops/CMO-Marie/reports/YYYY-MM-DD-seo-weekly.md`

Skripte (im Repo **KiezQuiz-Ops**):

- `scripts/ops/seo_check.py` — Haupt-Routine
- `scripts/gsc_weekly_brief.py` — GSC-Abruf (auch einzeln testbar)

---

## Einrichtung (einmalig)

### Voraussetzungen

- GSC-Property **kiezquiz.de** verifiziert ✅
- Google-Konto mit Property-Zugriff
- Python 3.10+ (lokal + VPS)

### Schritt 1 — Google Cloud Projekt

1. [Google Cloud Console](https://console.cloud.google.com/) → Projekt „KiezQuiz SEO" (neu oder bestehend)
2. **APIs & Dienste** → **Bibliothek** → **Google Search Console API** → **Aktivieren**

### Schritt 2 — OAuth-Zustimmungsbildschirm

1. **OAuth-Zustimmungsbildschirm** → Typ **Extern**
2. App-Name: `KiezQuiz SEO Briefing`
3. Deine E-Mail als Entwickler + Testnutzer

### Schritt 3 — OAuth-Client (Desktop)

1. **Anmeldedaten** → **OAuth-Client-ID** → **Desktop-App**
2. JSON speichern als `KiezQuiz-Ops/scripts/gsc-oauth-client.json` (gitignored)

### Schritt 4 — Token (lokal, einmalig)

```bash
cd ~/projects/KiezQuiz-Ops
pip3 install google-auth-oauthlib google-api-python-client
python3 scripts/gsc_weekly_brief.py --auth
```

Browser öffnet sich → Google-Konto wählen → Token landet in `scripts/gsc-token.json`.

### Schritt 5 — Token auf VPS

**Option A (empfohlen):** Inhalt von `gsc-token.json` als eine Zeile in `Server/.env`:

```bash
GSC_TOKEN_JSON='{"token":"...","refresh_token":"...",...}'
```

**Option B:** Datei auf VPS kopieren:

```bash
scp scripts/gsc-token.json vps:~/projects/KiezQuiz-Ops/scripts/
```

`gsc-oauth-client.json` wird auf dem VPS **nicht** gebraucht, wenn `GSC_TOKEN_JSON` gesetzt ist (Refresh-Token reicht).

### Schritt 6 — Test

```bash
# Lokal
python3 scripts/gsc_weekly_brief.py --days 28

# VPS (nach .env)
~/projects/Server/scripts/kq-ops-routine.sh seo
```

Im Bericht muss `## GSC (API)` mit Klicks/Impressionen stehen — nicht „nicht konfiguriert".

---

## Property-URL

Standard: `sc-domain:kiezquiz.de`  
URL-Prefix-Property: `--site-url https://kiezquiz.de/`

---

## Referenzen

- Übersicht: [`GSC-MANUAL-CHECK.md`](GSC-MANUAL-CHECK.md)
- Skript: `KiezQuiz-Ops/scripts/gsc_weekly_brief.py`
- VPS-Routine: `Server/scripts/kq-ops-routine.sh weekly-all`
- [Search Console API](https://developers.google.com/webmaster-tools/v1/api_reference_index)
