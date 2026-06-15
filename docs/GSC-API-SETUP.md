# Google Search Console API — optional (nur für Vollautomatik)

> **Nicht essentiell.** KiezQuiz nutzt standardmäßig den **manuellen GSC-Check** → [`GSC-MANUAL-CHECK.md`](GSC-MANUAL-CHECK.md)  
> Dieses Dokument nur, wenn du irgendwann **Klicks/Impressionen automatisch** in Wochenberichte willst.

---

## Brauche ich Google Cloud?

| Frage | Antwort |
|---|---|
| **Muss ich Google Cloud nutzen?** | **Nein** — für normalen Betrieb reicht die GSC-Website + unsere SEO-Automation (technisches SEO). |
| **Kostet Google Cloud Geld?** | Für diesen API-Zugriff in der Regel **0 €** (Free Tier, normale GSC-Quoten). |
| **Warum existiert Google Cloud trotzdem?** | Google verlangt ein **Cloud-Projekt + OAuth**, um die Search-Console-**API** freizuschalten — das ist Bürokratie, kein Produktkauf. |
| **Empfehlung für KiezQuiz (kein Umsatz)** | **Manueller Check** — kein Cloud-Setup. |

**Kurz:** Google Cloud ist **nicht** dasselbe wie „bezahlen". Trotzdem: **Setup-Aufwand** — deshalb bewusst **nicht** der Standardweg.

---

## Wann lohnt sich die API?

- Viele Städte / stark steigender Traffic
- Du willst **null** manuelle GSC-Zeit
- Monetarisierung / SEO wird wichtiger

Bis dahin: `docs/GSC-MANUAL-CHECK.md` (≈ 5 Min/Woche oder 1×/Monat).

---

## Einrichtung (falls du es doch willst)

### Voraussetzungen

- GSC-Property **kiezquiz.de** verifiziert ✅
- Google-Konto mit Property-Zugriff
- Python 3.10+

### Schritt 1 — Google Cloud Projekt

1. [Google Cloud Console](https://console.cloud.google.com/) → Projekt „KiezQuiz SEO" (neu oder bestehend)
2. **APIs & Dienste** → **Bibliothek** → **Google Search Console API** → **Aktivieren**

### Schritt 2 — OAuth-Zustimmungsbildschirm

1. **OAuth-Zustimmungsbildschirm** → Typ **Extern**
2. App-Name: `KiezQuiz SEO Briefing`
3. Deine E-Mail als Entwickler + Testnutzer

### Schritt 3 — OAuth-Client (Desktop)

1. **Anmeldedaten** → **OAuth-Client-ID** → **Desktop-App**
2. JSON → `scripts/gsc-oauth-client.json` (gitignored)

### Schritt 4 — Token (einmalig)

```bash
pip3 install google-auth-oauthlib google-api-python-client
python3 scripts/gsc_weekly_brief.py --auth
```

### Schritt 5 — Bericht

```bash
python3 scripts/gsc_weekly_brief.py --days 28
```

---

## Property-URL

Standard: `sc-domain:kiezquiz.de`  
URL-Prefix-Property: `--site-url https://kiezquiz.de/`

---

## Referenzen

- Manuell (Standard): [`GSC-MANUAL-CHECK.md`](GSC-MANUAL-CHECK.md)
- Skript: `scripts/gsc_weekly_brief.py`
- [Search Console API](https://developers.google.com/webmaster-tools/v1/api_reference_index)
