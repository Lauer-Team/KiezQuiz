# GSC — manueller Wochen-Check (Standard für KiezQuiz)

> **Empfehlung:** So bleibst du ohne Google Cloud, ohne OAuth und ohne Extra-Kosten auf dem Laufenden.  
> Die **SEO Weekly**-Automation prüft parallel das **technische** SEO im Code (Sitemap, robots, Live-URLs).

**Property:** [search.google.com/search-console](https://search.google.com/search-console) → **kiezquiz.de**

---

## Wann?

- **Ca. 5 Minuten**, z. B. montags nach dem SEO-Automation-Bericht in `ops/reports/`
- Oder nur **1× pro Monat**, wenn wenig Zeit — reicht für KiezQuiz-Größe meist

---

## Checkliste (der Reihe nach)

### 1. Übersicht (Performance)

Links: **Leistung** → letzte **28 Tage**

| Frage | Notiz |
|---|---|
| Klicks/Impressionen vs. Vorwoche plausibel? | |
| Auffälliger Einbruch oder Spike? | |

→ Kurz in `ops/reports/YYYY-MM-DD-seo-manual.md` (optional, 3 Zeilen reichen)

### 2. Indexierung

**Seiten** → **Indexierung**

| Prüfen | Aktion |
|---|---|
| „Nicht indexiert" mit neuen Fehlern? | URL inspizieren |
| Wichtige URLs (`/`, `/hamburg/`, …) indexiert? | ggf. **URL prüfen** → Indexierung beantragen |

### 3. Coverage / Crawling (falls sichtbar)

- Keine neuen **5xx** oder **404** auf kiezquiz.de?
- Sitemap-Fehler? → sollte leer sein (Automation prüft `sitemap.xml` auch technisch)

### 4. Manuell suchen (Stichprobe)

Google: `site:kiezquiz.de hamburg` — erscheint die Stadtseite?

---

## Was du **nicht** brauchst

| Thema | Warum nicht nötig |
|---|---|
| **Google Cloud Projekt** | Nur für die **API** (Automatisierung der Zahlen) — GSC-Web-Oberfläche reicht |
| **Google Cloud Kosten** | API wäre i. d. R. kostenlos — aber Setup-Aufwand; bewusst **nicht** Standard |
| **Skript `gsc_weekly_brief.py`** | Optional später; siehe [`GSC-API-SETUP.md`](GSC-API-SETUP.md) |

---

## Vorlage Mini-Bericht

```markdown
# SEO manuell — YYYY-MM-DD
- Performance 28d: X Klicks, Y Impressionen (≈ wie letzte Woche / …)
- Indexierung: grün / [Problem]
- Aktion: keine / [URL nachindexieren]
```

Speichern unter `ops/reports/` — Kalle kann den Leitstand dazu aktualisieren.

---

## Referenzen

- Technisches SEO: `node scripts/test_seo_compat.js`
- Automation-Prompt: `ops/AUTOMATIONS.md` §3
- Ersteinrichtung GSC: `docs/SEO-SETUP.md`
