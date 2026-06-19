# GSC — Google Search Console (automatisch)

> **Standard:** GSC-Daten kommen **automatisch** per API in den wöchentlichen SEO-Bericht (Marie / `seo_check.py`).  
> **Kosten:** 0 € (Google Search Console API, Free Tier).  
> **Einmalig:** OAuth einrichten → [`GSC-API-SETUP.md`](GSC-API-SETUP.md)

**Property:** [search.google.com/search-console](https://search.google.com/search-console) → **kiezquiz.de**

---

## Was läuft automatisch?

| Was | Wie oft | Skript |
|---|---|---|
| Sitemap, robots, Stadtseiten live | **Täglich** 06:00 UTC + montags Vollbericht | `seo_daily.py` / `seo_check.py` |
| GSC KPI (7 Tage) | **Täglich** 06:00 UTC | `seo_daily.py` |
| GSC Vollbericht (28 Tage, Top-Seiten) | **Montags** (weekly-all) | `seo_check.py` |
| Berichte | täglich / montags | `CMO-Marie/reports/*-seo-daily.md` · `*-seo-weekly.md` |

**Alter & Refresh-Zyklen:** `KiezQuiz-Ops/CMO-Marie/gsc-metriken.md`

Du musst **nicht** in die GSC-Website — außer bei Auffälligkeiten im Bericht.

---

## Einmalige Einrichtung (du, ~15 Min)

1. Google Cloud Projekt + Search Console API aktivieren  
2. OAuth Desktop-Client → `KiezQuiz-Ops/scripts/gsc-oauth-client.json`  
3. Lokal: `python3 scripts/gsc_weekly_brief.py --auth`  
4. Token auf VPS: `GSC_TOKEN_JSON` in `Server/.env` **oder** `gsc-token.json` auf dem VPS  

Details Schritt für Schritt: [`GSC-API-SETUP.md`](GSC-API-SETUP.md)

---

## Fallback (nur wenn API ausfällt)

Wenn der Bericht „GSC nicht konfiguriert“ zeigt:

1. Token prüfen (`GSC_TOKEN_JSON` oder `scripts/gsc-token.json` auf VPS)
2. Notfalls kurz in GSC-Web-Oberfläche nachsehen (Checkliste unten)

### Manuelle Stichprobe

| Prüfen | Aktion |
|---|---|
| „Nicht indexiert" mit neuen Fehlern? | URL inspizieren |
| Wichtige URLs indexiert? | ggf. Indexierung beantragen |
| `site:kiezquiz.de hamburg` in Google | Stadtseite sichtbar? |

---

## Referenzen

- API-Setup: [`GSC-API-SETUP.md`](GSC-API-SETUP.md)
- Technisches SEO: `node scripts/test_seo_compat.js`
- Automation: `KiezQuiz-Ops` → `weekly-all` via n8n
- Ersteinrichtung GSC: `docs/SEO-SETUP.md`
